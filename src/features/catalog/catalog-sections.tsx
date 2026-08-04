"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  GlassWater,
  Citrus,
  Milk,
  Snowflake,
  EggFried,
  Sandwich,
  Salad,
  Utensils,
  Croissant,
  Cake,
  IceCream,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import { getProductCountByCategory } from "@/lib/menu/map-master-menu";
import { ProductCard } from "./product-card";
import type { Category, Product } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  coffee: Coffee,
  "glass-water": GlassWater,
  citrus: Citrus,
  milk: Milk,
  snowflake: Snowflake,
  "egg-fried": EggFried,
  sandwich: Sandwich,
  salad: Salad,
  utensils: Utensils,
  croissant: Croissant,
  cake: Cake,
  "ice-cream": IceCream,
};

interface SectionHeaderProps {
  emoji: string;
  title: string;
  subtitle?: string;
}

function SectionHeader({ emoji, title, subtitle }: SectionHeaderProps) {
  return (
    <div className="mb-4 px-4 md:px-6">
      <h2 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
        {emoji} {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-coffee/55">{subtitle}</p>}
    </div>
  );
}

interface ProductCarouselProps {
  emoji: string;
  title?: string;
  titleKey?: string;
  subtitle?: string;
  subtitleKey?: string;
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function ProductCarousel({
  emoji,
  title,
  titleKey,
  subtitle,
  subtitleKey,
  products,
  onProductClick,
}: ProductCarouselProps) {
  const t = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const displayTitle = titleKey ? t(titleKey) : (title ?? "");
  const displaySubtitle = subtitleKey ? t(subtitleKey) : subtitle;

  if (products.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  };

  return (
    <section className="py-6">
      <div className="mb-4 flex items-end justify-between gap-4 px-4 md:px-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-dark-brown md:text-3xl">
            {emoji} {displayTitle}
          </h2>
          {displaySubtitle && <p className="mt-1 text-sm text-coffee/55">{displaySubtitle}</p>}
        </div>
        <div className="hidden shrink-0 gap-1 md:flex">
          <button onClick={() => scroll("left")} className="flex h-9 w-9 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white shadow-soft hover:bg-beige/40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => scroll("right")} className="flex h-9 w-9 items-center justify-center rounded-full border border-beige-dark/30 bg-warm-white shadow-soft hover:bg-beige/40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="hide-scrollbar flex gap-4 overflow-x-auto px-4 pb-3 md:gap-5 md:px-6">
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.03 }}
            className="w-[220px] shrink-0 md:w-[260px]"
          >
            <ProductCard product={product} index={index} onClick={() => onProductClick(product)} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function CategoryCard({
  cat,
  count,
  selected,
  index,
  onSelect,
}: {
  cat: Category;
  count: number;
  selected: string;
  index: number;
  onSelect: (categoryId: string) => void;
}) {
  const t = useT();
  const localized = useLocalizedCategory(cat);
  const Icon = iconMap[cat.icon] ?? Coffee;

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(cat.id)}
      className={`group relative flex h-36 w-44 shrink-0 flex-col justify-end overflow-hidden rounded-2xl shadow-soft transition-shadow hover:shadow-elevated md:h-40 md:w-48 ${
        selected === cat.id ? "ring-2 ring-turquoise ring-offset-2" : ""
      }`}
    >
      {cat.image ? (
        <Image src={cat.image} alt={localized.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" sizes="200px" />
      ) : (
        <div className="absolute inset-0" style={{ backgroundColor: cat.color ?? "#8B6914" }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/90 via-dark-brown/35 to-transparent" />
      <Icon className="absolute top-4 right-4 h-6 w-6 text-warm-white/90 drop-shadow" />
      <div className="relative p-4 text-right">
        <p className="text-sm font-bold text-warm-white md:text-base" dir={localized.dir}>{localized.name}</p>
        <p className="text-xs text-warm-white/75">{count} {t("admin.products")}</p>
      </div>
    </motion.button>
  );
}

interface CategoryGridProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

export function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const t = useT();
  const { categories, loading } = useCategories();
  const { products } = useAllProducts();

  if (loading) {
    return (
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-4 py-6 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-44 shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <section className="py-4">
      <SectionHeader emoji="📂" title={t("catalog.categories")} />
      <div className="hide-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect("all")}
          className={`relative flex h-36 w-44 shrink-0 flex-col justify-end overflow-hidden rounded-2xl p-4 shadow-soft transition-shadow hover:shadow-elevated md:h-40 md:w-48 ${
            selected === "all" ? "ring-2 ring-turquoise ring-offset-2" : ""
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-coffee to-dark-brown" />
          <LayoutGrid className="absolute top-4 right-4 h-6 w-6 text-warm-white/80" />
          <div className="relative">
            <p className="text-right text-sm font-bold text-warm-white">{t("catalog.all")}</p>
            <p className="text-right text-xs text-warm-white/70">{products.length} {t("admin.products")}</p>
          </div>
        </motion.button>

        {categories.map((cat, index) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            count={getProductCountByCategory(products, cat.id)}
            selected={selected}
            index={index}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export function filterProductsByCategories(products: Product[], categoryIds: string[]): Product[] {
  return products.filter((p) => categoryIds.includes(p.categoryId));
}
