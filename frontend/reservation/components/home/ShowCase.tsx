import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import ReserveButton from "@/components/home/ReserveButton";

const ShowCase = () => (
  <section className="flex flex-col items-center gap-4 px-4 pt-8 text-center sm:pt-14">
    <Avatar className="size-28 ring-4 ring-primary/20 sm:size-36">
      <AvatarImage src="/images/logo/logo.jpeg" alt="لوگوی خط کج" />
      <AvatarFallback>خک</AvatarFallback>
    </Avatar>
    <Badge variant="secondary">رزرو آنلاین، بدون انتظار</Badge>
    <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl">
      آرایشگاه مردانه <span className="text-primary">خط کج</span>
    </h1>
    <p className="max-w-md text-balance text-muted-foreground sm:text-lg">
      استایل دلخواهتان را انتخاب کنید، زمان مناسب را رزرو کنید و با پرداخت ۵۰٪ بیعانه، نوبتتان را قطعی کنید.
    </p>
    <ReserveButton />
  </section>
);

export default ShowCase;
