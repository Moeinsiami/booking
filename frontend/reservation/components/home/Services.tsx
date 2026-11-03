"use client";

import * as React from "react";
import { Scissors } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { apiFetch, formatPrice, type ServiceItem } from "@/lib/api";

const Services = () => {
  const [services, setServices] = React.useState<ServiceItem[]>([]);

  React.useEffect(() => {
    apiFetch<ServiceItem[]>("/services/")
      .then(setServices)
      .catch(() => {});
  }, []);

  if (!services.length) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4">
      <h2 className="mb-4 text-xl font-bold sm:text-2xl">خدمات ما</h2>
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center gap-4 sm:flex-col sm:items-start">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Scissors className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {s.duration_minutes.toLocaleString("fa-IR")} دقیقه ·{" "}
                  {formatPrice(s.price)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};

export default Services;
