from datetime import date as date_type, datetime, time, timedelta
from typing import Iterable

from django.db.models import Q
from django.utils import timezone

from .models import Appointment, Service, Shift

SLOT_STEP_MINUTES = 15


def get_available_slots(
    barber_id: int,
    date: date_type | str,
    service_ids: Iterable[int],
) -> list[str]:
    if isinstance(date, datetime):
        target_date = timezone.localtime(date).date() if timezone.is_aware(date) else date.date()
    elif isinstance(date, str):
        target_date = date_type.fromisoformat(date)
    else:
        target_date = date

    service_id_set = set(service_ids)
    if not service_id_set:
        return []

    services = list(Service.objects.filter(id__in=service_id_set, is_active=True))
    if len(services) != len(service_id_set):
        return []

    total_duration = sum(s.duration_minutes for s in services)
    if total_duration <= 0:
        return []

    duration_delta = timedelta(minutes=total_duration)
    step_delta = timedelta(minutes=SLOT_STEP_MINUTES)

    tz = timezone.get_current_timezone()
    day_start = timezone.make_aware(datetime.combine(target_date, time.min), tz)
    day_end = day_start + timedelta(days=1)

    shifts = list(
        Shift.objects.filter(
            barber_id=barber_id,
            barber__is_active=True,
            start_datetime__lt=day_end,
            end_datetime__gt=day_start,
        ).order_by("start_datetime")
    )
    if not shifts:
        return []

    now = timezone.now()
    active_appointments = list(
        Appointment.objects.filter(
            barber_id=barber_id,
            start_datetime__lt=day_end,
            end_datetime__gt=day_start,
        ).filter(
            Q(status=Appointment.Status.CONFIRMED)
            | Q(status=Appointment.Status.PENDING_PAYMENT, expires_at__gt=now)
        )
    )

    slots: list[str] = []
    seen: set[str] = set()

    for shift in shifts:
        slot_start = max(shift.start_datetime, day_start)
        shift_end = min(shift.end_datetime, day_end)

        while slot_start + duration_delta <= shift_end:
            slot_end = slot_start + duration_delta
            overlaps = any(
                appt.start_datetime < slot_end and appt.end_datetime > slot_start
                for appt in active_appointments
            )
            if not overlaps:
                label = timezone.localtime(slot_start, tz).strftime("%H:%M")
                if label not in seen:
                    seen.add(label)
                    slots.append(label)
            slot_start += step_delta

    return slots
