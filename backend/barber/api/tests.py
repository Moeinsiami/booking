from datetime import datetime, time, timedelta
from decimal import Decimal
from unittest.mock import patch
import uuid

from django.contrib import admin
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError

from . import zarinpal
from .models import Appointment, Barber, Service, Shift
from .selectors import get_available_slots
from .services import normalize_phone


class CoreModelsAndAdminTests(TestCase):
    def test_models_and_admin_registration(self):
        for model in (Service, Barber, Shift, Appointment):
            self.assertIn(model, admin.site._registry)

        svc = Service.objects.create(name="Haircut", duration_minutes=30, price=Decimal("25.00"))
        barber = Barber.objects.create(name="Ali", bio="Master barber")
        barber.services.add(svc)

        now = timezone.now()
        bad_shift = Shift(barber=barber, start_datetime=now, end_datetime=now - timedelta(hours=1))
        with self.assertRaises(ValidationError):
            bad_shift.full_clean()

        appt = Appointment.objects.create(
            barber=barber,
            customer_name="Reza",
            customer_phone="+989110000000",
            customer_email="reza@example.com",
            start_datetime=now,
            end_datetime=now + timedelta(minutes=30),
            total_price=Decimal("25.00"),
            deposit_amount=Decimal("12.50"),
        )
        appt.services.add(svc)
        self.assertIsInstance(appt.id, uuid.UUID)
        self.assertEqual(appt.status, Appointment.Status.PENDING_PAYMENT)


class AvailabilityEngineTests(TestCase):
    def setUp(self):
        self.barber = Barber.objects.create(name="Saeed")
        self.svc_30 = Service.objects.create(name="Haircut", duration_minutes=30, price=Decimal("30.00"))
        self.svc_15 = Service.objects.create(name="Beard Trim", duration_minutes=15, price=Decimal("15.00"))
        self.svc_45 = Service.objects.create(name="Full Package", duration_minutes=45, price=Decimal("40.00"))
        self.target_date = timezone.localdate() + timedelta(days=7)

    def _dt(self, hour: int, minute: int = 0) -> datetime:
        return timezone.make_aware(datetime.combine(self.target_date, time(hour, minute)))

    def _book(self, start_h: int, start_m: int, end_h: int, end_m: int, status: str, expires_at=None):
        return Appointment.objects.create(
            barber=self.barber,
            customer_name="Test User",
            customer_phone="09120000000",
            customer_email="test@example.com",
            start_datetime=self._dt(start_h, start_m),
            end_datetime=self._dt(end_h, end_m),
            total_price=Decimal("40.00"),
            deposit_amount=Decimal("20.00"),
            status=status,
            expires_at=expires_at,
        )

    def test_45_min_booking_at_very_end_of_shift(self):
        Shift.objects.create(
            barber=self.barber,
            start_datetime=self._dt(9, 0),
            end_datetime=self._dt(10, 30),
        )
        slots = get_available_slots(self.barber.id, self.target_date, [self.svc_45.id])
        # 09:45 + 45m = 10:30 (fits exactly); 10:00 + 45m = 10:45 (exceeds shift end)
        self.assertEqual(slots, ["09:00", "09:15", "09:30", "09:45"])

    def test_multi_service_duration_and_back_to_back_overlap(self):
        Shift.objects.create(
            barber=self.barber,
            start_datetime=self._dt(9, 0),
            end_datetime=self._dt(12, 0),
        )
        # Confirmed appointment from 10:00 to 10:45
        self._book(10, 0, 10, 45, Appointment.Status.CONFIRMED)

        # Combined duration = 30 + 15 = 45 mins
        slots = get_available_slots(
            self.barber.id,
            self.target_date.isoformat(),
            [self.svc_30.id, self.svc_15.id],
        )
        # Before 10:00: 09:00 (ends 09:45) and 09:15 (ends 10:00) fit; 09:30 & 09:45 overlap 10:00-10:45.
        # After 10:45: 10:45 (ends 11:30), 11:00 (ends 11:45), 11:15 (ends 12:00) fit.
        self.assertEqual(slots, ["09:00", "09:15", "10:45", "11:00", "11:15"])

    def test_pending_payment_hold_expiry_and_cancelled_ignored(self):
        Shift.objects.create(
            barber=self.barber,
            start_datetime=self._dt(9, 0),
            end_datetime=self._dt(10, 0),
        )
        now = timezone.now()
        # Active hold blocks 09:00 - 09:30
        self._book(9, 0, 9, 30, Appointment.Status.PENDING_PAYMENT, expires_at=now + timedelta(minutes=5))
        # Expired hold on 09:30 - 10:00 does NOT block
        self._book(9, 30, 10, 0, Appointment.Status.PENDING_PAYMENT, expires_at=now - timedelta(minutes=1))
        # Cancelled and Expired status on 09:30 - 10:00 do NOT block
        self._book(9, 30, 10, 0, Appointment.Status.CANCELLED)
        self._book(9, 30, 10, 0, Appointment.Status.EXPIRED)

        slots = get_available_slots(self.barber.id, self.target_date, [self.svc_30.id])
        self.assertEqual(slots, ["09:30"])

    def test_edge_cases_empty_or_invalid_inputs_and_shift_shorter_than_service(self):
        Shift.objects.create(
            barber=self.barber,
            start_datetime=self._dt(9, 0),
            end_datetime=self._dt(9, 30),
        )
        # Shift is 30m, service is 45m -> no slots fit
        self.assertEqual(get_available_slots(self.barber.id, self.target_date, [self.svc_45.id]), [])
        # Empty service_ids -> []
        self.assertEqual(get_available_slots(self.barber.id, self.target_date, []), [])
        # Non-existent service ID -> []
        self.assertEqual(get_available_slots(self.barber.id, self.target_date, [self.svc_30.id, 99999]), [])



class ApiFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.day = timezone.localdate() + timedelta(days=6)
        self.haircut = Service.objects.create(name="Haircut", duration_minutes=30, price=Decimal("500000"))
        self.beard = Service.objects.create(name="Beard", duration_minutes=15, price=Decimal("250001"))
        Service.objects.create(name="Hidden", duration_minutes=10, price=Decimal("1"), is_active=False)
        self.barber = Barber.objects.create(name="Saeed")
        self.barber.services.add(self.haircut, self.beard)
        Shift.objects.create(barber=self.barber, start_datetime=self._dt(9), end_datetime=self._dt(10))

    def _dt(self, hour, minute=0):
        return timezone.make_aware(datetime.combine(self.day, time(hour, minute)))

    def _appt(self, phone="09121234567", status=Appointment.Status.CONFIRMED, start=9, end=10, **extra):
        return Appointment.objects.create(
            barber=self.barber, customer_name="Reza", customer_phone=phone,
            start_datetime=self._dt(start), end_datetime=self._dt(end),
            total_price=Decimal("500000"), deposit_amount=Decimal("250000"), status=status, **extra,
        )

    def _checkout(self, at="09:00", authority="A0001"):
        payload = {
            "service_ids": [self.haircut.id], "date": str(self.day), "time": at,
            "customer_name": "Reza", "customer_phone": "+98 912 123 4567",
        }
        with patch.object(zarinpal, "request_payment", return_value=authority):
            return self.client.post("/api/v1/appointments/checkout/", payload, content_type="application/json")

    def _verify(self, authority="A0001", status="OK"):
        return self.client.post(
            "/api/v1/payments/zarinpal/verify/", {"authority": authority, "status": status}, content_type="application/json"
        )

    def test_services_lists_only_active_in_rials(self):
        data = self.client.get("/api/v1/services/").json()
        self.assertEqual([s["price"] for s in data], [500000, 250001])

    def test_slots_quote_and_open_slots(self):
        r = self.client.get(
            f"/api/v1/availability/slots/?service_ids={self.haircut.id}&service_ids={self.beard.id}&date={self.day}"
        ).json()
        self.assertEqual(r["duration_minutes"], 45)
        self.assertEqual(r["total_price"], 750001)
        self.assertEqual(r["deposit_amount"], 375001)  # 375000.5 rounds half up
        self.assertEqual(r["slots"], ["09:00", "09:15"])
        bad = self.client.get(f"/api/v1/availability/slots/?service_ids=9999&date={self.day}")
        self.assertEqual(bad.status_code, 400)

    def test_month_open_full_closed(self):
        url = f"/api/v1/availability/month/?service_ids={self.haircut.id}&month={self.day:%Y-%m}"
        status_of = lambda: {d["date"]: d["status"] for d in self.client.get(url).json()["days"]}
        other = self.day + timedelta(days=1) if (self.day + timedelta(days=1)).month == self.day.month else self.day - timedelta(days=1)
        self.assertEqual(status_of()[str(self.day)], "open")
        self.assertEqual(status_of()[str(other)], "closed")
        self._appt()
        self.assertEqual(status_of()[str(self.day)], "full")

    def test_checkout_holds_slot_then_conflicts_and_gateway_failure_releases(self):
        r = self._checkout()
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()["payment_url"].endswith("/StartPay/A0001"))
        self.assertEqual(r.json()["deposit_amount"], 250000)
        appt = Appointment.objects.get()
        self.assertEqual((appt.status, appt.customer_phone), ("PENDING_PAYMENT", "09121234567"))
        self.assertEqual(self._checkout().status_code, 409)

        with patch.object(zarinpal, "request_payment", side_effect=zarinpal.ZarinpalError("down")):
            payload = {
                "service_ids": [self.haircut.id], "date": str(self.day), "time": "09:30",
                "customer_name": "Reza", "customer_phone": "09121234567",
            }
            r = self.client.post("/api/v1/appointments/checkout/", payload, content_type="application/json")
        self.assertEqual(r.status_code, 502)
        self.assertEqual(Appointment.objects.get(start_datetime=self._dt(9, 30)).status, "CANCELLED")
        self.assertEqual(self._checkout(at="09:30", authority="A0002").status_code, 201)

    def test_verify_confirms_schedules_reminder_and_is_idempotent(self):
        self._checkout()
        with patch.object(zarinpal, "verify_payment", return_value="777") as verify, patch("api.services.send_reminder") as task:
            r = self._verify()
            self.assertEqual((r.status_code, r.json()["status"]), (200, "CONFIRMED"))
            verify.assert_called_once_with(authority="A0001", amount_rials=250000)
            self.assertEqual(task.apply_async.call_count, 1)
            self.assertEqual(self._verify().status_code, 200)
            self.assertEqual(verify.call_count, 1)
        self.assertEqual(Appointment.objects.get().payment_ref_id, "777")

    def test_verify_cancelled_at_gateway_releases_slot(self):
        self._checkout()
        self.assertEqual(self._verify(status="NOK").status_code, 402)
        self.assertEqual(Appointment.objects.get().status, "CANCELLED")
        self.assertEqual(self._verify(authority="nope").status_code, 404)

    def test_verify_late_payment_rejected_if_slot_was_taken(self):
        self._checkout()
        Appointment.objects.update(expires_at=timezone.now() - timedelta(minutes=1))
        self._appt(phone="09120000000")
        with patch.object(zarinpal, "verify_payment") as verify:
            self.assertEqual(self._verify().status_code, 409)
            verify.assert_not_called()

    def test_otp_login_and_guest_dashboard(self):
        with patch("api.services.send_sms") as sms:
            self.assertEqual(self.client.post("/api/v1/auth/otp/request/", {"phone": "0912 123 4567"}).status_code, 204)
            code = sms.call_args[0][1].split()[-1]
            self.assertEqual(self.client.post("/api/v1/auth/otp/request/", {"phone": "09121234567"}).status_code, 429)
        self.assertEqual(len(code), 5)
        wrong = "00000" if code != "00000" else "11111"
        self.assertEqual(self.client.post("/api/v1/auth/otp/verify/", {"phone": "09121234567", "code": wrong}).status_code, 400)
        r = self.client.post("/api/v1/auth/otp/verify/", {"phone": "09121234567", "code": code})
        self.assertEqual(r.status_code, 200)
        auth = {"HTTP_AUTHORIZATION": f"Bearer {r.json()['access']}"}

        mine = self._appt()
        theirs = self._appt(phone="09129999999", start=9, end=10)
        self._appt(status=Appointment.Status.PENDING_PAYMENT, start=10, end=11)  # unpaid hold stays hidden
        self.assertEqual(self.client.get("/api/v1/me/appointments/").status_code, 401)
        listed = self.client.get("/api/v1/me/appointments/", **auth).json()
        self.assertEqual([a["id"] for a in listed], [str(mine.id)])
        self.assertTrue(listed[0]["can_cancel"])

        self.assertEqual(self.client.post(f"/api/v1/me/appointments/{theirs.id}/cancel/", **auth).status_code, 404)
        self.assertEqual(self.client.post(f"/api/v1/me/appointments/{mine.id}/cancel/", **auth).json()["status"], "CANCELLED")
        self.assertEqual(self.client.post(f"/api/v1/me/appointments/{mine.id}/cancel/", **auth).status_code, 409)

    def test_normalize_phone(self):
        for raw in ("09121234567", "+989121234567", "00989121234567", "9121234567", "۰۹۱۲۱۲۳۴۵۶۷"):
            self.assertEqual(normalize_phone(raw), "09121234567")
        with self.assertRaises(DRFValidationError):
            normalize_phone("02112345678")
