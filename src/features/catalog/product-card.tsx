"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedProduct } from "@/hooks/useLocalizedContent";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
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

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!product.available) return;
    addItem(product);
    openCart();
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: (index % 8) * 0.04, duration: 0.35 }}
      whileHover={{ y: -8 }}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/10 transition-all duration-300 hover:shadow-elevated",
        !product.available && "opacity-60",
        compact && "rounded-xl"
      )}
    >
      <div className={cn("relative overflow-hidden", compact ? "aspect-square" : "aspect-[4/5]")}>
        <Image
          src={product.image}
          alt={localized.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
          sizes={compact ? "220px" : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/50 via-transparent to-transparent opacity-80" />

        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge variant="new" className="shadow-md">{t("catalog.newBadge")}</Badge>
          )}
          {product.isPopular && (
            <Badge variant="popular" className="shadow-md">{t("catalog.popularBadge")}</Badge>
          )}
        </div>

        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-brown/50 backdrop-blur-[2px]">
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
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/95 shadow-soft transition-transform hover:scale-110"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite(product.id) ? "fill-red-400 text-red-400" : "text-coffee/40"
            )}
          />
        </button>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!product.available}
          className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-turquoise text-white shadow-lg transition-transform hover:scale-110 disabled:opacity-50"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-3" : "p-4")}>
        <div className="flex items-start justify-between gap-2">
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
            {!compact && localized.locale !== "en" && (
              <p className="mt-0.5 truncate text-xs text-coffee/50">{product.name_en}</p>
            )}
          </div>
          <span className={cn("shrink-0 font-display font-bold text-turquoise", compact ? "text-base" : "text-lg md:text-xl")}>
            {formatPrice(product.price)}
          </span>
        </div>

        {!compact && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-coffee/65" dir={localized.dir}>
            {localized.description}
          </p>
        )}
      </div>
    </motion.article>
  );
}
