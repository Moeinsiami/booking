import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ReserveButton() {
  return (
    <Button
      size="lg"
      nativeButton={false}
      render={<Link href="/reservation" />}
      className="h-12 w-[calc(100%-2rem)] max-w-xs text-base font-bold sm:h-14 sm:w-full sm:max-w-sm sm:text-lg"
    >
      دریافت نوبت
    </Button>
  );
}
