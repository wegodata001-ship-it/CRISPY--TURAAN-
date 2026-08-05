"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
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
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import {
  countProductsInCategory,
  getRootCategories,
} from "@/lib/menu/category-tree";
import { getCategoryPlaceholder } from "@/lib/menu/placeholders";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": GlassWater,
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

function CategoryCard({
  cat,
  count,
  selected,
  index,
  onSelect,
}: {
  cat: Category;
  count: number;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const t = useT();
  const localized = useLocalizedCategory(cat);
  const Icon = iconMap[cat.icon] ?? Coffee;
  const imageSrc = cat.image || getCategoryPlaceholder(cat.id);

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "group relative flex h-[7.5rem] w-[6.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/15 transition-all duration-200 sm:h-32 sm:w-28",
        selected
          ? "ring-2 ring-turquoise bg-turquoise/5 shadow-elevated"
          : "hover:ring-turquoise/30 hover:shadow-elevated"
      )}
    >
      <div className="relative h-[3.75rem] w-full overflow-hidden sm:h-[4.25rem]">
        <Image
          src={imageSrc}
          alt={localized.name}
          fill
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105",
            selected && "scale-105"
          )}
          sizes="120px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/50 to-transparent" />
        <span
          className={cn(
            "absolute end-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-sm transition-colors",
            selected ? "bg-turquoise text-white" : "bg-white/85 text-coffee"
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </div>
      <div className="flex flex-1 flex-col justify-center px-2.5 py-2 text-start">
        <p
          className={cn(
            "line-clamp-2 text-xs font-bold leading-tight sm:text-[13px]",
            selected ? "text-turquoise" : "text-dark-brown dark:text-warm-white"
          )}
          dir={localized.dir}
        >
          {localized.name}
        </p>
        <p className="mt-0.5 text-[10px] text-coffee/45 sm:text-xs">
          {count} {t("catalog.productsCount")}
        </p>
      </div>
    </motion.button>
  );
}

interface MenuCategoryStripProps {
  selectedId: string | null;
  onSelect: (categoryId: string) => void;
}

export function MenuCategoryStrip({ selectedId, onSelect }: MenuCategoryStripProps) {
  const { categories, loading } = useCategories();
  const { products } = useAllProducts();
  const rootCategories = getRootCategories(categories);

  if (loading) {
    return (
      <div className="hide-scrollbar flex gap-3 overflow-x-auto px-4 py-4 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-28 shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (rootCategories.length === 0) return null;

  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-4 md:gap-4 md:px-6">
      {rootCategories.map((cat, index) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          count={countProductsInCategory(products, cat.id, categories)}
          selected={selectedId === cat.id}
          index={index}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
