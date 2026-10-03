"use client";

import { AppLogo } from "@/components/brand/app-logo";
import { BRAND } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";

export function HeroBanner() {
  const t = useT();

  return (
    <section className="mx-auto max-w-[1180px] px-4 pb-1 pt-3 text-center md:px-6">
      <AppLogo
        size="xl"
        href={null}
        priority
        className="mx-auto h-[72px] w-auto bg-transparent sm:h-20"
      />
      <p className="mt-2 font-display text-2xl font-bold tracking-[0.18em] text-dark-brown sm:text-3xl">
        {BRAND.name}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-turquoise sm:text-base">
        {t("brand.tagline")}
      </p>
      <h1 className="mt-2 font-display text-[1.35rem] font-bold leading-tight text-dark-brown sm:text-2xl">
        {t("hero.whatsForToday")}
      </h1>
      <p className="mt-1 text-sm text-coffee-light sm:text-base">
        {t("hero.hotOrder")}
      </p>
    </section>
  );
}
