"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "@/components/brand/store-image";
import { BRAND } from "@/lib/brand";
import { useBanners } from "@/hooks/useProducts";
import Image from "next/image";

export function HeroBanner() {
  const { banners, loading } = useBanners();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <Skeleton className="mx-4 mt-4 h-[420px] rounded-3xl md:mx-6" />;
  }

  return (
    <section className="relative mx-4 mt-4 md:mx-6 md:mt-6">
      <div className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="relative h-[420px] md:h-[520px] lg:h-[560px]">
          <StoreImage priority imageClassName="object-cover object-center scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-dark-brown via-dark-brown/60 to-dark-brown/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/70 via-transparent to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-10 md:px-12 md:pb-14">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-warm-white/15 px-4 py-1.5 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5 text-gold" />
                <span className="text-xs font-medium tracking-widest text-warm-white/90 uppercase">
                  Premium Café Experience
                </span>
              </div>
              <h1 className="font-display text-4xl font-bold text-warm-white md:text-6xl lg:text-7xl">
                {BRAND.name}
              </h1>
              <p className="mt-2 max-w-md text-sm text-warm-white/80 md:text-lg">
                {BRAND.taglineAlt} — {BRAND.tagline}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button variant="turquoise" size="lg" onClick={scrollToMenu}>
                  Order Now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-warm-white/40 bg-warm-white/10 text-warm-white backdrop-blur-sm hover:bg-warm-white/20"
                  onClick={() =>
                    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  Special Offers
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {banners.length > 0 && (
        <div id="offers" className="relative mt-4 overflow-hidden rounded-2xl shadow-soft">
          <div className="relative h-44 md:h-52">
            <AnimatePresence mode="wait">
              <motion.div
                key={banners[current]!.id}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0"
              >
                {banners[current]!.mobileImage ? (
                  <>
                    <Image
                      src={banners[current]!.mobileImage!}
                      alt={banners[current]!.title}
                      fill
                      className="object-cover md:hidden"
                      sizes="100vw"
                    />
                    <Image
                      src={banners[current]!.image}
                      alt={banners[current]!.title}
                      fill
                      className="hidden object-cover md:block"
                      sizes="100vw"
                    />
                  </>
                ) : (
                  <Image
                    src={banners[current]!.image}
                    alt={banners[current]!.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/80 via-dark-brown/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
                  <p className="text-xs font-medium tracking-widest text-gold uppercase">
                    Special Offer
                  </p>
                  <p className="mt-1 text-xl font-bold text-warm-white md:text-2xl">
                    {banners[current]!.title}
                  </p>
                  <p className="mt-1 text-sm text-warm-white/75">
                    {banners[current]!.subtitle}
                  </p>
                  {banners[current]!.cta && (
                    <Button
                      variant="turquoise"
                      size="sm"
                      className="mt-3 w-fit"
                      onClick={() => {
                        const url = banners[current]!.ctaUrl;
                        if (url?.startsWith("#")) {
                          document.getElementById(url.slice(1))?.scrollIntoView({ behavior: "smooth" });
                        } else if (url) {
                          window.open(url, "_blank");
                        } else {
                          scrollToMenu();
                        }
                      }}
                    >
                      {banners[current]!.cta}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 bg-dark-brown/50 text-warm-white backdrop-blur-sm"
                onClick={() =>
                  setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
                }
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8 bg-dark-brown/50 text-warm-white backdrop-blur-sm"
                onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
