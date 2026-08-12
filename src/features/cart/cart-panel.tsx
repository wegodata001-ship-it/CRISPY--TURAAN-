"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Pencil, Plus, Trash2, ShoppingBag, Tag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { ProductImage } from "@/components/catalog/product-image";
import { AddonsWizard } from "@/features/catalog/addons-wizard";
import { useProductBuilderConfig } from "@/hooks/useModifiers";
import { calculateLineTotal } from "@/lib/product-builder/engine";
import type { CartItem } from "@/types";
import type { ProductBuilderConfig } from "@/types/modifiers";

function CartLineItem({
  item,
  onRemove,
  onUpdateQuantity,
  onEdit,
  compact,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (qty: number) => void;
  onEdit?: (config: ProductBuilderConfig) => void;
  compact?: boolean;
}) {
  const t = useT();
  const localized = useLocalizedProduct(item.product);
  const { config: modifierConfig, loading: loadingModifiers } =
    useProductBuilderConfig(onEdit ? item.product.id : null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="border-b border-beige-dark/15 py-3 last:border-b-0"
    >
      <div className="flex items-start gap-3">
        {!compact && (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-beige/30">
            <ProductImage
              image={item.product.image}
              categoryId={item.product.categoryId}
              alt={localized.name}
              thumbnail
              sizes="56px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="heading-product text-sm" dir={localized.dir}>
              {localized.name}
            </h4>
            <div className="flex shrink-0 items-center gap-1">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (modifierConfig) onEdit(modifierConfig);
                  }}
                  disabled={loadingModifiers || !modifierConfig}
                  className="rounded-md p-1.5 text-coffee/45 transition-colors hover:bg-beige/40 hover:text-turquoise"
                  aria-label={t("cart.editItem")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                className="rounded-md p-1.5 text-coffee/35 transition-colors hover:text-red-500"
                aria-label={t("common.remove", "Remove")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-price mt-0.5 text-base">{formatPrice(item.unitPrice)}</p>
          {item.selections.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {item.selections.map((s) => (
                <li key={`${s.groupId}-${s.optionId}`} className="text-caption">
                  {s.optionName}
                  {s.quantity > 1 ? ` ×${s.quantity}` : ""}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.quantity - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white transition-colors hover:border-turquoise"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                type="button"
                onClick={() => onUpdateQuantity(item.quantity + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white transition-colors hover:border-turquoise"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <span className="text-price text-base">
              {formatPrice(calculateLineTotal(item.unitPrice, item.quantity))}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface CartPanelProps {
  compact?: boolean;
  onCheckout?: () => void;
  className?: string;
}

export function CartPanel({ compact, onCheckout, className }: CartPanelProps) {
  const t = useT();
  const {
    items,
    removeItem,
    updateQuantity,
    updateConfiguredItem,
    subtotal,
    discount,
    deliveryFee,
    total,
    itemCount,
    applyCoupon,
    couponCode,
  } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    item: CartItem;
    config: ProductBuilderConfig;
  } | null>(null);

  const handleCoupon = () => {
    if (!couponInput.trim()) return;
    const ok = applyCoupon(couponInput);
    setCouponError(ok ? null : t("error.generic", "Invalid coupon code"));
  };

  return (
    <div className={className}>
      <div className="flex shrink-0 items-center gap-2 border-b border-beige-dark/15 pb-4">
        <ShoppingBag className="h-5 w-5 text-coffee" strokeWidth={1.75} />
        <h2 className="heading-section text-lg">{t("cart.title")}</h2>
        {itemCount > 0 && (
          <span className="text-caption">({itemCount})</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center py-10 text-center"
            >
              <Logo size="md" href={null} className="h-12 w-auto opacity-80" />
              <p className="text-body mt-3">{t("cart.empty")}</p>
              <p className="text-caption mt-1">{t("cart.emptyHint")}</p>
            </motion.div>
          ) : (
            <div>
              {items.map((item) => (
                <CartLineItem
                  key={item.lineId}
                  item={item}
                  compact={compact}
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
        <div className="shrink-0 border-t border-beige-dark/15 pt-4">
          {!compact && (
            <div className="mb-3 flex gap-2">
              <Input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder={t("cart.coupon", "Coupon code")}
                className="h-9 text-sm"
              />
              <Button variant="outline" size="sm" onClick={handleCoupon} className="shrink-0">
                <Tag className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {couponError && <p className="mb-2 text-xs text-red-600">{couponError}</p>}
          {couponCode && <p className="mb-2 text-xs text-turquoise">{couponCode}</p>}

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-coffee/70">
              <span>{t("cart.subtotal")}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-turquoise">
                <span>{t("cart.discount", "Discount")}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            {deliveryFee > 0 && (
              <div className="flex justify-between text-coffee/70">
                <span>{t("cart.delivery", "Delivery")}</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-beige-dark/15 pt-2">
              <span className="font-semibold text-dark-brown">{t("cart.total")}</span>
              <span className="text-price text-xl">{formatPrice(total)}</span>
            </div>
          </div>

          <Link href="/checkout" onClick={onCheckout}>
            <Button
              variant="turquoise"
              size="lg"
              className="mt-4 h-12 w-full rounded-xl text-base transition-transform hover:scale-[1.01]"
            >
              {t("cart.checkout")}
              <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" strokeWidth={1.75} />
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
