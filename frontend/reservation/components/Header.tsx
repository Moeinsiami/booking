import Link from "next/link";
import { Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";

const Header = () => (
  <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
    <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <Scissors className="size-5 text-primary" aria-hidden />
        <span>خط کج</span>
      </Link>
      <Button
        size="sm"
        nativeButton={false}
        render={<Link href="/reservation" />}
        className="h-10 px-4"
      >
        رزرو نوبت
      </Button>
    </div>
  </header>
);

export default Header;
