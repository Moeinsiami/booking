from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import selectors, services
from .models import Appointment, Service
from .serializers import (
    AppointmentSerializer,
    CheckoutResponseSerializer,
    CheckoutSerializer,
    MonthAvailabilitySerializer,
    MonthQuerySerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    ServiceSerializer,
    SlotsQuerySerializer,
    SlotsSerializer,
    TokenSerializer,
    VerifyPaymentSerializer,
)


class PublicAPIView(APIView):
    # No auth classes: a stale/invalid Bearer header must not 401 a public endpoint.
    authentication_classes: list = []
    permission_classes = [AllowAny]


class ThrottledPublicAPIView(PublicAPIView):
    throttle_classes = [ScopedRateThrottle]


def _query(serializer_class, request) -> dict:
    serializer = serializer_class(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class ServiceListView(generics.ListAPIView):
    authentication_classes: list = []
    permission_classes = [AllowAny]
    pagination_class = None
    serializer_class = ServiceSerializer
    queryset = Service.objects.filter(is_active=True).order_by("id")


class MonthAvailabilityView(PublicAPIView):
    @extend_schema(parameters=[MonthQuerySerializer], responses=MonthAvailabilitySerializer)
    def get(self, request):
        q = _query(MonthQuerySerializer, request)
        year, month = map(int, q["month"].split("-"))
        days = selectors.get_month_availability(year, month, q["service_ids"], q.get("barber"))
        return Response({
            "month": q["month"],
            "days": [{"date": d, "status": s} for d, s in days.items()],
        })


class SlotsView(PublicAPIView):
    @extend_schema(parameters=[SlotsQuerySerializer], responses=SlotsSerializer)
    def get(self, request):
        q = _query(SlotsQuerySerializer, request)
        quote = services.get_quote(q["service_ids"])
        return Response({
            "date": q["date"],
            "duration_minutes": quote["duration_minutes"],
            "total_price": int(quote["total_price"]),
            "deposit_amount": int(quote["deposit_amount"]),
            "slots": selectors.get_available_slots_any_barber(q["date"], q["service_ids"], q.get("barber")),
        })


class CheckoutView(ThrottledPublicAPIView):
    throttle_scope = "checkout"

    @extend_schema(request=CheckoutSerializer, responses={201: CheckoutResponseSerializer})
    def post(self, request):
        s = CheckoutSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        appt, payment_url = services.create_checkout(
            service_ids=d["service_ids"],
            barber_id=d.get("barber"),
            date=d["date"],
            start_time=d["time"],
            name=d["customer_name"],
            phone=d["customer_phone"],
            email=d["customer_email"],
        )
        return Response(
            {
                "appointment_id": appt.id,
                "expires_at": appt.expires_at,
                "total_price": int(appt.total_price),
                "deposit_amount": int(appt.deposit_amount),
                "payment_url": payment_url,
            },
            status=status.HTTP_201_CREATED,
        )


class ZarinpalVerifyView(PublicAPIView):
    @extend_schema(request=VerifyPaymentSerializer, responses=AppointmentSerializer)
    def post(self, request):
        s = VerifyPaymentSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        appt = services.verify_payment(s.validated_data["authority"], s.validated_data["status"])
        return Response(AppointmentSerializer(appt).data)


class OTPRequestView(ThrottledPublicAPIView):
    throttle_scope = "otp"

    @extend_schema(request=OTPRequestSerializer, responses={204: None})
    def post(self, request):
        s = OTPRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        services.request_otp(s.validated_data["phone"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class OTPVerifyView(ThrottledPublicAPIView):
    throttle_scope = "otp"

    @extend_schema(request=OTPVerifySerializer, responses=TokenSerializer)
    def post(self, request):
        s = OTPVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        token = services.verify_otp(s.validated_data["phone"], s.validated_data["code"])
        return Response({"access": token})


class MyAppointmentsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = None
    serializer_class = AppointmentSerializer

    def get_queryset(self):
        # The JWT subject is the verified phone number (username).
        return services.list_guest_appointments(self.request.user.username)


class CancelAppointmentView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=AppointmentSerializer)
    def post(self, request, pk):
        appt = services.cancel_appointment(request.user.username, pk)
        return Response(AppointmentSerializer(appt).data)
