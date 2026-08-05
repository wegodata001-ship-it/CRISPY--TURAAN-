"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "@/components/brand/store-image";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";
import { useSettings } from "@/hooks/useSettings";

export function HeroBanner() {
  const t = useT();
  const { settings, loading: settingsLoading } = useSettings();
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 400], [0, 60]);
  const contentY = useTransform(scrollY, [0, 400], [0, 20]);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  if (settingsLoading) {
    return <Skeleton className="mx-4 mt-4 h-[420px] rounded-3xl md:mx-6 md:h-[480px]" />;
  }

  return (
    <section className="relative mx-4 mt-4 md:mx-6 md:mt-6">
      <div className="relative overflow-hidden rounded-3xl shadow-elevated">
        <div className="relative h-[380px] sm:h-[420px] md:h-[460px]">
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
            className="absolute inset-0 flex flex-col justify-end px-6 pb-10 md:px-12 md:pb-14"
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
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-warm-white sm:text-6xl md:text-7xl">
                {BRAND.name}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-warm-white/85 md:text-xl">
                {t("brand.taglineAlt")}
                <span className="mx-2 text-warm-white/40">·</span>
                {t("brand.tagline")}
              </p>
              <div className="mt-8">
                <Button
                  variant="turquoise"
                  size="lg"
                  className="h-14 min-w-[160px] px-8 text-base shadow-premium"
                  onClick={scrollToMenu}
                >
                  {t("hero.orderNow")}
                  <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
