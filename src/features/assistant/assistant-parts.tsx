"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Minus, Trash2, ShoppingBag, X, Star, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
import { calculateLineTotal } from "@/lib/product-builder/engine";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useAssistantCart } from "@/features/assistant/assistant-context";
import { getProductImage } from "@/lib/menu/placeholders";
import type { AssistantProduct } from "@/lib/assistant/types";
import type { Product } from "@/types";

export function AssistantAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-8 w-8 text-xs", md: "h-11 w-11 text-sm", lg: "h-14 w-14 text-base" };
  return (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-turquoise to-turquoise-light font-display font-bold text-warm-white shadow-md`}
      aria-hidden
    >
      M
    </div>
  );
}

export function AssistantTypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-beige/50 px-4 py-3">
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

export function AssistantProductCard({
  product,
  onAdd,
  onSelect,
  compact,
}: {
  product: AssistantProduct;
  onAdd: () => void;
  onSelect?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const imageSrc = getProductImage(product.image, product.categoryId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 rounded-2xl border border-beige-dark/20 bg-warm-white/90 p-2.5 shadow-soft",
        compact && "p-2"
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-beige/50"
        aria-label={t("assistant.viewProduct")}
      >
        {imageSrc ? (
          <Image src={imageSrc} alt={product.name} fill unoptimized={imageSrc.includes("firebasestorage")} className="object-cover" sizes="64px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-coffee/20" strokeWidth={1.5} /></div>
        )}
        {product.isPopular && (
          <span className="absolute bottom-0.5 start-0.5 rounded bg-gold/90 px-1 py-0.5">
            <Star className="h-2.5 w-2.5 text-warm-white" strokeWidth={2} fill="currentColor" />
          </span>
        )}
        {product.isNew && (
          <span className="absolute top-0.5 end-0.5 rounded bg-turquoise px-1 py-0.5">
            <Sparkles className="h-2.5 w-2.5 text-warm-white" strokeWidth={2} />
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <button type="button" onClick={onSelect} className="text-start">
          <p className="truncate text-sm font-semibold text-dark-brown">{product.name}</p>
          {!compact && product.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-coffee/55">{product.description}</p>
          )}
          <p className="mt-1 text-xs font-bold text-turquoise">{formatPrice(product.price)}</p>
        </button>
        <Button
          size="sm"
          onClick={onAdd}
          disabled={!product.available}
          className="mt-1.5 h-8 w-full gap-1 rounded-xl bg-turquoise text-xs hover:bg-turquoise-light"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("catalog.addToCart")}
        </Button>
      </div>
    </motion.div>
  );
}

export function AssistantProductDetail({
  product,
  onClose,
  onAdd,
}: {
  product: AssistantProduct;
  onClose: () => void;
  onAdd: (qty: number) => void;
}) {
  const t = useT();
  const [qty, setQty] = useState(1);
  const imageSrc = getProductImage(product.image, product.categoryId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-2xl border border-beige-dark/25 bg-warm-white p-3 shadow-soft"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
          {t("assistant.productDetails")}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-lg p-1 text-coffee/50 hover:bg-beige/60"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
      <div className="relative mt-2 aspect-[16/10] overflow-hidden rounded-xl bg-beige/30">
        {imageSrc ? (
          <Image src={imageSrc} alt={product.name} fill unoptimized={imageSrc.includes("firebasestorage")} className="object-cover" sizes="360px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-8 w-8 text-coffee/20" strokeWidth={1.5} /></div>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-dark-brown">{product.name}</h3>
      {product.categoryName && <p className="text-xs text-coffee/45">{product.categoryName}</p>}
      <p className="mt-2 text-xl font-bold text-turquoise">{formatPrice(product.price)}</p>
      {product.description && (
        <p className="mt-2 text-sm leading-relaxed text-coffee/65">{product.description}</p>
      )}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium">{t("cart.quantity")}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            aria-label={t("cart.decrease")}
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
          <span className="w-6 text-center font-bold">{qty}</span>
          <button
            type="button"
            onClick={() => setQty(qty + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border"
            aria-label={t("cart.increase")}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
      <Button
        variant="turquoise"
        className="mt-4 w-full"
        disabled={!product.available}
        onClick={() => onAdd(qty)}
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
        {t("catalog.addToCart")} · {formatPrice(product.price * qty)}
      </Button>
    </motion.div>
  );
}

function CartLine({ item }: { item: import("@/types").CartItem }) {
  const t = useT();
  const localized = useLocalizedProduct(item.product);
  const { removeItem, updateQuantity } = useAssistantCart();
  const imageSrc = getProductImage(item.product.image, item.product.categoryId);

  return (
    <div className="flex gap-3 rounded-xl border border-beige-dark/20 bg-warm-white/80 p-2.5">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-beige/30">
        {imageSrc ? (
          <Image src={imageSrc} alt={localized.name} fill unoptimized={imageSrc.includes("firebasestorage")} className="object-cover" sizes="48px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-coffee/20" strokeWidth={1.5} /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" dir={localized.dir}>
          {localized.name}
        </p>
        <p className="text-xs text-turquoise">
          {formatPrice(calculateLineTotal(item.unitPrice, item.quantity))}
        </p>
        {item.selections.length > 0 && (
          <p className="truncate text-[10px] text-coffee/45">
            {item.selections.map((s) => s.optionName).join(", ")}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateQuantity(item.lineId, item.quantity - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-beige/60"
            aria-label={t("cart.decrease")}
          >
            <Minus className="h-3 w-3" strokeWidth={1.75} />
          </button>
          <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
          <button
            type="button"
            onClick={() => updateQuantity(item.lineId, item.quantity + 1)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-beige/60"
            aria-label={t("cart.increase")}
          >
            <Plus className="h-3 w-3" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => removeItem(item.lineId)}
            className="ms-auto flex h-7 w-7 items-center justify-center rounded-lg text-coffee/45 hover:text-coffee"
            aria-label={t("cart.remove")}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssistantCartPanel({ onCheckout }: { onCheckout: () => void }) {
  const t = useT();
  const { items, subtotal, itemCount } = useAssistantCart();

  if (itemCount === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-beige-dark/30 py-8 text-center">
        <ShoppingBag className="h-8 w-8 text-coffee/30" strokeWidth={1.75} />
        <p className="text-sm text-coffee/55">{t("cart.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CartLine key={item.lineId} item={item} />
      ))}
      <div className="flex items-center justify-between rounded-xl bg-beige/40 px-3 py-2">
        <span className="text-sm font-medium text-coffee">
          {t("cart.total")} ({itemCount})
        </span>
        <span className="font-display font-bold text-turquoise">{formatPrice(subtotal)}</span>
      </div>
      <Button variant="turquoise" className="w-full" onClick={onCheckout}>
        {t("cart.checkout")}
      </Button>
    </div>
  );
}
