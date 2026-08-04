"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import type { AiMenuProduct } from "@/lib/ai/types";

export function AiProductCard({
  product,
  onAdd,
}: {
  product: AiMenuProduct;
  onAdd: () => void;
}) {
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 rounded-2xl border border-beige-dark/20 bg-warm-white/80 p-2.5 dark:border-white/10 dark:bg-white/5"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-beige/50">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xl">☕</div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="truncate text-sm font-semibold text-dark-brown dark:text-warm-white">
            {product.name}
          </p>
          <p className="text-xs font-medium text-turquoise">{formatPrice(product.price)}</p>
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          disabled={!product.available}
          className="mt-1 h-8 w-full gap-1 rounded-xl bg-turquoise text-xs hover:bg-turquoise-light"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("catalog.addToCart")}
        </Button>
      </div>
    </motion.div>
  );
}

export function AiTypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-beige/50 px-4 py-3 dark:bg-white/10">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-2 w-2 rounded-full bg-turquoise/70"
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function AiAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-sm", md: "h-11 w-11 text-base", lg: "h-14 w-14 text-xl" };
  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-turquoise to-turquoise-light font-display font-bold text-warm-white shadow-md`}
      aria-hidden
    >
      M
    </div>
  );
}

export function AiEmptyCartHint() {
  return <ShoppingBag className="h-4 w-4 text-coffee/40" aria-hidden />;
}
