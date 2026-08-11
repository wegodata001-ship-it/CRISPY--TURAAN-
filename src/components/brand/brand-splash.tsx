"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND, BLUR, getLogoSrc } from "@/lib/brand";
import { useSettings } from "@/hooks/useSettings";

export function BrandSplash() {
  const pathname = usePathname();
  const { settings } = useSettings();
  const [visible, setVisible] = useState(true);
  const [src, setSrc] = useState(() => getLogoSrc(settings?.logoUrl));

  useEffect(() => {
    setSrc(getLogoSrc(settings?.logoUrl));
  }, [settings?.logoUrl]);

  const handleError = useCallback(() => {
    setSrc((current) => (current === BRAND.logo ? current : BRAND.logo));
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (pathname.startsWith("/admin")) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center"
          >
            <Image
              src={src}
              alt={settings?.storeName ?? BRAND.name}
              width={160}
              height={180}
              priority
              placeholder="blur"
              blurDataURL={BLUR.logo}
              onError={handleError}
              className="h-auto w-32 object-contain md:w-36"
            />
            <p className="mt-4 font-display text-sm tracking-[0.25em] text-coffee/50 uppercase">
              {settings?.storeName ?? BRAND.name}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="relative mt-10 h-10 w-10"
            aria-hidden
          >
            <div className="absolute inset-0 rounded-full border-2 border-beige-dark/30" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-turquoise" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
