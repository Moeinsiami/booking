import uuid
from datetime import timedelta
from decimal import Decimal

from django.contrib import admin
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from .models import Appointment, Barber, Service, Shift


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
