"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useProducts";
import { ProductCard } from "./product-card";
import type { Product } from "@/types";

interface ProductCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function ProductCarousel({
  title,
  subtitle,
  products,
  onProductClick,
}: ProductCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: dir === "left" ? -280 : 280,
      behavior: "smooth",
    });
  };

  return (
    <section className="py-4">
      <div className="mb-3 flex items-end justify-between px-4 md:px-6">
        <div>
          <h2
            className="font-display text-xl font-bold text-dark-brown md:text-2xl"
            dir="rtl"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-coffee/55">{subtitle}</p>
          )}
        </div>
        <div className="hidden gap-1 md:flex">
          <button
            onClick={() => scroll("left")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white text-coffee hover:bg-beige/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white text-coffee hover:bg-beige/50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:gap-4 md:px-6"
      >
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.04 }}
            className="w-[168px] shrink-0 md:w-[200px]"
          >
            <ProductCard
              product={product}
              index={index}
              compact
              onClick={() => onProductClick(product)}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

interface CategoryGridProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const { categories, loading } = useCategories();

  if (loading) {
    return (
      <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 py-4 md:px-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-36 shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="py-2">
      <div className="mb-3 px-4 md:px-6">
        <h2
          className="font-display text-xl font-bold text-dark-brown md:text-2xl"
          dir="rtl"
        >
          קטגוריות
        </h2>
        <p className="text-sm text-coffee/55">Browse by category</p>
      </div>
      <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
        {categories.map((cat, index) => {
          const isSelected = selected === cat.id;
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              onClick={() => onSelect(cat.id)}
              className={`relative h-28 w-36 shrink-0 overflow-hidden rounded-2xl md:h-32 md:w-40 ${
                isSelected ? "ring-2 ring-turquoise ring-offset-2" : ""
              }`}
            >
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.name_ar}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="absolute inset-0 bg-beige" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/80 via-dark-brown/30 to-transparent" />
              <span
                className="absolute bottom-2 right-2 left-2 text-right text-xs font-semibold text-warm-white md:text-sm"
                dir="rtl"
              >
                {cat.name_ar}
              </span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
