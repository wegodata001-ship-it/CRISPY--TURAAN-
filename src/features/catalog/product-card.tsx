"use client";

import { Minus, Plus } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
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
  variant = "card",
}: ProductCardProps) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const { addItem, items, updateQuantity } = useCart();

  const matchingLines = items.filter((item) => item.product.id === product.id);
  const quantityInCart = matchingLines.reduce((sum, item) => sum + item.quantity, 0);
  const simpleLine = matchingLines.find(
    (item) => !item.configurable && item.selections.length === 0
  );

  const handleAdd = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!product.available) return;
    addItem(product);
  };

  const handleMinus = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!simpleLine) {
      onClick?.();
      return;
    }
    updateQuantity(simpleLine.lineId, simpleLine.quantity - 1);
  };

  return (
    <article
      onClick={onClick}
      data-product-card={variant}
      className={cn(
        "flex h-full w-full max-w-none cursor-pointer flex-col overflow-hidden rounded-2xl bg-warm-white text-start shadow-soft ring-1 ring-beige-dark/20 transition-shadow hover:shadow-md min-[480px]:max-w-[420px]",
        !product.available && "opacity-60"
      )}
    >
      <div className="relative h-[180px] w-full shrink-0 overflow-hidden bg-[#FFF4E2] sm:h-[200px] md:h-[240px] xl:h-[260px]">
        <ProductImage
          image={product.image}
          categoryId={product.categoryId}
          alt={localized.name}
          sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
          className="rounded-none object-cover"
        />
        {!product.available && (
          <span className="absolute start-3 top-3 rounded-full bg-[#171717]/80 px-2.5 py-1 text-[11px] font-semibold text-white">
            {t("catalog.unavailable")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3
          className="font-display text-lg font-bold leading-snug text-[#171717] md:text-xl"
          dir={localized.dir}
        >
          {localized.name}
        </h3>
        {localized.description?.trim() ? (
          <p
            className="line-clamp-3 text-sm leading-relaxed text-[#70665D]"
            dir={localized.dir}
          >
            {localized.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <span className="text-xl font-bold tabular-nums text-[#171717] md:text-2xl">
            {formatPrice(product.price)}
          </span>

          {quantityInCart > 0 ? (
            <div
              className="inline-flex h-11 items-center rounded-full bg-[#FFF4E2] ring-1 ring-[#EADBC8]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={handleMinus}
                aria-label={t("cart.decreaseQuantity")}
                className="flex h-11 w-11 items-center justify-center text-[#171717]"
              >
                <Minus className="h-4 w-4" strokeWidth={2.25} />
              </button>
              <span className="min-w-6 text-center text-base font-bold tabular-nums">
                {quantityInCart}
              </span>
              <button
                type="button"
                onClick={handleAdd}
                aria-label={t("catalog.addToCart")}
                className="flex h-11 w-11 items-center justify-center text-[#D71920]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={!product.available}
              aria-label={t("catalog.addToCart")}
              className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-[#D71920] px-3.5 text-sm font-bold text-white transition-colors hover:bg-[#B51218] disabled:opacity-40"
            >
              <Plus className="h-5 w-5" strokeWidth={2.4} />
              <span className="hidden sm:inline">{t("catalog.addShort")}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
