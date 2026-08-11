"use client";

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
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import {
  countProductsInCategory,
  getRootCategories,
} from "@/lib/menu/category-tree";
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

function CategoryPill({
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
  const localized = useLocalizedCategory(cat);
  const Icon = iconMap[cat.icon] ?? Coffee;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.22 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "inline-flex shrink-0 snap-start items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
        selected
          ? "border-2 border-turquoise bg-turquoise/8 text-dark-brown shadow-soft"
          : "border border-beige-dark/25 bg-warm-white text-coffee/75 hover:border-turquoise/35 hover:bg-cream"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", selected ? "text-turquoise" : "text-coffee/45")}
        strokeWidth={1.75}
      />
      <span dir={localized.dir} className="whitespace-nowrap font-medium">
        {localized.name}
      </span>
      <span className="text-caption tabular-nums">
        {count}
      </span>
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
      <div className="hide-scrollbar flex gap-2 overflow-x-auto py-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (rootCategories.length === 0) return null;

  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto py-1 md:flex-wrap md:overflow-visible">
      {rootCategories.map((cat, index) => (
        <CategoryPill
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
