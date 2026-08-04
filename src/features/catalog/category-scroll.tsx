"use client";

import { motion } from "framer-motion";
import {
  Coffee,
  GlassWater,
  Utensils,
  Cake,
  EggFried,
  LayoutGrid,
  Citrus,
  Milk,
  Snowflake,
  Sandwich,
  Salad,
  Croissant,
  IceCream,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import { getProductCountByCategory } from "@/lib/menu/map-master-menu";
import type { Category } from "@/types";

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

interface CategoryScrollProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

function CategoryChip({
  cat,
  isAll,
  isSelected,
  count,
  index,
  onSelect,
}: {
  cat: Category;
  isAll?: boolean;
  isSelected: boolean;
  count?: number;
  index: number;
  onSelect: (categoryId: string) => void;
}) {
  const t = useT();
  const localized = useLocalizedCategory(cat);
  const Icon = isAll ? LayoutGrid : iconMap[cat.icon] || Coffee;
  const label = isAll ? t("catalog.all") : localized.name;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "flex shrink-0 snap-start flex-col items-start gap-1 rounded-2xl px-4 py-3 text-start transition-all duration-200 min-w-[120px]",
        isSelected
          ? "bg-coffee text-warm-white shadow-elevated ring-1 ring-coffee/20"
          : "bg-warm-white/90 text-coffee shadow-soft ring-1 ring-beige-dark/20 hover:shadow-elevated"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      <span className="text-sm font-semibold leading-tight" dir={isAll ? undefined : localized.dir}>
        {label}
      </span>
      {count !== undefined && (
        <span className={cn("text-[10px] font-medium", isSelected ? "text-warm-white/70" : "text-coffee/45")}>
          {count} {t("catalog.productsCount")}
        </span>
      )}
    </motion.button>
  );
}

export function CategoryScroll({ selected, onSelect }: CategoryScrollProps) {
  const { categories, loading } = useCategories();
  const { products } = useAllProducts();

  if (loading) {
    return (
      <div className="flex gap-3 px-4 py-4 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-[120px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  const allCategory: Category = {
    id: "all",
    name_he: "",
    name_ar: "",
    name_en: "",
    icon: "all",
    image: "",
    color: "#8B6914",
    sortOrder: 0,
    active: true,
  };

  return (
    <div className="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-3 md:gap-4 md:px-6">
      <CategoryChip
        cat={allCategory}
        isAll
        isSelected={selected === "all"}
        count={products.length}
        index={0}
        onSelect={onSelect}
      />
      {categories.map((cat, index) => (
        <CategoryChip
          key={cat.id}
          cat={cat}
          isSelected={selected === cat.id}
          count={getProductCountByCategory(products, cat.id)}
          index={index + 1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
