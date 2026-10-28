import uuid
from django.core.exceptions import ValidationError
from django.db import models


class Service(models.Model):
    name = models.CharField(max_length=150)
    duration_minutes = models.PositiveIntegerField()
    price = models.PositiveIntegerField(help_text="Price in Rials")
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.duration_minutes}minute - {self.price})"


class Barber(models.Model):
    name = models.CharField(max_length=150)
    bio = models.TextField(blank=True)
    # shortcut: URL string instead of ImageField, upgrade to ImageField + Pillow + S3 storage if direct file uploads are needed
    avatar = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    services = models.ManyToManyField(Service, related_name="barbers", blank=True)

    def __str__(self) -> str:
        return self.name


class Shift(models.Model):
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="shifts")
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()

    class Meta:
        ordering = ["start_datetime"]

    def clean(self) -> None:
        if self.start_datetime and self.end_datetime and self.end_datetime <= self.start_datetime:
            raise ValidationError("end_datetime must be after start_datetime.")

    def __str__(self) -> str:
        return f"{self.barber.name}: {self.start_datetime:%Y-%m-%d %H:%M} - {self.end_datetime:%H:%M}"


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "PENDING_PAYMENT", "Pending Payment"
        CONFIRMED = "CONFIRMED", "Confirmed"
        CANCELLED = "CANCELLED", "Cancelled"
        EXPIRED = "EXPIRED", "Expired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    barber = models.ForeignKey(Barber, on_delete=models.CASCADE, related_name="appointments")
    services = models.ManyToManyField(Service, related_name="appointments")
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=30, db_index=True)
    customer_email = models.EmailField(blank=True)
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    # Rials: the old max_digits=8 overflowed at ~1M Rials
    total_price = models.PositiveIntegerField(help_text="Total price in Rials")
    deposit_amount = models.PositiveIntegerField(help_text="Deposit amount in Rials")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
    )
    expires_at = models.DateTimeField(null=True, blank=True)
    payment_authority = models.CharField(max_length=255, blank=True, db_index=True)
    payment_ref_id = models.CharField(max_length=64, blank=True)

    class Meta:
        ordering = ["-start_datetime"]

    def __str__(self) -> str:
        return f"{self.customer_name} w/ {self.barber.name} @ {self.start_datetime:%Y-%m-%d %H:%M} ({self.status})"
