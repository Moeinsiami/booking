"use client"

import * as React from "react"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { CalendarCheck2, ArrowRight } from "lucide-react"

export default function ReservationCalender() {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    () => new Date()
  )

  const formattedDate = React.useMemo(() => {
    if (!selectedDate) return null
    return selectedDate.toLocaleDateString("fa-IR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [selectedDate])

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-x-hidden">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center gap-6">
        
        {/* Navigation & Header */}
        <div className="w-full flex items-center justify-between">
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
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            مرحله انتخاب زمان
          </span>
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            انتخاب تاریخ نوبت
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            روز مورد نظر خود را از تقویم شمسی زیر انتخاب کنید
          </p>
        </div>

        {/* Calendar Card */}
        <div className="w-full bg-card text-card-foreground border border-border/80 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-sm flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            disabled={{ before: new Date() }}
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
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          disabled={!selectedDate}
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl shadow-sm"
        >
          ادامه و انتخاب ساعت نوبت
        </Button>
      </div>
    </div>
  )
}
