"use client";

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const SLIDES = [
  { id: 1, src: "/images/slider/1.jpg", alt: "تصویر ۱" },
  { id: 2, src: "/images/slider/2.jpg", alt: "تصویر ۲" },
  { id: 3, src: "/images/slider/3.jpg", alt: "تصویر ۳" },
  { id: 4, src: "/images/slider/4.jpg", alt: "تصویر ۴" },
  { id: 5, src: "/images/slider/5.jpg", alt: "تصویر ۵" },
];

const ImageSlider = () => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const updateCurrent = () => {
      setCurrent(api.selectedScrollSnap());
    };

    updateCurrent();
    api.on("select", updateCurrent);
    api.on("reInit", updateCurrent);

    return () => {
      api.off("select", updateCurrent);
      api.off("reInit", updateCurrent);
    };
  }, [api]);

  // Autoplay
  React.useEffect(() => {
    if (!api) return;

    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api, current]);

  return (
    <section className="w-full max-w-md sm:max-w-xl">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
          direction: "rtl",
        }}
        className="w-full"
      >
        <CarouselContent className="ms-0">
          {SLIDES.map((slide, index) => (
            <CarouselItem key={slide.id} className="w-full basis-full ps-0">
              <div className="relative aspect-square w-full overflow-hidden bg-muted sm:rounded-xl">
                {slide.src ? (
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    sizes="(max-width: 640px) 100vw, 576px"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    {slide.alt}
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="start-3 size-11 bg-background/80 backdrop-blur-xs hover:bg-background" />
        <CarouselNext className="end-3 size-11 bg-background/80 backdrop-blur-xs hover:bg-background" />
      </Carousel>

      {/* Pagination Dots */}
      <div
        className="mt-3 flex items-center justify-center gap-1"
        role="tablist"
        aria-label="اسلایدها"
      >
        {SLIDES.map((slide, index) => {
          const isActive = current === index;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`رفتن به اسلاید ${index + 1}`}
              onClick={() => api?.scrollTo(index)}
              className="flex size-11 items-center justify-center"
            >
              <span
                className={cn(
                  "h-2.5 rounded-full transition-all duration-300",
                  isActive
                    ? "w-6 bg-primary"
                    : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default ImageSlider;
