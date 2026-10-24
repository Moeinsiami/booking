from datetime import date, datetime, time, timedelta
from decimal import Decimal
import uuid

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from .models import Appointment, Barber, Service, Shift
from .selectors import get_available_slots


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
        self.target_date = date(2026, 11, 1)

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

