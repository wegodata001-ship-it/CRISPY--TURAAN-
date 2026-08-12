"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, Minus, Plus, ShoppingBag, X, Share2, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice, cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
import { useProducts } from "@/hooks/useProducts";
import { useProductBuilderConfig } from "@/hooks/useModifiers";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getProductImage } from "@/lib/menu/placeholders";
import {
  calculateLineTotal,
  productHasBuilder,
  getSuggestedProducts,
} from "@/lib/product-builder/engine";
import { AddonsWizard } from "@/features/catalog/addons-wizard";
import { ProductCard } from "./product-card";
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
  onSelectProduct,
}: {
  product: Product;
  onOpenChange: (open: boolean) => void;
  onSelectProduct?: (product: Product) => void;
}) {
  const t = useT();
  const { locale } = useLocale();
  const localized = useLocalizedProduct(product);
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { products } = useProducts({ active: true });
  const { config, loading: configLoading } = useProductBuilderConfig(product.id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const hasBuilder = config ? productHasBuilder(config) : false;
  const suggestions = config ? getSuggestedProducts(config, products, locale) : [];
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

  const handleConfiguredAdd = ({
    selections,
    unitPrice,
  }: {
    selections: import("@/types/modifiers").SelectedModifier[];
    unitPrice: number;
  }) => {
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
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: localized.name,
        text: localized.description,
        url: window.location.href,
      });
    }
  };

  return (
    <>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[45%_55%]">
      <div
        className="relative h-[clamp(180px,25dvh,220px)] w-full shrink-0 overflow-hidden bg-beige/20 lg:h-full lg:min-h-0"
        onClick={() => setZoomed(!zoomed)}
      >
        <Image
          src={imageSrc}
          alt={localized.name}
          fill
          className={cn("object-cover transition-transform", zoomed && "scale-110")}
          sizes="(min-width: 1024px) 380px, 100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/60 via-transparent to-transparent" />
        <div className="absolute top-4 start-4 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            aria-label={t("catalog.favorite")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavorite(product.id) ? "fill-red-400 text-red-400" : "text-coffee/50"
              )}
              strokeWidth={1.75}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleShare();
            }}
            aria-label={t("common.share", "Share")}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft"
          >
            <Share2 className="h-4 w-4 text-coffee/50" strokeWidth={1.75} />
          </button>
        </div>
        <div className="absolute bottom-4 end-4 flex gap-2">
          {product.isPopular && <Badge variant="popular">{t("catalog.popularBadge")}</Badge>}
          {product.isNew && <Badge variant="new">{t("catalog.newBadge")}</Badge>}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-warm-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-7 lg:py-7">
          <div className="space-y-1.5">
          <h2 className="font-display text-2xl font-bold" dir={localized.dir}>
            {localized.name}
          </h2>
          <p className="text-2xl font-bold text-turquoise">{formatPrice(product.price)}</p>
        </div>

          {localized.description && (
            <p className="mt-4 text-sm leading-relaxed text-coffee/70" dir={localized.dir}>
              {localized.description}
            </p>
          )}

          <div className="mt-5 space-y-2">
          <Label className="text-sm font-medium">{t("cart.quantity")}</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label={t("cart.decreaseQuantity")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-beige-dark/30"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-lg font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label={t("cart.increaseQuantity")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-beige-dark/30"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          </div>

          <div className="mt-5">
          <Label htmlFor={`product-notes-${product.id}`} className="text-sm">
            {t("builder.notes")}
          </Label>
          <Textarea
            id={`product-notes-${product.id}`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t("builder.notesPlaceholder")}
            className="mt-1.5 min-h-[70px] max-h-[100px] resize-none rounded-xl"
          />
          </div>

          {suggestions.length > 0 && (
            <div className="mt-6 rounded-2xl border border-turquoise/20 bg-turquoise/5 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-turquoise">
                <Sparkles className="h-4 w-4" />
                {t("builder.suggestions")}
              </div>
              <div className="flex flex-col gap-2">
                {suggestions.map(({ product: sug }) => (
                  <ProductCard
                    key={sug.id}
                    product={sug}
                    onClick={() => onSelectProduct?.(sug)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-beige-dark/15 bg-warm-white px-5 py-4 lg:px-7">
          <Button
            variant="turquoise"
            size="lg"
            className="h-12 w-full rounded-xl shadow-soft"
            onClick={handleAdd}
            disabled={!product.available || configLoading}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
            {t("catalog.addToCart")} · {formatPrice(calculateLineTotal(product.price, quantity))}
          </Button>
        </div>
      </div>

    </div>

      {hasBuilder && config && (
        <AddonsWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          product={product}
          config={config}
          quantity={quantity}
          onConfirm={handleConfiguredAdd}
        />
      )}
    </>
  );
}

export function ProductDetailDrawer({
  product,
  open,
  onOpenChange,
  onSelectProduct,
}: ProductDetailDrawerProps) {
  const isMobile = useIsMobile(1024);
  const t = useT();
  const closeButton = (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      aria-label={t("common.close")}
      className="absolute top-4 end-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-warm-white/95 shadow-soft"
    >
      <X className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[min(90dvh,720px)] max-h-[90dvh] w-full max-w-full overflow-hidden">
          {closeButton}
          {product && (
            <>
              <DrawerHeader className="sr-only">
                <DrawerTitle>{product.name_he || product.name_en}</DrawerTitle>
              </DrawerHeader>
              <ProductDetailContent
                key={product.id}
                product={product}
                onOpenChange={onOpenChange}
                onSelectProduct={onSelectProduct}
              />
            </>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(620px,calc(100dvh-48px))] max-h-[calc(100dvh-48px)] w-[min(820px,calc(100vw-48px))] max-w-[820px] gap-0 overflow-hidden p-0 [&>button]:hidden">
        {closeButton}
        {product && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{product.name_he || product.name_en}</DialogTitle>
              <DialogDescription>
                {product.description_he || product.description_en}
              </DialogDescription>
            </DialogHeader>
            <ProductDetailContent
              key={product.id}
              product={product}
              onOpenChange={onOpenChange}
              onSelectProduct={onSelectProduct}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
