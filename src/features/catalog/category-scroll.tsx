"use client";

import { motion } from "framer-motion";
import {
  Coffee,
  GlassWater,
  Utensils,
  Cake,
  EggFried,
  Sparkles,
  LayoutGrid,
  Citrus,
  Milk,
  Snowflake,
  Sandwich,
  Salad,
  Croissant,
  IceCreamCone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories } from "@/hooks/useProducts";
import type { Category } from "@/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
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
  "ice-cream": IceCreamCone,
  sparkles: Sparkles,
};

interface CategoryScrollProps {
  selected: string;
  onSelect: (categoryId: string) => void;
}

function CategoryChip({
  cat,
  isAll,
  isSelected,
  index,
  onSelect,
}: {
  cat: Category;
  isAll?: boolean;
  isSelected: boolean;
  index: number;
  onSelect: (categoryId: string) => void;
}) {
  const t = useT();
  const localized = useLocalizedCategory(cat);
  const Icon = isAll ? LayoutGrid : iconMap[cat.icon] || Coffee;
  const label = isAll ? t("catalog.all") : localized.name;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200",
        isSelected
          ? "bg-coffee text-warm-white shadow-soft scale-105"
          : "bg-warm-white/80 text-coffee hover:bg-beige/80 border border-beige-dark/30"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span dir={isAll ? undefined : localized.dir}>{label}</span>
    </motion.button>
  );
}

export function CategoryScroll({ selected, onSelect }: CategoryScrollProps) {
  const { categories, loading } = useCategories();

  if (loading) {
    return (
      <div className="flex gap-3 px-4 py-4 md:px-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 shrink-0 rounded-full" />
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
    <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4 py-3 md:gap-3 md:px-6">
      <CategoryChip
        cat={allCategory}
        isAll
        isSelected={selected === "all"}
        index={0}
        onSelect={onSelect}
      />
      {categories.map((cat, index) => (
        <CategoryChip
          key={cat.id}
          cat={cat}
          isSelected={selected === cat.id}
          index={index + 1}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
