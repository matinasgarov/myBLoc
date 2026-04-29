"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

const MONO  = 'var(--font-space-mono)'
const SERIF = 'var(--font-playfair)'
const SANS  = 'var(--font-geist-sans), system-ui, sans-serif'
const ACC   = '#0051ff'

export interface HowStepItem {
  id: string;
  num: string;
  title: string;
  desc: string;
  image: string;
}

interface HowItWorksGalleryProps {
  title: string;
  items: HowStepItem[];
}

export function HowItWorksGallery({ title, items }: HowItWorksGalleryProps) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => setCurrentSlide(carouselApi.selectedScrollSnap());
    update();
    carouselApi.on("select", update);
    return () => { carouselApi.off("select", update); };
  }, [carouselApi]);

  return (
    <div className="w-full">
      {/* Header row: title left, arrow buttons right */}
      <div className="max-w-5xl mx-auto px-6 sm:px-10 mb-10">
        <div className="flex items-center gap-3">
          <span className="w-8 h-px" style={{ background: ACC }} />
          <span
            className="text-[10px] tracking-[0.22em] uppercase"
            style={{ color: ACC, fontFamily: MONO }}
          >
            {title}
          </span>
        </div>
      </div>

      {/* Carousel — bleeds to edges */}
      <Carousel
        setApi={setCarouselApi}
        opts={{
          align: "center",
          breakpoints: { "(max-width: 768px)": { dragFree: true } },
        }}
      >
        <CarouselContent className="justify-center">
          {items.map((item) => (
            <CarouselItem
              key={item.id}
              className="basis-[75vw] sm:basis-[52vw] md:basis-[36%] lg:basis-[28%] pl-5"
            >
              <div
                className="group relative overflow-hidden rounded-xl"
                style={{
                  minHeight: '20rem',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                {/* Image */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to bottom, rgba(3,5,19,0.1) 0%, rgba(3,5,19,0.5) 40%, rgba(3,5,19,0.93) 100%)',
                  }}
                />

                {/* Step badge — top left */}
                <div className="absolute top-5 left-5">
                  <span
                    className="text-[10px] tracking-[0.22em] uppercase px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: MONO,
                      color: ACC,
                      background: 'rgba(0,81,255,0.15)',
                      border: '1px solid rgba(0,81,255,0.3)',
                    }}
                  >
                    {item.num}
                  </span>
                </div>

                {/* Ghost watermark number */}
                <div
                  className="absolute -bottom-2 -right-1 leading-none select-none pointer-events-none"
                  style={{
                    fontSize: '96px',
                    fontFamily: MONO,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.06)',
                    lineHeight: 1,
                  }}
                >
                  {item.num}
                </div>

                {/* Text */}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3
                    className="text-[18px] font-semibold text-slate-50 mb-2"
                    style={{ fontFamily: SERIF, lineHeight: 1.25, letterSpacing: '-0.02em' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed line-clamp-3"
                    style={{ color: 'rgba(226,232,240,0.72)', fontFamily: SANS, fontWeight: 400 }}
                  >
                    {item.desc}
                  </p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dot indicators */}
      <div className="mt-7 flex justify-center gap-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => carouselApi?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: currentSlide === index ? '24px' : '6px',
              background: currentSlide === index ? ACC : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
