"use client";

import { AppLogo } from "@/components/brand/app-logo";
import { BRAND } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";

export function HeroBanner() {
  const t = useT();

  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-1 pt-2 text-center md:px-6">
      <AppLogo
        size="lg"
        href={null}
        priority
        className="mx-auto h-14 w-auto bg-transparent sm:h-16"
      />
      <p className="mt-1 font-display text-xl font-bold tracking-[0.16em] text-[#171717] sm:text-2xl">
        {BRAND.name}
      </p>
      <p className="text-sm font-semibold text-[#D71920]">{t("brand.tagline")}</p>
      <h1 className="mt-1.5 font-display text-lg font-bold leading-tight text-[#171717] sm:text-xl">
        {t("hero.whatsForToday")}
      </h1>
      <p className="mt-0.5 text-sm text-[#70665D]">{t("hero.hotOrder")}</p>
    </section>
  );
}
