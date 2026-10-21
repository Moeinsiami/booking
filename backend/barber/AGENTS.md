# AGENTS.md - Barbershop Reservation Backend (Django + DRF)

## 1. Project Overview & Architecture
You are an expert Senior Backend Engineer working on a single-shop Barbershop Reservation API built with **Django 5+**, **Django REST Framework (DRF)**, **PostgreSQL**, **Celery/Redis**, and **Stripe**.
The frontend is a separate **Next.js (App Router + TypeScript)** application.

### Core Domain Rules
1. **Guest-First Checkout:** Customers do NOT need to register an account to book. Bookings collect `customer_name`, `customer_phone`, and `customer_email`. Use `UUIDField` as the primary key for `Appointment` to prevent ID enumeration.
2. **Multi-Service Duration & Pricing:** A single `Appointment` can include multiple `Service` items.
   - `end_datetime` = `start_datetime` + sum of all selected services' `duration_minutes`.
   - `total_price` = sum of all selected services' `price`.
   - `deposit_amount` = 50% of `total_price` (rounded to 2 decimal places using `Decimal`).
3. **Custom Weekly Shifts (Dynamic Slots):** Barbers have custom shifts stored in the `Shift` model (`start_datetime`, `end_datetime`). We DO NOT pre-generate time-slot rows in the database. Available time slots are computed dynamically in a service layer by slicing a barber's `Shift` into 15-minute intervals and filtering out intervals that overlap with active appointments.
4. **Concurrency & Hold Expiry (10-Minute Lock):**
   - Creating a booking sets `status = 'PENDING_PAYMENT'` and `expires_at = timezone.now() + timedelta(minutes=10)`.
   - An appointment blocks availability if `status == 'CONFIRMED'` OR (`status == 'PENDING_PAYMENT'` AND `expires_at > timezone.now()`).
   - All booking creations MUST run inside `transaction.atomic()` and lock the barber row (`Barber.objects.select_for_update().get(id=barber_id)`) before checking for overlapping appointments to prevent race conditions.

---

## 2. Tech Stack & Libraries
- **Framework:** Django 5.x + Django REST Framework (`djangorestframework`)
- **Database:** PostgreSQL (`psycopg[binary]`)
- **API Documentation & Type Gen:** `drf-spectacular` (OpenAPI 3.0 schema generation for Next.js TypeScript client generation)
- **CORS:** `django-cors-headers`
- **Async Tasks:** `celery` + `redis` (for 1-hour-before SMS/Email reminders and cleaning up expired holds)
- **Payments:** `stripe` (Checkout Sessions + Webhooks)
- **Environment:** `django-environ` or `python-decouple`

---

## 3. Directory & Code Structure (Service Layer Pattern)
Keep views thin. Do NOT put complex availability math or Stripe logic inside DRF Views or Serializers.
```text
backend/
├── config/                  # Project settings, urls, celery.py, wsgi/asgi
├── apps/
│   ├── catalog/             # Service and Barber models, serializers, read-only views
│   ├── scheduling/          # Shift and Appointment models, availability engine
│   │   ├── models.py
│   │   ├── selectors.py     # Complex read queries (e.g., get_available_slots)
│   │   ├── services.py      # Write business logic (e.g., create_pending_appointment)
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── tasks.py         # Celery tasks (1-hour reminder)
│   └── payments/            # Stripe Checkout creation & webhook handlers
└── AGENTS.md