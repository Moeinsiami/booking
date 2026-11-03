import Link from "next/link";
import { Scissors, User } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <Scissors className="size-5 text-primary" aria-hidden />
        <span>خط کج</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href="/auth" />}
          className="h-10 px-3"
        >
          <User className="size-4" />
          <span>ورود / حساب من</span>
        </Button>
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href="/reservation" />}
          className="h-10 px-4"
        >
          رزرو نوبت
        </Button>
      </div>
    </div>
  </header>
);

export default Header;
