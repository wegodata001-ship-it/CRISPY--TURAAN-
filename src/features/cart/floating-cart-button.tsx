"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/features/cart/cart-context";

export function FloatingCartButton() {
  const { itemCount, openCart } = useCart();
  const pathname = usePathname();

  if (pathname.startsWith("/admin") || itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={openCart}
        className="fixed bottom-56 end-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-turquoise text-warm-white shadow-elevated md:bottom-6 md:end-[11rem]"
        aria-label="Open cart"
      >
        <ShoppingBag className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-dark-brown text-[10px] font-bold">
          {itemCount}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
