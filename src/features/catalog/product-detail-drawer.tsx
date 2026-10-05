"use client";

import { useState } from "react";
import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useProductBuilderConfig } from "@/hooks/useModifiers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getProductImage } from "@/lib/menu/placeholders";
import { calculateLineTotal, productHasBuilder } from "@/lib/product-builder/engine";
import { AddonsWizard } from "@/features/catalog/addons-wizard";
import type { Product } from "@/types";

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectProduct?: (product: Product) => void;
}

function ProductDetailContent({
  product,
  onOpenChange,
}: {
  product: Product;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const { addItem } = useCart();
  const { config, loading: configLoading } = useProductBuilderConfig(product.id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const hasBuilder = config ? productHasBuilder(config) : false;
  const imageSrc = getProductImage(product.image, product.categoryId);

  const handleAdd = () => {
    if (!product.available || configLoading) return;
    if (hasBuilder && config) {
      setWizardOpen(true);
      return;
    }
    addItem(product, {
      selections: [],
      unitPrice: product.price,
      notes: notes.trim() || undefined,
      quantity,
    });
    onOpenChange(false);
    setQuantity(1);
    setNotes("");
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-white">
        <div className="relative h-[220px] w-full shrink-0 overflow-hidden bg-[#FFF4E2] sm:h-[280px]">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={localized.name}
              fill
              unoptimized={imageSrc.includes("firebasestorage")}
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF4E2] via-[#FFE8C7] to-[#F6B800]/25">
              <span className="font-display text-2xl font-bold tracking-[0.18em] text-[#D71920]/80">
                CRISPY
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
          <h2 className="font-display text-2xl font-bold text-dark-brown" dir={localized.dir}>
            {localized.name}
          </h2>
          {localized.description && (
            <p className="mt-2 text-[15px] leading-relaxed text-coffee-light" dir={localized.dir}>
              {localized.description}
            </p>
          )}
          <p className="mt-3 text-2xl font-bold text-dark-brown">{formatPrice(product.price)}</p>

          {hasBuilder && (
            <p className="mt-4 rounded-xl bg-cream px-3 py-2 text-sm text-coffee-light">
              {t("catalog.sizesAndExtras")}
            </p>
          )}

          <div className="mt-5">
            <Label htmlFor={`product-notes-${product.id}`} className="text-sm font-bold">
              {t("builder.notes")}
            </Label>
            <Textarea
              id={`product-notes-${product.id}`}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={t("builder.notesPlaceholder")}
              className="mt-1.5 min-h-[84px] resize-none rounded-xl"
            />
          </div>

          <div className="mt-5">
            <Label className="text-sm font-bold">{t("cart.quantity")}</Label>
            <div className="mt-2 flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label={t("cart.decreaseQuantity")}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-beige-dark"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-xl font-bold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                aria-label={t("cart.increaseQuantity")}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-beige-dark"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-beige-dark/20 bg-warm-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            variant="turquoise"
            size="lg"
            className="h-14 w-full rounded-2xl bg-[#D71920] text-base font-bold hover:bg-[#B51218]"
            onClick={handleAdd}
            disabled={!product.available || configLoading}
          >
            {t("catalog.addToCart")} • {formatPrice(calculateLineTotal(product.price, quantity))}
          </Button>
        </div>
      </div>

      {hasBuilder && config && (
        <AddonsWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          product={product}
          config={config}
          quantity={quantity}
          onConfirm={({ selections, unitPrice }) => {
            addItem(product, {
              selections,
              unitPrice,
              notes: notes.trim() || undefined,
              quantity,
              configurable: true,
            });
            setWizardOpen(false);
            onOpenChange(false);
            setQuantity(1);
            setNotes("");
          }}
        />
      )}
    </>
  );
}

export function ProductDetailDrawer({
  product,
  open,
  onOpenChange,
}: ProductDetailDrawerProps) {
  const isPhone = useIsMobile(768);
  const t = useT();

  const closeButton = (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      aria-label={t("common.close")}
      className="absolute top-3 end-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-[#171717]/80 text-white shadow-soft"
    >
      <X className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );

  const body = product ? (
    <>
      <DialogHeader className="sr-only">
        <DialogTitle>{product.name_he || product.name_en}</DialogTitle>
        <DialogDescription>
          {product.description_he || product.description_en}
        </DialogDescription>
      </DialogHeader>
      <ProductDetailContent key={product.id} product={product} onOpenChange={onOpenChange} />
    </>
  ) : null;

  if (isPhone) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          layout="custom"
          className={cn(
            "fixed inset-x-0 bottom-0 top-auto flex max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[24px] border-0 p-0 shadow-elevated",
            "[&>button]:hidden"
          )}
          style={{ backgroundColor: "#FFFFFF" }}
        >
          {closeButton}
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(900px,calc(100dvh-32px))] w-[min(640px,calc(100vw-32px))] max-w-[640px] gap-0 overflow-hidden p-0 [&>button]:hidden"
        )}
      >
        {closeButton}
        {body}
      </DialogContent>
    </Dialog>
  );
}
