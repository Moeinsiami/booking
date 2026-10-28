from django.urls import path

from . import views

urlpatterns = [
    path("services/", views.ServiceListView.as_view()),
    path("availability/month/", views.MonthAvailabilityView.as_view()),
    path("availability/slots/", views.SlotsView.as_view()),
    path("appointments/checkout/", views.CheckoutView.as_view()),
    path("payments/zarinpal/verify/", views.ZarinpalVerifyView.as_view()),
    path("auth/otp/request/", views.OTPRequestView.as_view()),
    path("auth/otp/verify/", views.OTPVerifyView.as_view()),
    path("me/appointments/", views.MyAppointmentsView.as_view()),
    path("me/appointments/<uuid:pk>/cancel/", views.CancelAppointmentView.as_view()),
]
