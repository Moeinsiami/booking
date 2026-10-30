import { Scissors, Sparkles, Brush, Droplets } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SERVICES = [
  { icon: Scissors, title: "اصلاح مو", price: 250000, duration: "۳۰ دقیقه" },
  { icon: Brush, title: "اصلاح ریش", price: 150000, duration: "۲۰ دقیقه" },
  { icon: Sparkles, title: "کلاسیک کامل", price: 380000, duration: "۵۰ دقیقه" },
  { icon: Droplets, title: "شستشو و ماساژ", price: 120000, duration: "۱۵ دقیقه" },
];

const Services = () => (
  <section className="mx-auto w-full max-w-6xl px-4">
    <h2 className="mb-4 text-xl font-bold sm:text-2xl">خدمات ما</h2>
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
      {SERVICES.map(({ icon: Icon, title, price, duration }) => (
        <Card key={title}>
          <CardContent className="flex items-center gap-4 sm:flex-col sm:items-start">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden />
            </span>
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground">
                {duration} · {price.toLocaleString("fa-IR")} تومان
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);

export default Services;
