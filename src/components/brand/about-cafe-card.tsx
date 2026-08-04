"use client";

import { motion } from "framer-motion";
import { StoreImage } from "@/components/brand/store-image";
import { useT } from "@/components/providers/locale-provider";

export function AboutCafeCard() {
  const t = useT();

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mx-4 mb-6 md:mx-6"
    >
      <div className="overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/10">
        <div className="flex flex-col sm:flex-row">
          <StoreImage
            className="relative h-40 sm:h-auto sm:w-48 shrink-0"
            imageClassName="object-cover object-center"
            sizes="(max-width: 640px) 100vw, 192px"
          />
          <div className="flex flex-col justify-center p-5">
            <h3 className="font-display text-lg font-bold text-dark-brown">{t("about.title")}</h3>
            <p className="mt-1 text-sm leading-relaxed text-coffee/70">{t("about.description")}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-turquoise">{t("brand.tagline")}</p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
