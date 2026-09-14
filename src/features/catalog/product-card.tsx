"use client";

import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/utils";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useSettings } from "@/hooks/useSettings";
import { useFavorites } from "@/hooks/useFavorites";
import { ProductImage } from "@/components/catalog/product-image";
import { ProductModifierPreview } from "@/features/catalog/product-modifier-preview";
import { useProductModifierPreview } from "@/features/catalog/catalog-modifier-preview-context";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  onClick?: () => void;
}

export function ProductCard({ product, index = 0, onClick }: ProductCardProps) {
  const t = useT();
  const { dir } = useLocale();
  const localized = useLocalizedProduct(product);
  const { settings } = useSettings();
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const modifierPreview = useProductModifierPreview(product.id);
  const showThumbnails = settings?.showProductThumbnails !== false;
  const isRtl = dir === "rtl";

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    if (onClick) {
      onClick();
      return;
    }
    addItem(product);
    if (window.innerWidth < 1024) openCart();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ delay: (index % 8) * 0.03, duration: 0.28 }}
      whileHover={{ backgroundColor: "rgba(248, 243, 237, 0.5)" }}
      onClick={onClick}
      dir={dir}
      className={cn(
        "group grid cursor-pointer items-center gap-3 border-b border-beige-dark/12 px-1 py-4 transition-colors last:border-b-0 sm:gap-4 md:gap-5 md:py-5",
        showThumbnails
          ? "grid-cols-[112px_1fr_72px] sm:grid-cols-[132px_1fr_80px] md:grid-cols-[152px_1fr_88px]"
          : "grid-cols-[1fr_64px] sm:grid-cols-[1fr_72px]",
        !product.available && "opacity-55"
      )}
    >
      {/* Price + add — visual left in RTL */}
      <div className={cn("flex flex-col items-center gap-2", isRtl ? "order-3" : "order-1")}>
        <span className="text-price text-lg sm:text-xl md:text-2xl">{formatPrice(product.price)}</span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.available}
          aria-label={t("catalog.addToCart")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-turquoise text-warm-white shadow-soft transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <Plus className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
        </button>
      </div>

      {/* Name + description — center */}
      <div className={cn("min-w-0 px-1", isRtl ? "order-2" : "order-2")}>
        <div className="flex items-start gap-2">
          <h3 className="heading-product flex-1" dir={localized.dir}>
            {localized.name}
          </h3>
          <button
            type="button"
            onClick={handleFavorite}
            aria-label={t("catalog.favorite")}
            className="shrink-0 p-0.5 text-coffee/30 transition-colors hover:text-gold"
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isFavorite(product.id) && "fill-gold text-gold"
              )}
              strokeWidth={1.75}
            />
          </button>
        </div>
        {(product.isNew || product.isPopular) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {product.isNew && (
              <Badge variant="new" className="px-1.5 py-0 text-[10px]">
                {t("catalog.newBadge")}
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="popular" className="px-1.5 py-0 text-[10px]">
                {t("catalog.popularBadge")}
              </Badge>
            )}
          </div>
        )}
        {localized.description && (
          <p className="text-description mt-1 line-clamp-2" dir={localized.dir}>
            {localized.description}
          </p>
        )}
        <ProductModifierPreview groups={modifierPreview} />
        {!product.available && (
          <p className="text-caption mt-1">{t("catalog.unavailable")}</p>
        )}
      </div>

      {/* Thumbnail — always render real image or category fallback */}
      {showThumbnails && (
        <div className={cn("flex justify-center", isRtl ? "order-1" : "order-3")}>
          <div className="relative h-[104px] w-[104px] overflow-hidden rounded-2xl bg-beige/40 shadow-soft ring-1 ring-beige-dark/20 sm:h-[120px] sm:w-[120px] md:h-[136px] md:w-[136px]">
            <ProductImage
              image={product.image}
              categoryId={product.categoryId}
              alt={localized.name}
              thumbnail
              sizes="(min-width: 768px) 136px, (min-width: 640px) 120px, 104px"
              className="rounded-2xl"
            />
          </div>
        </div>
      )}
    </motion.article>
  );
}
