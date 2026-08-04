"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "@/components/brand/store-image";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";
import { useBanners } from "@/hooks/useProducts";
import Image from "next/image";

export function HeroBanner() {
  const t = useT();
  const { banners, loading } = useBanners();
  const [current, setCurrent] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const fadeTimer = setInterval(() => setFade((f) => !f), 4000);
    return () => clearInterval(fadeTimer);
  }, []);

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
    return <Skeleton className="mx-4 mt-4 h-[560px] rounded-3xl md:mx-6" />;
  }

  return (
    <section className="relative mx-4 mt-4 md:mx-6 md:mt-6">
      <div className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="relative h-[520px] md:h-[560px] lg:h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={fade ? "a" : "b"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-0"
            >
              <StoreImage priority imageClassName="object-cover object-center scale-105" />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-dark-brown via-dark-brown/65 to-dark-brown/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/75 via-dark-brown/20 to-transparent" />

          <div className="absolute top-4 end-4 z-10">
            <LanguageSwitcher compact className="rounded-full border border-warm-white/20 bg-warm-white/10 px-2 py-1 backdrop-blur-md" />
          </div>

          <div className="absolute inset-0 flex flex-col justify-end px-6 pb-12 md:px-12 md:pb-16">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-warm-white/20 bg-warm-white/10 px-4 py-2 backdrop-blur-md">
                <Sparkles className="h-4 w-4 text-gold" />
                <span className="text-xs font-semibold tracking-[0.2em] text-warm-white/90 uppercase">
                  {t("hero.badge")}
                </span>
              </div>
              <h1 className="font-display text-5xl font-bold tracking-tight text-warm-white md:text-6xl lg:text-7xl">
                {BRAND.name}
              </h1>
              <p className="mt-3 max-w-lg text-base text-warm-white/85 md:text-xl">
                {t("brand.taglineAlt")} — {t("brand.tagline")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="turquoise" size="lg" className="h-12 px-8 text-base shadow-lg" onClick={scrollToMenu}>
                  {t("hero.orderNow")}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 border-warm-white/40 bg-warm-white/10 px-8 text-base text-warm-white backdrop-blur-sm hover:bg-warm-white/20"
                  onClick={() =>
                    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t("hero.specialOffers")}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {banners.length > 0 && (
        <div id="offers" className="relative mt-4 overflow-hidden rounded-2xl shadow-soft">
          <div className="relative h-48 md:h-56">
            <AnimatePresence mode="wait">
              <motion.div
                key={banners[current]!.id}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55 }}
                className="absolute inset-0"
              >
                <Image
                  src={banners[current]!.mobileImage ?? banners[current]!.image}
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
                <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/85 via-dark-brown/45 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
                  <p className="text-xs font-bold tracking-widest text-gold uppercase">🎁 {t("hero.offers")}</p>
                  <p className="mt-1 text-2xl font-bold text-warm-white md:text-3xl" dir="rtl">
                    {banners[current]!.title}
                  </p>
                  <p className="mt-1 text-sm text-warm-white/80" dir="rtl">
                    {banners[current]!.subtitle}
                  </p>
                  {banners[current]!.cta && (
                    <Button variant="turquoise" size="sm" className="mt-4 w-fit" onClick={scrollToMenu}>
                      {banners[current]!.cta}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" className="h-8 w-8 bg-dark-brown/50 text-warm-white backdrop-blur-sm" onClick={() => setCurrent((p) => (p - 1 + banners.length) % banners.length)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="h-8 w-8 bg-dark-brown/50 text-warm-white backdrop-blur-sm" onClick={() => setCurrent((p) => (p + 1) % banners.length)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
