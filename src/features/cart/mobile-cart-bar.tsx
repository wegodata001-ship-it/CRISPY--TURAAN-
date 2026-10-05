"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useHideCustomerChrome } from "@/hooks/useAdminPath";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";
import { formatPrice } from "@/lib/utils";

export function MobileCartBar() {
  const { itemCount, total, openCart } = useCart();
  const pathname = usePathname();
  const hideChrome = useHideCustomerChrome();
  const t = useT();

  if (hideChrome || pathname.startsWith("/checkout")) return null;

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-[calc(var(--mobile-bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.4rem)] left-0 right-0 z-[90] px-3 lg:hidden"
        >
          <button
            type="button"
            onClick={openCart}
            className="mx-auto flex w-full max-w-lg flex-col items-center rounded-[18px] bg-[#D71920] px-4 py-3 text-white shadow-elevated"
          >
            <span className="flex w-full items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
                <ShoppingBag className="h-5 w-5 shrink-0" strokeWidth={2} />
                {t("cart.viewOrder")}
              </span>
              <span className="shrink-0 text-xl font-bold tabular-nums">{formatPrice(total)}</span>
            </span>
            <span className="mt-0.5 text-sm font-semibold text-white/90">
              {itemCount} {t("catalog.productsCount")}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
