from calendar import monthrange
from datetime import date as date_type, datetime, time, timedelta
from typing import Iterable

from django.db.models import Count, Q
from django.utils import timezone

from .models import Appointment, Barber, Service, Shift

SLOT_STEP_MINUTES = 15


def get_active_services(service_ids: Iterable[int]) -> list[Service]:
    """Returns the services, or [] if the set is empty or any id is missing/inactive."""
    service_id_set = set(service_ids)
    if not service_id_set:
        return []
    services = list(Service.objects.filter(id__in=service_id_set, is_active=True))
    return services if len(services) == len(service_id_set) else []


def get_barbers_for_services(service_ids: Iterable[int], barber_id: int | None = None) -> list[Barber]:
    """Active barbers (ordered by id) who offer every one of the given services."""
    ids = set(service_ids)
    qs = Barber.objects.filter(is_active=True, services__in=ids)
    if barber_id is not None:
        qs = qs.filter(id=barber_id)
    return list(qs.annotate(n=Count("services", distinct=True)).filter(n=len(ids)).order_by("id"))


def get_active_appointments(barber_id: int, range_start: datetime, range_end: datetime) -> list[Appointment]:
    return list(
        Appointment.objects.filter(
            barber_id=barber_id,
            start_datetime__lt=range_end,
            end_datetime__gt=range_start,
        ).filter(
            Q(status=Appointment.Status.CONFIRMED)
            | Q(status=Appointment.Status.PENDING_PAYMENT, expires_at__gt=timezone.now())
        )
    )


def _day_bounds(target_date: date_type) -> tuple[datetime, datetime]:
    day_start = timezone.make_aware(datetime.combine(target_date, time.min), timezone.get_current_timezone())
    return day_start, day_start + timedelta(days=1)


def _day_slots(shifts, appointments, day_start, day_end, duration: timedelta, now) -> list[str]:
    """Local 'HH:MM' start times on one day; pure function over pre-fetched shifts/appointments."""
    tz = timezone.get_current_timezone()
    step_delta = timedelta(minutes=SLOT_STEP_MINUTES)
    day_appts = [a for a in appointments if a.start_datetime < day_end and a.end_datetime > day_start]

    slots: list[str] = []
    seen: set[str] = set()
    for shift in shifts:
        if shift.start_datetime >= day_end or shift.end_datetime <= day_start:
            continue
        slot_start = max(shift.start_datetime, day_start)
        shift_end = min(shift.end_datetime, day_end)

        while slot_start + duration <= shift_end:
            slot_end = slot_start + duration
            overlaps = any(a.start_datetime < slot_end and a.end_datetime > slot_start for a in day_appts)
            if slot_start > now and not overlaps:
                label = timezone.localtime(slot_start, tz).strftime("%H:%M")
                if label not in seen:
                    seen.add(label)
                    slots.append(label)
            slot_start += step_delta
    return slots


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

    services = get_active_services(service_ids)
    total_duration = sum(s.duration_minutes for s in services)
    if total_duration <= 0:
        return []

    day_start, day_end = _day_bounds(target_date)
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

    appointments = get_active_appointments(barber_id, day_start, day_end)
    return _day_slots(shifts, appointments, day_start, day_end, timedelta(minutes=total_duration), timezone.now())


def get_available_slots_any_barber(
    date: date_type,
    service_ids: Iterable[int],
    barber_id: int | None = None,
) -> list[str]:
    """Sorted union of open start times across barbers who offer all the services."""
    service_ids = list(service_ids)
    slots: set[str] = set()
    for barber in get_barbers_for_services(service_ids, barber_id):
        slots.update(get_available_slots(barber.id, date, service_ids))
    return sorted(slots)


def get_month_availability(
    year: int,
    month: int,
    service_ids: Iterable[int],
    barber_id: int | None = None,
) -> dict[date_type, str]:
    """Maps each day of the month to 'open' | 'full' | 'closed' (no shift or already past)."""
    service_ids = list(service_ids)
    days = [date_type(year, month, d) for d in range(1, monthrange(year, month)[1] + 1)]
    month_start, _ = _day_bounds(days[0])
    _, month_end = _day_bounds(days[-1])
    now = timezone.now()

    services = get_active_services(service_ids)
    total_duration = sum(s.duration_minutes for s in services)
    barbers = get_barbers_for_services(service_ids, barber_id) if total_duration > 0 else []
    duration = timedelta(minutes=total_duration)

    # One shifts + one appointments query per barber for the whole month.
    per_barber = []
    for barber in barbers:
        shifts = list(
            Shift.objects.filter(barber=barber, start_datetime__lt=month_end, end_datetime__gt=month_start)
        )
        per_barber.append((shifts, get_active_appointments(barber.id, month_start, month_end)))

    result: dict[date_type, str] = {}
    for day in days:
        day_start, day_end = _day_bounds(day)
        if day_end <= now:
            result[day] = "closed"
            continue
        has_shift = any(
            s.start_datetime < day_end and s.end_datetime > day_start for shifts, _ in per_barber for s in shifts
        )
        if not has_shift:
            result[day] = "closed"
        elif any(_day_slots(sh, ap, day_start, day_end, duration, now) for sh, ap in per_barber):
            result[day] = "open"
        else:
            result[day] = "full"
    return result
