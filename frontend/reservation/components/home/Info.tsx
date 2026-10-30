import { Clock, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  { icon: Clock, title: "ساعت کاری", text: "شنبه تا پنجشنبه، ۹ تا ۲۱" },
  { icon: MapPin, title: "آدرس", text: "تهران، خیابان نمونه، پلاک ۱۰" },
  { icon: Phone, title: "تماس", text: "۰۲۱-۱۲۳۴۵۶۷۸" },
];

const Info = () => (
  <section className="mx-auto w-full max-w-6xl px-4">
    <h2 className="mb-4 text-xl font-bold sm:text-2xl">اطلاعات آرایشگاه</h2>
    <div className="grid gap-3 sm:grid-cols-3">
      {ITEMS.map(({ icon: Icon, title, text }) => (
        <Card key={title}>
          <CardContent className="flex items-center gap-3">
            <Icon className="size-5 shrink-0 text-primary" aria-hidden />
            <div>
              <h3 className="font-bold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </section>
);

export default Info;
