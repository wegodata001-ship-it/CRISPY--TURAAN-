"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BRAND, getStoreImageSrc } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";
import { useSettings } from "@/hooks/useSettings";

export function HeroBanner() {
  const t = useT();
  const { settings, loading: settingsLoading } = useSettings();

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  if (settingsLoading) {
    return (
      <Skeleton className="mx-4 mt-6 h-[280px] rounded-3xl md:mx-8 md:mt-8 md:h-[480px] lg:mx-auto lg:max-w-[1400px]" />
    );
  }

  const imageSrc = getStoreImageSrc(settings?.storeImageUrl);

  return (
    <section className="mx-4 mt-6 md:mx-8 md:mt-8 lg:mx-auto lg:max-w-[1400px]">
      <div className="overflow-hidden rounded-3xl bg-warm-white shadow-soft ring-1 ring-beige-dark/10">
        <div className="grid min-h-[280px] md:min-h-[480px] lg:grid-cols-2 lg:min-h-[500px]">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-center px-6 py-10 md:px-10 md:py-12 lg:px-14"
          >
            <p className="text-caption mb-3 uppercase tracking-[0.2em] text-turquoise">
              {t("hero.badge")}
            </p>
            <h1 className="heading-display text-dark-brown">
              {settings?.storeName ?? BRAND.name}
            </h1>
            <p className="text-body mt-4 max-w-md text-base leading-relaxed md:text-lg">
              {t("brand.taglineAlt")}
              <span className="mx-2 text-coffee/30">·</span>
              {t("brand.tagline")}
            </p>
            <div className="mt-8">
              <Button
                variant="turquoise"
                size="lg"
                className="h-12 rounded-full px-8 text-base shadow-soft transition-transform hover:scale-[1.02]"
                onClick={scrollToMenu}
              >
                {t("hero.orderNow")}
                <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
              </Button>
            </div>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative min-h-[200px] lg:min-h-full"
          >
            <Image
              src={imageSrc}
              alt={settings?.storeName ?? BRAND.name}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-warm-white/20 rtl:bg-gradient-to-r" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
