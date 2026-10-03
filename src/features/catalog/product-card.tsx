"use client";

import { Plus } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useSettings } from "@/hooks/useSettings";
import { ProductImage } from "@/components/catalog/product-image";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  onClick?: () => void;
  variant?: "row" | "featured" | "compact" | "card";
}

export function ProductCard({
  product,
  onClick,
  variant = "row",
}: ProductCardProps) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const { settings } = useSettings();
  const { addItem } = useCart();
  const showThumbnails = settings?.showProductThumbnails !== false;
  const isFeatured = variant === "featured";

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    if (onClick) {
      onClick();
      return;
    }
    addItem(product);
  };

  if (variant === "compact") {
    return (
      <article
        onClick={onClick}
        className={cn(
          "flex cursor-pointer items-center gap-3 rounded-[18px] border border-beige-dark bg-warm-white p-2.5",
          !product.available && "opacity-55"
        )}
      >
        {showThumbnails && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream">
            <ProductImage
              image={product.image}
              categoryId={product.categoryId}
              alt={localized.name}
              thumbnail
              sizes="64px"
              className="rounded-xl"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-bold" dir={localized.dir}>
            {localized.name}
          </h3>
          <p className="text-sm font-bold text-turquoise">{formatPrice(product.price)}</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.available}
          aria-label={t("catalog.addToCart")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-turquoise text-warm-white"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
        </button>
      </article>
    );
  }

  if (isFeatured) {
    return (
      <article
        onClick={onClick}
        className={cn(
          "flex w-[168px] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[18px] border border-beige-dark bg-warm-white shadow-soft",
          !product.available && "opacity-55"
        )}
      >
        {showThumbnails && (
          <div className="relative aspect-square w-full overflow-hidden bg-cream">
            <ProductImage
              image={product.image}
              categoryId={product.categoryId}
              alt={localized.name}
              sizes="168px"
              className="rounded-none"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col gap-1 p-2.5">
          <h3 className="line-clamp-2 text-sm font-bold" dir={localized.dir}>
            {localized.name}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="text-base font-bold text-dark-brown">{formatPrice(product.price)}</span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.available}
              aria-label={t("catalog.addToCart")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-turquoise text-warm-white"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      onClick={onClick}
      className={cn(
        "flex cursor-pointer gap-3 rounded-[18px] border border-beige-dark bg-warm-white p-3 shadow-soft",
        !product.available && "opacity-55"
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold leading-snug text-dark-brown" dir={localized.dir}>
          {localized.name}
        </h3>
        {localized.description && (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-coffee-light" dir={localized.dir}>
            {localized.description}
          </p>
        )}
        {!product.available && (
          <p className="mt-1 text-xs text-coffee-light">{t("catalog.unavailable")}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-lg font-bold tabular-nums text-dark-brown">
            {formatPrice(product.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.available}
            aria-label={t("catalog.addToCart")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-turquoise text-warm-white transition-colors hover:bg-turquoise-light disabled:opacity-40"
          >
            <Plus className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {showThumbnails && (
        <div className="relative h-[110px] w-[110px] shrink-0 overflow-hidden rounded-[16px] bg-cream">
          <ProductImage
            image={product.image}
            categoryId={product.categoryId}
            alt={localized.name}
            sizes="110px"
            className="rounded-[16px]"
          />
        </div>
      )}
    </article>
  );
}
