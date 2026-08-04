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

  const allCategories: (Category & { isAll?: boolean })[] = [
    {
      id: "all",
      name_en: "All",
      name_ar: "הכל",
      icon: "all",
      image: "",
      sortOrder: 0,
      active: true,
      isAll: true,
    },
    ...categories,
  ];

  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4 py-3 md:gap-3 md:px-6">
      {allCategories.map((cat, index) => {
        const isSelected = selected === cat.id;
        const Icon = cat.isAll ? LayoutGrid : iconMap[cat.icon] || Coffee;

        return (
          <motion.button
            key={cat.id}
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
            <span dir="rtl">{cat.name_ar}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
