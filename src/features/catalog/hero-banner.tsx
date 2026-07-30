"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreImage } from "@/components/brand/store-image";
import { BRAND } from "@/lib/brand";
import { useBanners } from "@/hooks/useProducts";
import Image from "next/image";

export function HeroBanner() {
  const { banners, loading } = useBanners();
  const [showPromo, setShowPromo] = useState(false);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const scrollToMenu = () => {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <Skeleton className="mx-4 mt-4 h-52 rounded-2xl md:mx-6 md:h-64 lg:h-72" />;
  }

  return (
    <div className="mx-4 mt-4 md:mx-6 md:mt-6">
      {/* Primary brand hero — store image */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl">
        <div className="relative h-52 md:h-64 lg:h-72">
          <StoreImage priority imageClassName="object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-brown/75 via-dark-brown/50 to-dark-brown/20" />
          <div className="absolute inset-0 flex flex-col items-start justify-center px-6 md:px-10">
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-medium tracking-wide text-warm-white/80 md:text-base"
            >
              {BRAND.welcome}
            </motion.p>
            <motion.h2
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-display text-3xl font-bold text-warm-white md:text-5xl tracking-wide"
            >
              {BRAND.name}
            </motion.h2>
            <motion.p
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="mt-1 text-xs tracking-widest text-turquoise-light uppercase md:text-sm"
            >
              {BRAND.tagline}
            </motion.p>
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-4"
            >
              <Button variant="turquoise" size="lg" onClick={scrollToMenu}>
                Start Order
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Promo carousel — secondary banners */}
      {banners.length > 0 && (
        <div className="relative mt-3 overflow-hidden rounded-xl">
          <button
            onClick={() => setShowPromo(!showPromo)}
            className="mb-2 text-xs font-medium text-coffee/50 hover:text-turquoise transition-colors"
          >
            {showPromo ? "Hide offers" : "View special offers"}
          </button>
          <AnimatePresence>
            {showPromo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="relative h-32 md:h-36 rounded-xl overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={banners[current]!.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={banners[current]!.image}
                        alt={banners[current]!.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 1200px"
                      />
                      <div className="absolute inset-0 bg-dark-brown/50" />
                      <div className="absolute inset-0 flex flex-col justify-center px-5">
                        <p className="text-sm font-bold text-warm-white md:text-base">
                          {banners[current]!.title}
                        </p>
                        <p className="text-xs text-warm-white/75">
                          {banners[current]!.subtitle}
                        </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 bg-dark-brown/40 text-warm-white"
                      onClick={() =>
                        setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
                      }
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="h-6 w-6 bg-dark-brown/40 text-warm-white"
                      onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
