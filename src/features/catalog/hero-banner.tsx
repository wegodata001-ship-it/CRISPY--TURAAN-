"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "@/components/brand/store-image";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { getLocalizedBannerField } from "@/lib/i18n/localized-content";
import { useBanners } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import Image from "next/image";

const SLIDE_DURATION = 6000;

export function HeroBanner() {
  const t = useT();
  const { locale, dir } = useLocale();
  const { banners, loading: bannersLoading } = useBanners();
  const { settings, loading: settingsLoading } = useSettings();
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 400], [0, 60]);
  const contentY = useTransform(scrollY, [0, 400], [0, 20]);

  const next = useCallback(() => {
    if (banners.length === 0) return;
    setCurrent((p) => (p + 1) % banners.length);
    setProgress(0);
  }, [banners.length]);

  const prev = useCallback(() => {
    if (banners.length === 0) return;
    setCurrent((p) => (p - 1 + banners.length) % banners.length);
    setProgress(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length === 0 || paused) return;
    const tick = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          next();
          return 0;
        }
        return p + 100 / (SLIDE_DURATION / 50);
      });
    }, 50);
    return () => clearInterval(tick);
  }, [banners.length, paused, current, next]);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  if (bannersLoading || settingsLoading) {
    return <Skeleton className="mx-4 mt-4 h-[480px] rounded-3xl md:mx-6 md:h-[560px]" />;
  }

  const slide = banners[current];

  return (
    <section className="relative mx-4 mt-4 md:mx-6 md:mt-6">
      <div className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="relative h-[460px] sm:h-[520px] md:h-[580px] lg:h-[620px]">
          <motion.div style={{ y: imageY }} className="absolute inset-0 scale-110">
            <StoreImage
              priority
              src={settings?.storeImageUrl}
              className="absolute inset-0"
              imageClassName="object-cover object-center"
            />
          </motion.div>

          <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/95 via-dark-brown/55 to-dark-brown/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/70 via-dark-brown/20 to-transparent" />

          <div className="absolute top-4 end-4 z-10">
            <LanguageSwitcher compact className="glass rounded-full px-2 py-1" />
          </div>

          <motion.div
            style={{ y: contentY }}
            className="absolute inset-0 flex flex-col justify-end px-6 pb-12 md:px-12 md:pb-16"
          >
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full glass px-4 py-2">
                <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.75} />
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-warm-white/90">
                  {t("hero.badge")}
                </span>
              </div>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-warm-white sm:text-6xl md:text-7xl lg:text-8xl">
                {BRAND.name}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-warm-white/85 md:text-xl">
                {t("brand.taglineAlt")}
                <span className="mx-2 text-warm-white/40">·</span>
                {t("brand.tagline")}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button
                  variant="turquoise"
                  size="lg"
                  className="h-14 min-w-[160px] px-8 text-base shadow-premium"
                  onClick={scrollToMenu}
                >
                  {t("hero.orderNow")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 min-w-[160px] border-warm-white/35 bg-warm-white/10 px-8 text-base text-warm-white backdrop-blur-sm hover:bg-warm-white/20"
                  onClick={() =>
                    document.getElementById("offers")?.scrollIntoView({ behavior: "smooth" })
                  }
                >
                  {t("hero.specialOffers")}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {banners.length > 0 && slide && (
        <div
          id="offers"
          className="relative mt-5 overflow-hidden rounded-2xl shadow-soft ring-1 ring-beige-dark/15"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="relative h-52 md:h-60">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, x: dir === "rtl" ? -24 : 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir === "rtl" ? 24 : -24 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <Image
                  src={slide.mobileImage ?? slide.image}
                  alt={getLocalizedBannerField(slide, "title", locale)}
                  fill
                  className="object-cover md:hidden"
                  sizes="100vw"
                />
                <Image
                  src={slide.image}
                  alt={getLocalizedBannerField(slide, "title", locale)}
                  fill
                  className="hidden object-cover md:block"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/90 via-dark-brown/50 to-dark-brown/20" />
                <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-10">
                  <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
                    <Gift className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("hero.offers")}
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold text-warm-white md:text-3xl">
                    {getLocalizedBannerField(slide, "title", locale)}
                  </p>
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-warm-white/80">
                    {getLocalizedBannerField(slide, "subtitle", locale)}
                  </p>
                  {getLocalizedBannerField(slide, "button", locale) && (
                    <Button variant="turquoise" size="sm" className="mt-5 w-fit" onClick={scrollToMenu}>
                      {getLocalizedBannerField(slide, "button", locale)}
                    </Button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-warm-white/20">
              <motion.div
                className="h-full bg-turquoise"
                style={{ width: `${progress}%` }}
                transition={{ duration: 0.05 }}
              />
            </div>

            <div className="absolute bottom-4 start-1/2 flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`${t("hero.slide")} ${i + 1}`}
                  onClick={() => {
                    setCurrent(i);
                    setProgress(0);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === current ? "w-8 bg-turquoise" : "w-2 bg-warm-white/40 hover:bg-warm-white/60"
                  }`}
                />
              ))}
            </div>

            <div className="absolute top-1/2 end-3 flex -translate-y-1/2 gap-2 md:end-4">
              <button
                type="button"
                aria-label={t("hero.prevSlide")}
                onClick={prev}
                className="flex h-10 w-10 items-center justify-center rounded-full glass-dark text-warm-white transition-transform hover:scale-105"
              >
                <ChevronLeft className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
              </button>
              <button
                type="button"
                aria-label={t("hero.nextSlide")}
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full glass-dark text-warm-white transition-transform hover:scale-105"
              >
                <ChevronRight className="h-5 w-5 rtl:rotate-180" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
