"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Plus, ShoppingBag, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
import { getProductImage } from "@/lib/menu/placeholders";
import type { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index?: number;
  compact?: boolean;
  onClick?: () => void;
}

export function ProductCard({
  product,
  index = 0,
  compact = false,
  onClick,
}: ProductCardProps) {
  const t = useT();
  const localized = useLocalizedProduct(product);
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const imageSrc = getProductImage(product.image, product.categoryId);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    addItem(product);
    openCart();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 8) * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/15 transition-all duration-300 hover:shadow-elevated",
        !product.available && "opacity-60",
        compact && "rounded-xl"
      )}
    >
      <div className={cn("relative overflow-hidden", compact ? "aspect-square" : "aspect-[4/5]")}>
        <Image
          src={imageSrc}
          alt={localized.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          sizes={compact ? "220px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/55 via-dark-brown/5 to-transparent" />

        <div className="absolute top-3 start-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge variant="new" className="shadow-soft backdrop-blur-sm">
              {t("catalog.newBadge")}
            </Badge>
          )}
          {product.isPopular && (
            <Badge variant="popular" className="shadow-soft backdrop-blur-sm">
              {t("catalog.popularBadge")}
            </Badge>
          )}
        </div>

        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-brown/55 backdrop-blur-[2px]">
            <span className="rounded-full bg-warm-white px-4 py-1.5 text-xs font-bold text-dark-brown">
              {t("catalog.unavailable")}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={t("catalog.favorite")}
          className="absolute top-3 end-3 flex h-10 w-10 items-center justify-center rounded-full bg-warm-white/95 shadow-soft backdrop-blur-sm transition-transform hover:scale-105"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite(product.id) ? "fill-gold text-gold" : "text-coffee/45"
            )}
            strokeWidth={1.75}
          />
        </button>

        {!compact && onClick && (
          <div className="absolute inset-x-0 bottom-14 flex justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-dark-brown/75 px-3 py-1.5 text-xs font-medium text-warm-white backdrop-blur-sm">
              <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t("catalog.quickView")}
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.available}
          aria-label={t("catalog.addToCart")}
          className="absolute bottom-3 end-3 flex h-12 w-12 items-center justify-center rounded-full bg-turquoise text-warm-white shadow-elevated transition-all hover:scale-105 hover:bg-turquoise-light disabled:opacity-50"
        >
          <Plus className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col border-t border-beige-dark/10 bg-warm-white/95",
          compact ? "p-3" : "p-4"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "font-bold leading-snug text-dark-brown",
                compact ? "text-sm" : "text-base md:text-lg"
              )}
              dir={localized.dir}
            >
              {localized.name}
            </h3>
          </div>
          <span
            className={cn(
              "shrink-0 font-display font-bold text-turquoise",
              compact ? "text-base" : "text-lg md:text-xl"
            )}
          >
            {formatPrice(product.price)}
          </span>
        </div>

        {!compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-coffee/60" dir={localized.dir}>
            {localized.description}
          </p>
        )}

        {!compact && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-coffee/45 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("catalog.addToCart")}
          </div>
        )}
      </div>
    </motion.article>
  );
}
