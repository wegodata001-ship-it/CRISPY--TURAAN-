"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, cn } from "@/lib/utils";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -6 }}
      onClick={onClick}
      className={cn(
        "group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft transition-all duration-300 hover:shadow-elevated",
        !product.available && "opacity-60",
        compact && "rounded-xl"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden",
          compact ? "aspect-square" : "aspect-[4/3]"
        )}
      >
        <Image
          src={product.image}
          alt={product.name_ar}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes={
            compact
              ? "200px"
              : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          }
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.isNew && <Badge variant="new">NEW</Badge>}
          {product.isPopular && <Badge variant="popular">★</Badge>}
        </div>

        {!product.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-brown/40">
            <span className="rounded-full bg-warm-white/90 px-3 py-1 text-xs font-semibold text-dark-brown">
              Unavailable
            </span>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-warm-white/95 shadow-soft transition-all duration-200 hover:scale-110"
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              isFavorite(product.id)
                ? "fill-red-400 text-red-400"
                : "text-coffee/40"
            )}
          />
        </button>
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "p-2.5" : "p-3 md:p-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className={cn(
                "truncate font-semibold text-dark-brown",
                compact ? "text-xs" : "text-sm md:text-base"
              )}
              dir="rtl"
            >
              {product.name_ar}
            </h3>
            {!compact && (
              <p className="truncate text-xs text-coffee/50">{product.name_en}</p>
            )}
          </div>
          <span
            className={cn(
              "shrink-0 font-bold text-turquoise",
              compact ? "text-xs" : "text-sm md:text-base"
            )}
          >
            {formatPrice(product.price)}
          </span>
        </div>

        {!compact && (
          <p className="mt-1.5 line-clamp-2 text-xs text-coffee/60 md:text-sm" dir="rtl">
            {product.description}
          </p>
        )}

        <div className={cn("mt-auto", compact ? "pt-2" : "pt-3")}>
          <Button
            variant="default"
            size={compact ? "sm" : "default"}
            className={cn("w-full", compact && "h-8 text-xs")}
            onClick={handleAdd}
            disabled={!product.available}
          >
            <Plus className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
            Add
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
