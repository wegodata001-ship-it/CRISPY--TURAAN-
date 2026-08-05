"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Heart, ShoppingBag, X, Share2, Sparkles } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
import { useProducts } from "@/hooks/useProducts";
import { useProductBuilderConfig } from "@/hooks/useModifiers";
import { getProductImage } from "@/lib/menu/placeholders";
import { ProductBuilder } from "@/features/catalog/product-builder";
import { productHasBuilder, getSuggestedProducts } from "@/lib/product-builder/engine";
import { ProductCard } from "./product-card";
import type { Product } from "@/types";
import type { SelectedModifier } from "@/types/modifiers";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { products } = useProducts({ active: true });
  const { config, loading: configLoading } = useProductBuilderConfig(product.id);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [unitPrice, setUnitPrice] = useState(product.price);
  const [valid, setValid] = useState(true);
  const [selections, setSelections] = useState<SelectedModifier[]>([]);
  const [zoomed, setZoomed] = useState(false);

  const hasBuilder = config ? productHasBuilder(config) : false;
  const suggestions = config ? getSuggestedProducts(config, products, locale) : [];
  const imageSrc = getProductImage(product.image, product.categoryId);

  const handleAdd = () => {
    if (!product.available || (hasBuilder && !valid)) return;
    addItem(product, {
      selections: hasBuilder ? selections : [],
      unitPrice,
      notes: notes.trim() || undefined,
      quantity,
    });
    openCart();
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
    <div className="overflow-y-auto pb-8">
      <div
        className={cn(
          "relative w-full overflow-hidden transition-all",
          zoomed ? "aspect-square" : "aspect-[16/10]"
        )}
        onClick={() => setZoomed(!zoomed)}
      >
        <Image
          src={imageSrc}
          alt={localized.name}
          fill
          className={cn("object-cover transition-transform", zoomed && "scale-110")}
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/60 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label={t("common.close")}
          className="absolute top-4 end-4 flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
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

      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-bold" dir={localized.dir}>
            {localized.name}
          </h2>
          {!hasBuilder && (
            <p className="text-2xl font-bold text-turquoise">{formatPrice(product.price)}</p>
          )}
        </div>

        {configLoading && hasBuilder === false && (
          <Skeleton className="mt-4 h-24 w-full rounded-xl" />
        )}

        {hasBuilder && config ? (
          <div className="mt-4">
            <ProductBuilder
              product={product}
              config={config}
              quantity={quantity}
              onQuantityChange={setQuantity}
              notes={notes}
              onNotesChange={setNotes}
              onUnitPriceChange={setUnitPrice}
              onValidChange={setValid}
              onSelectionsChange={setSelections}
            />
          </div>
        ) : (
          !configLoading && (
            <>
              {localized.description && (
                <p className="mt-4 text-sm leading-relaxed text-coffee/70" dir={localized.dir}>
                  {localized.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4">
                <p className="text-sm font-medium">{t("cart.quantity")}</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-lg font-bold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  >
                    +
                  </button>
                </div>
              </div>
            </>
          )
        )}

        <Button
          variant="turquoise"
          size="lg"
          className="mt-6 w-full"
          onClick={handleAdd}
          disabled={!product.available || (hasBuilder && !valid)}
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
          {t("catalog.addToCart")} · {formatPrice(unitPrice * quantity)}
        </Button>

        {suggestions.length > 0 && (
          <div className="mt-8 rounded-2xl border border-turquoise/20 bg-turquoise/5 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-turquoise">
              <Sparkles className="h-4 w-4" />
              {t("builder.suggestions")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {suggestions.map(({ product: sug, message }) => (
                <ProductCard
                  key={sug.id}
                  product={sug}
                  compact
                  onClick={() => onSelectProduct?.(sug)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProductDetailDrawer({
  product,
  open,
  onOpenChange,
  onSelectProduct,
}: ProductDetailDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
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
