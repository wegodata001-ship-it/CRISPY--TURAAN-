"use client";

import { BRAND } from "@/lib/brand";
import { PAUSE_COPY } from "@/lib/store-pause";
import { useLocale } from "@/components/providers/locale-provider";

export function StorePauseScreen({ reason }: { reason?: string }) {
  const { locale } = useLocale();
  const copy = PAUSE_COPY[locale] ?? PAUSE_COPY.ar;
  const note = reason?.trim();

  return (
    <section className="flex min-h-dvh items-center justify-center bg-[#FFF4E2] px-6 py-16 text-center">
      <div className="mx-auto w-full max-w-md">
        <img
          src={BRAND.logo}
          alt="CRISPY"
          className="mx-auto h-28 w-auto object-contain"
        />
        <p className="mt-6 text-xs font-semibold tracking-[0.28em] text-[#D71920]">CRISPY</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-[#171717] sm:text-4xl">
          {copy.title}
        </h1>
        {note ? (
          <p className="mx-auto mt-5 inline-flex rounded-full bg-[#F6B800]/35 px-4 py-1.5 text-sm font-semibold text-[#171717]">
            {note}
          </p>
        ) : null}
        <p className="mt-5 text-base leading-relaxed text-[#6B625A]">{copy.body}</p>
      </div>
    </section>
  );
}
