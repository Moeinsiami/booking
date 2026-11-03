"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CalendarCheck2,
  ArrowRight,
  Check,
  Clock,
  Scissors,
  Loader2,
  CreditCard,
} from "lucide-react"
import {
  apiFetch,
  formatPrice,
  toGregorianDate,
  toGregorianMonth,
  utcSlotToTehran,
  type CheckoutResponse,
  type DayAvailability,
  type ServiceItem,
  type SlotsResponse,
} from "@/lib/api"
import { cn } from "@/lib/utils"

type Step = "services" | "calendar" | "checkout"

export default function ReservationCalender() {
  const [step, setStep] = React.useState<Step>("services")
  const [services, setServices] = React.useState<ServiceItem[]>([])
  const [loadingServices, setLoadingServices] = React.useState(true)
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])

  const [monthDate, setMonthDate] = React.useState<Date>(() => new Date())
  const [monthDays, setMonthDays] = React.useState<Record<string, string>>({})
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )
  const [slotsData, setSlotsData] = React.useState<SlotsResponse | null>(null)
  const [loadingSlots, setLoadingSlots] = React.useState(false)
  const [selectedSlotUtc, setSelectedSlotUtc] = React.useState<string | null>(
    null
  )

  const [customerName, setCustomerName] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("user_name") ?? "" : ""
  )
  const [customerPhone, setCustomerPhone] = React.useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("user_phone") ?? "" : ""
  )
  const [customerEmail, setCustomerEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    apiFetch<ServiceItem[]>("/services/")
      .then(setServices)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingServices(false))
  }, [])

  const selectedServices = React.useMemo(
    () => services.filter((s) => selectedIds.includes(s.id)),
    [services, selectedIds]
  )

  const totalDuration = React.useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0),
    [selectedServices]
  )
  const totalPrice = React.useMemo(
    () => selectedServices.reduce((acc, s) => acc + s.price, 0),
    [selectedServices]
  )
  const depositAmount = React.useMemo(
    () => Math.round(totalPrice / 2),
    [totalPrice]
  )

  const toggleService = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSelectedSlotUtc(null)
  }

  // Fetch month availability when entering calendar step or changing month
  React.useEffect(() => {
    if (step !== "calendar" || !selectedIds.length) return
    const qs = new URLSearchParams({ month: toGregorianMonth(monthDate) })
    selectedIds.forEach((id) => qs.append("service_ids", String(id)))

    apiFetch<{ month: string; days: DayAvailability[] }>(
      `/availability/month/?${qs.toString()}`
    )
      .then((res) => {
        const map: Record<string, string> = {}
        res.days.forEach((d) => {
          map[d.date] = d.status
        })
        setMonthDays(map)
      })
      .catch(() => {})
  }, [step, monthDate, selectedIds])

  // Fetch slots when date is selected in calendar step
  React.useEffect(() => {
    if (step !== "calendar" || !selectedDate || !selectedIds.length) return
    let active = true
    const dateStr = toGregorianDate(selectedDate)
    const qs = new URLSearchParams({ date: dateStr })
    selectedIds.forEach((id) => qs.append("service_ids", String(id)))

    apiFetch<SlotsResponse>(`/availability/slots/?${qs.toString()}`)
      .then((res) => {
        if (active) setSlotsData(res)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoadingSlots(false)
      })
    return () => {
      active = false
    }
  }, [step, selectedDate, selectedIds])

  const formattedDate = React.useMemo(() => {
    if (!selectedDate) return null
    return selectedDate.toLocaleDateString("fa-IR", {
      timeZone: "Asia/Tehran",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [selectedDate])

  const selectedDateIso = selectedDate ? toGregorianDate(selectedDate) : ""

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate || !selectedSlotUtc || !selectedIds.length) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch<CheckoutResponse>("/appointments/checkout/", {
        method: "POST",
        body: JSON.stringify({
          service_ids: selectedIds,
          date: selectedDateIso,
          time: selectedSlotUtc,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
        }),
      })
      window.location.assign(res.payment_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ثبت نوبت")
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-x-hidden">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center gap-6">
        {/* Navigation & Header */}
        <div className="w-full flex items-center justify-between">
          {step === "services" ? (
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
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setStep(step === "checkout" ? "calendar" : "services")
              }
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <ArrowRight className="size-4" />
              <span>مرحله قبل</span>
            </Button>
          )}
          <Badge variant="secondary">
            {step === "services"
              ? "۱. انتخاب خدمات"
              : step === "calendar"
                ? "۲. انتخاب تاریخ و ساعت"
                : "۳. اطلاعات و پرداخت بیعانه"}
          </Badge>
        </div>

        {error && (
          <div className="w-full rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs sm:text-sm text-destructive">
            {error}
          </div>
        )}

        {/* STEP 1: SERVICE SELECTION */}
        {step === "services" && (
          <>
            <div className="text-center space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                انتخاب خدمات آرایشگاه
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                یک یا چند خدمت را برای محاسبه زمان و هزینه انتخاب کنید
              </p>
            </div>

            {loadingServices ? (
              <div className="py-12 flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>در حال دریافت خدمات...</span>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-3">
                {services.map((s) => {
                  const active = selectedIds.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={cn(
                        "w-full text-start rounded-2xl border p-4 transition-all flex items-center justify-between gap-3",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border bg-card hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-full",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {active ? (
                            <Check className="size-5" />
                          ) : (
                            <Scissors className="size-5" />
                          )}
                        </span>
                        <div>
                          <div className="font-bold text-sm sm:text-base">
                            {s.name}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="size-3.5" />
                            <span>
                              {s.duration_minutes.toLocaleString("fa-IR")} دقیقه
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {formatPrice(s.price)}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Price & Duration Calculator Summary */}
            <Card size="sm" className="w-full">
              <CardContent className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">مدت زمان کل:</span>
                  <span className="font-semibold">
                    {totalDuration.toLocaleString("fa-IR")} دقیقه
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">مبلغ کل خدمات:</span>
                  <span className="font-semibold">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t pt-2 text-primary font-bold">
                  <span>مبلغ بیعانه (۵۰٪):</span>
                  <span>{formatPrice(depositAmount)}</span>
                </div>
              </CardContent>
            </Card>

            <Button
              size="lg"
              disabled={!selectedIds.length}
              onClick={() => {
                setError(null)
                if (selectedDate) setLoadingSlots(true)
                setStep("calendar")
              }}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-sm"
            >
              ادامه و انتخاب تاریخ نوبت
            </Button>
          </>
        )}

        {/* STEP 2: CALENDAR + TIME SLOTS AT THE BOTTOM */}
        {step === "calendar" && (
          <>
            <div className="text-center space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                انتخاب تاریخ و ساعت نوبت
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                روز مورد نظر را از تقویم انتخاب کنید تا ساعت‌های خالی نمایش داده شوند
              </p>
            </div>

            <div className="w-full bg-card text-card-foreground border border-border/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date)
                  setSelectedSlotUtc(null)
                  setError(null)
                  if (date) setLoadingSlots(true)
                }}
                onMonthChange={setMonthDate}
                disabled={(date) => {
                  const todayIso = toGregorianDate(new Date())
                  const dIso = toGregorianDate(date)
                  if (dIso < todayIso) return true
                  const st = monthDays[dIso]
                  return st === "closed" || st === "full"
                }}
                className="w-full flex justify-center"
              />

              {/* Selected Date Summary */}
              <div className="w-full mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck2 className="size-4 text-primary shrink-0" />
                  تاریخ انتخاب‌شده:
                </span>
                <span className="font-semibold text-foreground">
                  {formattedDate ?? "انتخاب نشده"}
                </span>
              </div>

              {/* Time Slots on the bottom of the calendar */}
              <div className="w-full mt-4 pt-4 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" />
                    ساعت‌های قابل رزرو (به وقت تهران):
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {totalDuration.toLocaleString("fa-IR")} دقیقه
                  </span>
                </div>

                {loadingSlots ? (
                  <div className="py-6 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>در حال بررسی ساعت‌های خالی...</span>
                  </div>
                ) : !selectedDate ? (
                  <p className="text-xs text-center text-muted-foreground py-4">
                    لطفاً یک روز را از تقویم انتخاب کنید.
                  </p>
                ) : !slotsData?.slots.length ? (
                  <p className="text-xs text-center text-muted-foreground py-4">
                    در این تاریخ نوبت خالی برای خدمات انتخابی وجود ندارد.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slotsData.slots.map((utcSlot) => {
                      const tehranLabel = utcSlotToTehran(
                        selectedDateIso,
                        utcSlot
                      )
                      const isPicked = selectedSlotUtc === utcSlot
                      return (
                        <Button
                          key={utcSlot}
                          type="button"
                          variant={isPicked ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedSlotUtc(utcSlot)}
                          className="h-10 font-semibold rounded-xl"
                        >
                          {tehranLabel}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <Button
              size="lg"
              disabled={!selectedDate || !selectedSlotUtc}
              onClick={() => setStep("checkout")}
              className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-sm"
            >
              ادامه و تکمیل رزرو
            </Button>
          </>
        )}

        {/* STEP 3: CUSTOMER INFO & ZARINPAL DEPOSIT CHECKOUT */}
        {step === "checkout" && (
          <form onSubmit={handleCheckout} className="w-full space-y-5">
            <div className="text-center space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                تکمیل اطلاعات و پرداخت بیعانه
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                نوبت شما به مدت ۱۰ دقیقه رزرو موقت می‌شود تا پرداخت انجام شود
              </p>
            </div>

            <Card size="sm" className="w-full">
              <CardContent className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">خدمات:</span>
                  <span className="font-medium">
                    {selectedServices.map((s) => s.name).join("، ")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاریخ و ساعت (تهران):</span>
                  <span className="font-medium">
                    {formattedDate} - ساعت{" "}
                    {selectedSlotUtc &&
                      utcSlotToTehran(selectedDateIso, selectedSlotUtc)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">مبلغ کل:</span>
                  <span>
                    {formatPrice(slotsData?.total_price ?? totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-primary">
                  <span>قابل پرداخت (۵۰٪ بیعانه):</span>
                  <span>
                    {formatPrice(slotsData?.deposit_amount ?? depositAmount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">نام و نام خانوادگی</label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثلاً علی رضایی"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">شماره موبایل</label>
                <input
                  required
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="09121234567"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  ایمیل (اختیاری)
                </label>
                <input
                  type="email"
                  dir="ltr"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm text-end outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full h-12 text-sm sm:text-base font-semibold rounded-xl shadow-sm gap-2"
            >
              {submitting ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <CreditCard className="size-5" />
              )}
              <span>پرداخت بیعانه با زرین‌پال</span>
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
