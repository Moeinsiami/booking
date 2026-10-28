from django.utils import timezone
from rest_framework import serializers

from .models import Appointment, Service
from .services import normalize_phone


class ServiceSerializer(serializers.ModelSerializer):
    price = serializers.IntegerField(help_text="Rials")

    class Meta:
        model = Service
        fields = ["id", "name", "duration_minutes", "price"]


# ---------- availability ----------

class _ServiceSelectionSerializer(serializers.Serializer):
    service_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), min_length=1, max_length=10)
    barber = serializers.IntegerField(min_value=1, required=False, help_text="Optional: restrict to one barber.")


class MonthQuerySerializer(_ServiceSelectionSerializer):
    month = serializers.RegexField(r"^\d{4}-(0[1-9]|1[0-2])$", help_text="Gregorian YYYY-MM")


class SlotsQuerySerializer(_ServiceSelectionSerializer):
    date = serializers.DateField(help_text="Gregorian YYYY-MM-DD")


class DayAvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    status = serializers.ChoiceField(choices=["open", "full", "closed"])


class MonthAvailabilitySerializer(serializers.Serializer):
    month = serializers.CharField()
    days = DayAvailabilitySerializer(many=True)


class SlotsSerializer(serializers.Serializer):
    date = serializers.DateField()
    duration_minutes = serializers.IntegerField()
    total_price = serializers.IntegerField(help_text="Rials")
    deposit_amount = serializers.IntegerField(help_text="Rials, 50% of total")
    slots = serializers.ListField(child=serializers.CharField(), help_text="Local HH:MM start times")


# ---------- checkout / payment ----------

class CheckoutSerializer(_ServiceSelectionSerializer):
    date = serializers.DateField()
    time = serializers.TimeField(input_formats=["%H:%M"], help_text="HH:MM, one of the values from /availability/slots/")
    customer_name = serializers.CharField(max_length=150)
    customer_phone = serializers.CharField(max_length=30)
    customer_email = serializers.EmailField(required=False, allow_blank=True, default="")

    def validate_customer_phone(self, value: str) -> str:
        return normalize_phone(value)


class CheckoutResponseSerializer(serializers.Serializer):
    appointment_id = serializers.UUIDField()
    expires_at = serializers.DateTimeField()
    total_price = serializers.IntegerField(help_text="Rials")
    deposit_amount = serializers.IntegerField(help_text="Rials")
    payment_url = serializers.URLField(help_text="Zarinpal StartPay URL to redirect the user to")


class VerifyPaymentSerializer(serializers.Serializer):
    authority = serializers.CharField(max_length=255)
    status = serializers.ChoiceField(choices=["OK", "NOK"], help_text="The `Status` query param Zarinpal sent back")


class AppointmentSerializer(serializers.ModelSerializer):
    barber_name = serializers.CharField(source="barber.name", read_only=True)
    services = ServiceSerializer(many=True, read_only=True)
    total_price = serializers.IntegerField(help_text="Rials")
    deposit_amount = serializers.IntegerField(help_text="Rials")
    can_cancel = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id", "status", "barber_name", "services", "start_datetime", "end_datetime",
            "total_price", "deposit_amount", "can_cancel",
        ]

    def get_can_cancel(self, obj: Appointment) -> bool:
        return obj.status == Appointment.Status.CONFIRMED and obj.start_datetime > timezone.now()


# ---------- auth ----------

class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)

    def validate_phone(self, value: str) -> str:
        return normalize_phone(value)


class OTPVerifySerializer(OTPRequestSerializer):
    code = serializers.RegexField(r"^\d{5}$")


class TokenSerializer(serializers.Serializer):
    access = serializers.CharField()
