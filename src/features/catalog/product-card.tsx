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
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const handleAdd = () => {
    if (!product.available) return;
    addItem(product);
    openCart();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft transition-shadow duration-300 hover:shadow-elevated",
        !product.available && "opacity-60"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={product.image}
          alt={product.name_en}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute top-2 left-2 flex gap-1">
          {product.isNew && <Badge variant="new">NEW</Badge>}
          {product.isPopular && <Badge variant="popular">Popular</Badge>}
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
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-warm-white/90 shadow-soft transition-all duration-200 hover:scale-110"
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

      <div className="flex flex-1 flex-col p-3 md:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-dark-brown md:text-base">
              {product.name_en}
            </h3>
            <p className="truncate text-xs text-coffee/50" dir="rtl">
              {product.name_ar}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold text-coffee md:text-base">
            {formatPrice(product.price)}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-2 text-xs text-coffee/60 md:text-sm">
          {product.description}
        </p>

        <div className="mt-auto pt-3">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleAdd}
            disabled={!product.available}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
