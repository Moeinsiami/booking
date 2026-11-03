from celery import shared_task
from django.utils import timezone

from .models import Appointment
from .selectors import SHOP_TZ
from .sms import send_sms


@shared_task
def send_reminder(appointment_id: str) -> None:
    # Re-check state: the booking may have been cancelled since this task was scheduled.
    appt = Appointment.objects.select_related("barber").filter(
        pk=appointment_id, status=Appointment.Status.CONFIRMED, start_datetime__gt=timezone.now()
    ).first()
    if appt:
        start = appt.start_datetime.astimezone(SHOP_TZ)
        send_sms(appt.customer_phone, f"یادآوری: نوبت شما با {appt.barber.name} ساعت {start:%H:%M} است.")
