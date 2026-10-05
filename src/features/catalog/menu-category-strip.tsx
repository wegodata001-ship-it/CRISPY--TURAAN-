"use client";

import { motion } from "framer-motion";
import { LayoutGrid, type LucideIcon } from "lucide-react";
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
  Beef,
  Drumstick,
  CupSoda,
  Popcorn,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useT } from "@/components/providers/locale-provider";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import { getRootCategories } from "@/lib/menu/category-tree";
import { HorizontalScroller } from "@/components/ui/horizontal-scroller";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const iconMap: Record<string, LucideIcon> = {
  coffee: Coffee,
  "cup-soda": CupSoda,
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
  drumstick: Drumstick,
  chicken: Drumstick,
  hamburger: Beef,
  burger: Beef,
  fries: Popcorn,
  popcorn: Popcorn,
};

function CategoryPill({
  label,
  dir,
  icon: Icon,
  selected,
  index,
  onSelect,
}: {
  label: string;
  dir?: string;
  icon: LucideIcon;
  selected: boolean;
  index: number;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      data-hscroll-active={selected ? "true" : undefined}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.02, duration: 0.2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className={cn(
        "inline-flex h-11 flex-none shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-bold transition-colors",
        selected
          ? "bg-[#F6B800] font-bold text-[#171717] shadow-soft"
          : "border border-beige-dark bg-warm-white font-semibold text-[#171717] hover:border-[#F6B800]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      <span dir={dir} className="max-w-[9rem] truncate">
        {label}
      </span>
    </motion.button>
  );
}

function LocalizedCategoryPill({
  cat,
  selected,
  index,
  onSelect,
}: {
  cat: Category;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
}) {
  const localized = useLocalizedCategory(cat);
  const Icon = iconMap[cat.icon] ?? Utensils;

  return (
    <CategoryPill
      label={localized.name}
      dir={localized.dir}
      icon={Icon}
      selected={selected}
      index={index}
      onSelect={() => onSelect(cat.id)}
    />
  );
}

interface MenuCategoryStripProps {
  selectedId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export function MenuCategoryStrip({ selectedId, onSelect }: MenuCategoryStripProps) {
  const t = useT();
  const { categories, loading } = useCategories();
  const { products } = useAllProducts();
  const rootCategories = getRootCategories(categories);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-hidden py-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  if (rootCategories.length === 0 && products.length === 0) return null;

  return (
    <div className="py-1">
      <HorizontalScroller
        activeKey={selectedId ?? "all"}
        aria-label="Categories"
        fadeFromClassName="from-cream"
      >
        <CategoryPill
          label={t("catalog.all")}
          icon={LayoutGrid}
          selected={selectedId === null}
          index={0}
          onSelect={() => onSelect(null)}
        />
        {rootCategories.map((cat, index) => (
          <LocalizedCategoryPill
            key={cat.id}
            cat={cat}
            selected={selectedId === cat.id}
            index={index + 1}
            onSelect={onSelect}
          />
        ))}
      </HorizontalScroller>
    </div>
  );
}
