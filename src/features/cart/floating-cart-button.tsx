"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { formatPrice } from "@/lib/utils";

export function FloatingCartButton() {
  const { itemCount, total, openCart } = useCart();
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin") || itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={openCart}
        className="fixed bottom-6 end-6 z-30 hidden min-h-12 items-center gap-3 rounded-2xl bg-dark-brown px-4 py-3 text-warm-white shadow-elevated transition-transform hover:scale-[1.02] lg:flex"
        aria-label={t("cart.openCart")}
      >
        <ShoppingBag className="h-5 w-5 text-turquoise" strokeWidth={1.75} />
        <span className="font-semibold">{t("cart.title")}</span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-turquoise px-1.5 text-xs font-bold">
          {itemCount}
        </span>
        <span className="border-s border-warm-white/20 ps-3 text-sm font-semibold">
          {formatPrice(total)}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
