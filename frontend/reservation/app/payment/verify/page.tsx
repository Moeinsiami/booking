"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, CalendarCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  apiFetch,
  formatPrice,
  formatTehranDateTime,
  type AppointmentItem,
} from "@/lib/api";

function VerifyContent() {
  const searchParams = useSearchParams();
  const authority =
    searchParams.get("Authority") ?? searchParams.get("authority") ?? "";
  const statusParam =
    searchParams.get("Status") ?? searchParams.get("status") ?? "NOK";

  const [loading, setLoading] = React.useState(() => Boolean(authority));
  const [appt, setAppt] = React.useState<AppointmentItem | null>(null);
  const [error, setError] = React.useState<string | null>(() =>
    authority ? null : "کد رهگیری درگاه پرداخت (Authority) یافت نشد."
  );

  React.useEffect(() => {
    if (!authority) return;
    apiFetch<AppointmentItem>("/payments/zarinpal/verify/", {
      method: "POST",
      body: JSON.stringify({
        authority,
        status: statusParam === "OK" ? "OK" : "NOK",
      }),
    })
      .then(setAppt)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authority, statusParam]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6 text-center">
        {loading ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="size-10 animate-spin text-primary" />
              <p className="font-semibold">در حال تایید تراکنش با زرین‌پال...</p>
            </CardContent>
          </Card>
        ) : appt ? (
          <Card>
            <CardContent className="space-y-4 text-center">
              <CheckCircle2 className="size-14 text-primary mx-auto" />
              <h1 className="text-xl font-bold">رزرو شما با موفقیت قطعی شد</h1>
              <div className="text-start space-y-2 border-t pt-4 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">آرایشگر:</span>
                  <span className="font-semibold">{appt.barber_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خدمات:</span>
                  <span className="font-semibold">
                    {appt.services.map((s) => s.name).join("، ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">زمان نوبت (تهران):</span>
                  <span className="font-semibold">
                    {formatTehranDateTime(appt.start_datetime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">بیعانه پرداخت‌شده:</span>
                  <span className="font-bold text-primary">
                    {formatPrice(appt.deposit_amount)}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/auth" />}
                  className="flex-1 h-11"
                >
                  <CalendarCheck2 className="size-4" />
                  <span>مشاهده نوبت‌های من</span>
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/" />}
                  className="flex-1 h-11"
                >
                  بازگشت به خانه
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 text-center">
              <XCircle className="size-14 text-destructive mx-auto" />
              <h1 className="text-xl font-bold">پرداخت ناموفق بود</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex gap-2 pt-2">
                <Button
                  nativeButton={false}
                  render={<Link href="/reservation" />}
                  className="flex-1 h-11"
                >
                  تلاش مجدد رزرو
                </Button>
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={<Link href="/" />}
                  className="flex-1 h-11"
                >
                  صفحه اصلی
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <React.Suspense fallback={<div className="p-10 text-center">در حال بارگذاری...</div>}>
      <VerifyContent />
    </React.Suspense>
  );
}
