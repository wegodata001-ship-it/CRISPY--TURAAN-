"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingBag, X, Minus, Plus, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
import { useProducts } from "@/hooks/useProducts";
import { getProductImage } from "@/lib/menu/placeholders";
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
  const localized = useLocalizedProduct(product);
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { products } = useProducts({ active: true });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [zoomed, setZoomed] = useState(false);

  const imageSrc = getProductImage(product.image, product.categoryId);
  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = () => {
    if (!product.available) return;
    for (let i = 0; i < quantity; i++) addItem(product);
    openCart();
    onOpenChange(false);
    setQuantity(1);
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
          <div>
            <h2 className="font-display text-2xl font-bold" dir={localized.dir}>
              {localized.name}
            </h2>
          </div>
          <p className="text-2xl font-bold text-turquoise">{formatPrice(product.price)}</p>
        </div>

        {localized.description && (
          <p className="mt-4 text-sm leading-relaxed text-coffee/70" dir={localized.dir}>
            {localized.description}
          </p>
        )}

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-coffee/50">{t("checkout.notes")}</p>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("checkout.notes")}
          />
        </div>

        <div className="mt-4 flex items-center gap-4">
          <p className="text-sm font-medium">{t("cart.quantity")}</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              aria-label={t("cart.decrease", "-")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
            >
              <Minus className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <span className="w-8 text-center text-lg font-bold">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              aria-label={t("cart.increase", "+")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <Button
          variant="turquoise"
          size="lg"
          className="mt-6 w-full"
          onClick={handleAdd}
          disabled={!product.available}
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={1.75} />
          {t("catalog.addToCart")} · {formatPrice(product.price * quantity)}
        </Button>

        {related.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold">{t("catalog.related")}</h3>
            <div className="grid grid-cols-2 gap-3">
              {related.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  compact
                  onClick={() => onSelectProduct?.(p)}
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
