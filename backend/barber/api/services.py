import logging
import re
import secrets
from datetime import date as date_type, datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Iterable

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import constant_time_compare
from rest_framework import status
from rest_framework.exceptions import APIException, NotFound, Throttled, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken

from . import zarinpal
from .models import Appointment, Barber
from .selectors import get_active_appointments, get_active_services, get_available_slots, get_barbers_for_services
from .sms import send_sms
from .tasks import send_reminder

logger = logging.getLogger(__name__)

HOLD_MINUTES = 10
OTP_TTL = 120
OTP_COOLDOWN = 60
OTP_MAX_ATTEMPTS = 5
REMINDER_LEAD = timedelta(hours=1)


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Conflict."


class PaymentRequired(APIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = "Payment was not completed."


class BadGateway(APIException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = "Payment gateway error. Please try again."


# ---------- phone / OTP / JWT ----------

_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")
_PHONE_RE = re.compile(r"^(?:\+98|0098|98|0)?(9\d{9})$")


def normalize_phone(raw: str) -> str:
    """Any common Iranian mobile format -> 09xxxxxxxxx, so bookings and JWT identity compare equal."""
    match = _PHONE_RE.match(raw.translate(_DIGITS).replace(" ", "").replace("-", ""))
    if not match:
        raise ValidationError("Enter a valid Iranian mobile number, e.g. 09121234567.")
    return "0" + match.group(1)


def request_otp(phone: str) -> None:
    # cache.add is atomic: it doubles as the per-phone resend cooldown.
    if not cache.add(f"otp:cooldown:{phone}", 1, OTP_COOLDOWN):
        raise Throttled(wait=OTP_COOLDOWN)
    code = f"{secrets.randbelow(100000):05d}"
    cache.set(f"otp:code:{phone}", code, OTP_TTL)
    cache.delete(f"otp:tries:{phone}")
    send_sms(phone, f"کد ورود شما: {code}")


def verify_otp(phone: str, code: str) -> str:
    """Returns a JWT access token for the phone's guest user."""
    code_key, tries_key = f"otp:code:{phone}", f"otp:tries:{phone}"
    stored = cache.get(code_key)
    if stored is None:
        raise ValidationError("The code has expired. Request a new one.")
    tries = cache.get(tries_key, 0)
    if tries >= OTP_MAX_ATTEMPTS:
        cache.delete(code_key)
        raise ValidationError("Too many wrong attempts. Request a new code.")
    if not constant_time_compare(stored, code):
        cache.set(tries_key, tries + 1, OTP_TTL)
        raise ValidationError("The code is incorrect.")
    cache.delete(code_key)

    # Guests have no password; a Django user keyed by phone lets simplejwt work unchanged.
    user, _ = get_user_model().objects.get_or_create(username=phone, defaults={"password": make_password(None)})
    return str(RefreshToken.for_user(user).access_token)


# ---------- quote / checkout ----------

def calc_deposit(total: Decimal) -> Decimal:
    """50% of the total, rounded to whole Rials (Zarinpal only accepts integer amounts)."""
    return (total / 2).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def get_quote(service_ids: Iterable[int]) -> dict:
    service_ids = list(service_ids)
    services = get_active_services(service_ids)
    if not services:
        raise ValidationError({"service_ids": "One or more services do not exist or are inactive."})
    total = sum((s.price for s in services), Decimal(0))
    return {
        "services": services,
        "duration_minutes": sum(s.duration_minutes for s in services),
        "total_price": total,
        "deposit_amount": calc_deposit(total),
    }


def _hold_slot(*, quote: dict, barber_id: int | None, date: date_type, start_time: time, name, phone, email) -> Appointment:
    service_ids = [s.id for s in quote["services"]]
    barbers = get_barbers_for_services(service_ids, barber_id)
    if not barbers:
        raise ValidationError({"barber": "No barber offers all the selected services."})

    label = start_time.strftime("%H:%M")
    start = timezone.make_aware(datetime.combine(date, start_time))
    for barber in barbers:
        with transaction.atomic():
            # Lock the barber row so concurrent checkouts for the same barber are serialized.
            Barber.objects.select_for_update().get(id=barber.id)
            if label not in get_available_slots(barber.id, date, service_ids):
                continue
            appt = Appointment.objects.create(
                barber=barber,
                customer_name=name,
                customer_phone=phone,
                customer_email=email,
                start_datetime=start,
                end_datetime=start + timedelta(minutes=quote["duration_minutes"]),
                total_price=quote["total_price"],
                deposit_amount=quote["deposit_amount"],
                expires_at=timezone.now() + timedelta(minutes=HOLD_MINUTES),
            )
            appt.services.set(quote["services"])
            return appt
    raise Conflict("This time slot is no longer available.")


def create_checkout(*, service_ids, barber_id, date, start_time, name, phone, email) -> tuple[Appointment, str]:
    """Holds the slot for HOLD_MINUTES and returns (appointment, Zarinpal StartPay URL)."""
    appt = _hold_slot(
        quote=get_quote(service_ids),
        barber_id=barber_id,
        date=date,
        start_time=start_time,
        name=name,
        phone=phone,
        email=email,
    )
    try:
        authority = zarinpal.request_payment(
            amount_rials=int(appt.deposit_amount),
            description="بیعانه نوبت آرایشگاه",
            callback_url=settings.ZARINPAL_CALLBACK_URL,
            mobile=phone,
            email=email,
        )
    except zarinpal.ZarinpalError as exc:
        # Release the hold right away instead of blocking the slot for 10 minutes.
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status"])
        logger.error("Zarinpal request failed for %s: %s", appt.id, exc)
        raise BadGateway() from exc
    appt.payment_authority = authority
    appt.save(update_fields=["payment_authority"])
    return appt, zarinpal.start_pay_url(authority)


# ---------- payment verification ----------

def verify_payment(authority: str, gateway_status: str) -> Appointment:
    appt = Appointment.objects.filter(payment_authority=authority).first()
    if not appt:
        raise NotFound("Unknown payment authority.")
    if appt.status == Appointment.Status.CONFIRMED:
        return appt  # idempotent: the callback page may be reloaded
    if appt.status != Appointment.Status.PENDING_PAYMENT:
        raise Conflict("This reservation is no longer active.")

    if gateway_status != "OK":
        appt.status = Appointment.Status.CANCELLED  # user abandoned the gateway: free the slot
        appt.save(update_fields=["status"])
        raise PaymentRequired()

    # shortcut: the Zarinpal call runs while the barber row is locked (10s timeout), move out if checkout traffic grows
    with transaction.atomic():
        Barber.objects.select_for_update().get(id=appt.barber_id)
        appt = Appointment.objects.select_for_update().get(pk=appt.pk)
        if appt.status == Appointment.Status.CONFIRMED:
            return appt
        # A paid-but-late customer is only confirmed if nobody took the slot meanwhile.
        # Unverified payments are refunded automatically by Zarinpal.
        if appt.expires_at <= timezone.now() and any(
            a.pk != appt.pk for a in get_active_appointments(appt.barber_id, appt.start_datetime, appt.end_datetime)
        ):
            raise Conflict("The hold expired and the slot was taken. Your payment will be refunded automatically.")
        try:
            ref_id = zarinpal.verify_payment(authority=authority, amount_rials=int(appt.deposit_amount))
        except zarinpal.ZarinpalError as exc:
            if exc.code is None:
                raise BadGateway() from exc  # transient: the client may retry
            raise PaymentRequired(str(exc)) from exc
        appt.status = Appointment.Status.CONFIRMED
        appt.payment_ref_id = ref_id
        appt.expires_at = None
        appt.save(update_fields=["status", "payment_ref_id", "expires_at"])

    _schedule_reminder(appt)
    return appt


def _schedule_reminder(appt: Appointment) -> None:
    eta = appt.start_datetime - REMINDER_LEAD
    if eta <= timezone.now():
        return
    try:
        send_reminder.apply_async(args=[str(appt.id)], eta=eta)
    except Exception:  # a broker outage must not fail an already-verified payment
        logger.exception("Could not schedule reminder for %s", appt.id)


# ---------- guest dashboard ----------

def list_guest_appointments(phone: str):
    return (
        Appointment.objects.filter(
            customer_phone=phone,
            status__in=[Appointment.Status.CONFIRMED, Appointment.Status.CANCELLED],
        )
        .select_related("barber")
        .prefetch_related("services")
    )


def cancel_appointment(phone: str, appointment_id) -> Appointment:
    with transaction.atomic():
        appt = Appointment.objects.select_for_update().filter(pk=appointment_id, customer_phone=phone).first()
        if not appt:
            raise NotFound()
        if appt.status != Appointment.Status.CONFIRMED or appt.start_datetime <= timezone.now():
            raise Conflict("Only upcoming confirmed appointments can be cancelled.")
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status"])
    return appt
