"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  LogOut,
  Loader2,
  Calendar,
  XCircle,
  KeyRound,
  UserPlus,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  apiFetch,
  formatPrice,
  formatTehranDateTime,
  type AppointmentItem,
} from "@/lib/api";

type AuthMode = "login" | "register" | "otp";

export default function AuthAndDashboardPage() {
  const [token, setToken] = React.useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null
  );
  const [mode, setMode] = React.useState<AuthMode>("login");

  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [otpCode, setOtpCode] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [appointments, setAppointments] = React.useState<AppointmentItem[]>([]);
  const [loadingAppts, setLoadingAppts] = React.useState(() =>
    typeof window !== "undefined" ? Boolean(localStorage.getItem("access_token")) : false
  );

  const loadAppointments = React.useCallback(async () => {
    try {
      const list = await apiFetch<AppointmentItem[]>("/me/appointments/");
      setAppointments(list);
    } catch {
      localStorage.removeItem("access_token");
      setToken(null);
    } finally {
      setLoadingAppts(false);
    }
  }, []);

  React.useEffect(() => {
    if (!token) return;
    let active = true;
    apiFetch<AppointmentItem[]>("/me/appointments/")
      .then((list) => {
        if (active) setAppointments(list);
      })
      .catch(() => {
        if (active) {
          localStorage.removeItem("access_token");
          setToken(null);
        }
      })
      .finally(() => {
        if (active) setLoadingAppts(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const saveAuth = (accessToken: string) => {
    localStorage.setItem("access_token", accessToken);
    if (phone) localStorage.setItem("user_phone", phone);
    if (name) localStorage.setItem("user_name", name);
    setLoadingAppts(true);
    setToken(accessToken);
  };

  const handleLoginOrRegister = async (
    e: React.SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const path = mode === "register" ? "/auth/register/" : "/auth/login/";
      const body =
        mode === "register"
          ? { phone, password, name, email }
          : { phone, password };
      const res = await apiFetch<{ access: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      saveAuth(res.access);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در احراز هویت");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!otpSent) {
        await apiFetch<void>("/auth/otp/request/", {
          method: "POST",
          body: JSON.stringify({ phone }),
        });
        setOtpSent(true);
      } else {
        const res = await apiFetch<{ access: string }>("/auth/otp/verify/", {
          method: "POST",
          body: JSON.stringify({ phone, code: otpCode }),
        });
        saveAuth(res.access);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ارسال/تایید کد");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await apiFetch(`/me/appointments/${id}/cancel/`, { method: "POST" });
      loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در لغو نوبت");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setAppointments([]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/" />}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            <ArrowRight className="size-4" />
            <span>بازگشت به خانه</span>
          </Button>
          {token && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-destructive gap-1.5"
            >
              <LogOut className="size-4" />
              <span>خروج</span>
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive">
            {error}
          </div>
        )}

        {!token ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold">
                {mode === "login"
                  ? "ورود به حساب کاربری"
                  : mode === "register"
                    ? "ثبت‌نام حساب جدید"
                    : "ورود با کد یکبار مصرف (OTP)"}
              </CardTitle>
              <CardDescription>
                برای مشاهده و مدیریت نوبت‌های خود وارد شوید
              </CardDescription>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-muted p-1 mt-3">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "login" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-xs rounded-xl"
                >
                  <LogIn className="size-3.5" />
                  <span>ورود</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "register" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-xs rounded-xl"
                >
                  <UserPlus className="size-3.5" />
                  <span>ثبت‌نام</span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === "otp" ? "default" : "ghost"}
                  onClick={() => {
                    setMode("otp");
                    setOtpSent(false);
                    setError(null);
                  }}
                  className="text-xs rounded-xl"
                >
                  <KeyRound className="size-3.5" />
                  <span>کد پیامکی</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {mode === "otp" ? (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">شماره موبایل</label>
                    <input
                      required
                      dir="ltr"
                      disabled={otpSent}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09121234567"
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {otpSent && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        کد ۵ رقمی ارسال شده
                      </label>
                      <input
                        required
                        dir="ltr"
                        maxLength={5}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="12345"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-center tracking-widest text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : otpSent ? (
                      "تایید و ورود"
                    ) : (
                      "دریافت کد تایید"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLoginOrRegister} className="space-y-4">
                  {mode === "register" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        نام و نام خانوادگی
                      </label>
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="علی رضایی"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">شماره موبایل</label>
                    <input
                      required
                      dir="ltr"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09121234567"
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {mode === "register" && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">
                        ایمیل (اختیاری)
                      </label>
                      <input
                        type="email"
                        dir="ltr"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">رمز عبور</label>
                    <input
                      required
                      type="password"
                      dir="ltr"
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full h-11 rounded-xl font-semibold"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : mode === "register" ? (
                      "ثبت‌نام و ورود"
                    ) : (
                      "ورود به حساب"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Calendar className="size-5 text-primary" />
                <span>نوبت‌های من</span>
              </h1>
              <Button
                size="sm"
                nativeButton={false}
                render={<Link href="/reservation" />}
              >
                رزرو نوبت جدید
              </Button>
            </div>

            {loadingAppts ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : !appointments.length ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  هنوز هیچ نوبت فعالی ثبت نکرده‌اید.
                </CardContent>
              </Card>
            ) : (
              appointments.map((a) => (
                <Card key={a.id} size="sm">
                  <CardContent className="space-y-3 text-xs sm:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base">
                        آرایشگر: {a.barber_name}
                      </span>
                      <Badge
                        variant={
                          a.status === "CONFIRMED" ? "default" : "secondary"
                        }
                      >
                        {a.status === "CONFIRMED" ? "قطعی شده" : "لغو شده"}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground">
                      خدمات: {a.services.map((s) => s.name).join("، ")}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        زمان (تهران):
                      </span>
                      <span className="font-medium">
                        {formatTehranDateTime(a.start_datetime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">بیعانه:</span>
                      <span className="font-semibold text-primary">
                        {formatPrice(a.deposit_amount)}
                      </span>
                    </div>
                    {a.can_cancel && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancel(a.id)}
                        className="w-full mt-2 gap-1.5"
                      >
                        <XCircle className="size-4" />
                        <span>لغو این نوبت</span>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
