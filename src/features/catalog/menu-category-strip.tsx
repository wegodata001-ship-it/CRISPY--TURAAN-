"use client";

import { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selected]);

  return (
    <motion.button
      ref={ref}
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.22 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        // Mobile: large prominent pills (44px height)
        "inline-flex shrink-0 snap-start items-center gap-2 rounded-full font-medium transition-all duration-200",
        "h-11 px-4 text-sm",
        // Desktop: compact
        "md:h-9 md:px-3 md:py-1.5 md:text-sm",
        selected
          ? "bg-turquoise text-white shadow-soft"
          : "border border-beige-dark/25 bg-white text-coffee/80 hover:border-turquoise/40 hover:bg-cream"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", selected ? "text-white" : "text-coffee/45")}
        strokeWidth={1.75}
      />
      <span dir={localized.dir} className="whitespace-nowrap">
        {localized.name}
      </span>
      <span
        className={cn(
          "text-xs tabular-nums",
          selected ? "text-white/75" : "text-coffee/40"
        )}
      >
        · {count}
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
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full md:h-9 md:w-24" />
        ))}
      </div>
    );
  }

  if (rootCategories.length === 0) return null;

  return (
    <nav
      aria-label="Categories"
      className={cn(
        "hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto py-1",
        "md:flex-wrap md:overflow-visible"
      )}
    >
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
    </nav>
  );
}
