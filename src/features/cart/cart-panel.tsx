"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { CouponEntry } from "@/features/cart/coupon-entry";
import { ProductImage } from "@/components/catalog/product-image";
import { AddonsWizard } from "@/features/catalog/addons-wizard";
import { useProductAddonConfig } from "@/features/catalog/catalog-modifier-preview-context";
import { calculateLineTotal } from "@/lib/product-builder/engine";
import type { CartItem } from "@/types";
import type { ProductBuilderConfig } from "@/types/modifiers";

function CartLineItem({
  item,
  onRemove,
  onUpdateQuantity,
  onEdit,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
  onEdit?: (config: ProductBuilderConfig) => void;
}) {
  const t = useT();
  const localized = useLocalizedProduct(item.product);
  const extras = item.selections.map((selection) => selection.optionName).join(" · ");
  const { config: modifierConfig, loading: loadingModifiers } =
    useProductAddonConfig(onEdit ? item.product.id : null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-[18px] border border-beige-dark bg-warm-white p-3"
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream">
          <ProductImage
            image={item.product.image}
            categoryId={item.product.categoryId}
            alt={localized.name}
            thumbnail
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-dark-brown" dir={localized.dir}>
            {localized.name}
          </h4>
          {extras && <p className="mt-0.5 text-xs text-coffee-light">{extras}</p>}
          {item.notes && <p className="mt-0.5 text-xs text-coffee-light">{item.notes}</p>}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.quantity - 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-dark"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.quantity + 1)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-dark"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <span className="text-base font-bold tabular-nums">
              {formatPrice(calculateLineTotal(item.unitPrice, item.quantity))}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {onEdit ? (
          <button
            type="button"
            onClick={() => {
              if (modifierConfig) onEdit(modifierConfig);
            }}
            disabled={loadingModifiers || !modifierConfig}
            className="text-xs font-semibold text-turquoise"
          >
            {t("cart.editItem")}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-xs font-semibold text-coffee-light"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t("cart.remove")}
        </button>
      </div>
    </motion.div>
  );
}

interface CartPanelProps {
  compact?: boolean;
  onCheckout?: () => void;
  className?: string;
}

export function CartPanel({ onCheckout, className }: CartPanelProps) {
  const t = useT();
  const {
    items,
    removeItem,
    updateQuantity,
    updateConfiguredItem,
    subtotal,
    discount,
    total,
    itemCount,
  } = useCart();
  const extrasTotal = items.reduce(
    (sum, item) => sum + Math.max(0, item.unitPrice - item.product.price) * item.quantity,
    0
  );
  const baseSubtotal = Math.max(0, subtotal - extrasTotal);
  const [editing, setEditing] = useState<{
    item: CartItem;
    config: ProductBuilderConfig;
  } | null>(null);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="shrink-0 border-b border-beige-dark/20 pb-4">
        <h2 className="font-display text-xl font-bold text-dark-brown">{t("cart.title")}</h2>
        {itemCount > 0 && (
          <p className="mt-0.5 text-sm text-coffee-light">
            {itemCount} {t("catalog.productsCount")}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center px-2 py-6 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF4E2] text-[#D71920]">
                <ShoppingBag className="h-7 w-7" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-bold text-[#171717]">{t("cart.empty")}</p>
              <p className="mt-1 text-xs leading-relaxed text-[#70665D]">{t("cart.emptyHint")}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <CartLineItem
                  key={item.lineId}
                  item={item}
                  onRemove={() => removeItem(item.lineId)}
                  onUpdateQuantity={(qty) => updateQuantity(item.lineId, qty)}
                  onEdit={
                    item.configurable || item.selections.length > 0
                      ? (config) => setEditing({ item, config })
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {items.length > 0 && (
        <div className="shrink-0 border-t border-beige-dark/20 pt-4">
          <h3 className="text-sm font-bold">{t("cart.summary")}</h3>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex justify-between text-coffee-light">
              <span>{t("cart.subtotal")}</span>
              <span>{formatPrice(baseSubtotal)}</span>
            </div>
            {extrasTotal > 0 && (
              <div className="flex justify-between text-coffee-light">
                <span>{t("cart.extras")}</span>
                <span>{formatPrice(extrasTotal)}</span>
              </div>
            )}
            <CouponEntry />
            {discount > 0 && (
              <div className="flex justify-between text-turquoise">
                <span>{t("cart.discount")}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between border-t border-beige-dark/20 pt-2">
              <span className="text-base font-bold">{t("cart.total")}</span>
              <span className="text-2xl font-bold tabular-nums text-dark-brown">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          <Link href="/checkout" onClick={onCheckout}>
            <Button variant="turquoise" size="lg" className="mt-4 h-12 w-full rounded-2xl text-base font-bold">
              {t("cart.checkout")}
            </Button>
          </Link>
        </div>
      )}

      {editing && (
        <AddonsWizard
          open
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setEditing(null);
          }}
          product={editing.item.product}
          config={editing.config}
          quantity={editing.item.quantity}
          initialSelections={editing.item.selections}
          mode="edit"
          onConfirm={({ selections, unitPrice }) => {
            updateConfiguredItem(editing.item.lineId, {
              selections,
              unitPrice,
              quantity: editing.item.quantity,
              notes: editing.item.notes,
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
