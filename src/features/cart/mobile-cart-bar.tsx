"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { formatPrice } from "@/lib/utils";

export function MobileCartBar() {
  const { itemCount, total, openCart } = useCart();
  const pathname = usePathname();
  const t = useT();

  if (pathname.startsWith("/admin") || pathname.startsWith("/checkout")) return null;

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.5rem)] left-0 right-0 z-[90] px-4 lg:hidden"
        >
          <div className="mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-dark-brown px-4 py-3 shadow-elevated">
            <button
              type="button"
              onClick={openCart}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-turquoise/20"
              aria-label={t("cart.openCart")}
            >
              <ShoppingBag className="h-5 w-5 text-warm-white" strokeWidth={1.75} />
              <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[10px] font-bold text-warm-white">
                {itemCount}
              </span>
            </button>
            <button
              type="button"
              onClick={openCart}
              className="min-w-0 flex-1 text-start"
            >
              <p className="text-xs text-warm-white/70">{t("cart.title")}</p>
              <p className="text-price text-lg text-warm-white">{formatPrice(total)}</p>
            </button>
            <Link
              href="/checkout"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-turquoise px-4 py-2.5 text-sm font-semibold text-warm-white transition-transform hover:scale-[1.02]"
            >
              {t("cart.checkout")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
