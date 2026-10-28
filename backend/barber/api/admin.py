from django.contrib import admin
from .models import Appointment, Barber, Service, Shift


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ("name", "duration_minutes", "price", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)


@admin.register(Barber)
class BarberAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active")
    list_filter = ("is_active", "services")
    search_fields = ("name",)
    filter_horizontal = ("services",)


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ("barber", "start_datetime", "end_datetime")
    list_filter = ("barber", "start_datetime")


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer_name",
        "customer_phone",
        "barber",
        "start_datetime",
        "end_datetime",
        "total_price",
        "deposit_amount",
        "status",
    )
    list_filter = ("status", "barber", "start_datetime")
    search_fields = ("customer_name", "customer_phone", "customer_email", "payment_authority")
    readonly_fields = ("id",)
    filter_horizontal = ("services",)
