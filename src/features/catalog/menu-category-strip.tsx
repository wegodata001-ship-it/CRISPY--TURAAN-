"use client";

import { useEffect, useMemo, useState } from "react";
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
  ChevronDown,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import { useIsMobile } from "@/hooks/useIsMobile";
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

/** How many chips to show in the collapsed 2-row preview (mobile/tablet). */
function useCollapsedCategoryLimit(): number {
  const [limit, setLimit] = useState(6);

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      // Aim for ~2 rows: 2 cols → 4–6, 3 cols → 6, 4 cols → 8
      if (w < 380) setLimit(4);
      else if (w < 640) setLimit(6);
      else setLimit(8);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return limit;
}

function CategoryPill({
  cat,
  count,
  selected,
  index,
  onSelect,
  compact,
}: {
  cat: Category;
  count: number;
  selected: boolean;
  index: number;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const localized = useLocalizedCategory(cat);
  const Icon = iconMap[cat.icon] ?? Coffee;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 12) * 0.02, duration: 0.2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-full font-medium transition-all duration-200",
        compact
          ? "h-10 w-full justify-center px-2.5 text-[13px] sm:justify-start sm:px-3"
          : "h-9 shrink-0 px-3 text-sm",
        selected
          ? "bg-turquoise text-white shadow-soft"
          : "border border-beige-dark/25 bg-white text-coffee/80 hover:border-turquoise/40 hover:bg-cream"
      )}
    >
      <Icon
        className={cn("h-4 w-4 shrink-0", selected ? "text-white" : "text-coffee/45")}
        strokeWidth={1.75}
      />
      <span dir={localized.dir} className="min-w-0 truncate">
        {localized.name}
      </span>
      <span
        className={cn(
          "shrink-0 text-xs tabular-nums",
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
  const t = useT();
  const { categories, loading } = useCategories();
  const { products } = useAllProducts();
  const rootCategories = getRootCategories(categories);
  /** Below lg: compact grid. lg+: desktop wrap (existing behavior). */
  const isCompactLayout = useIsMobile(1024);
  const collapsedLimit = useCollapsedCategoryLimit();
  const [expanded, setExpanded] = useState(false);

  const selectedIndex = useMemo(
    () => rootCategories.findIndex((c) => c.id === selectedId),
    [rootCategories, selectedId]
  );

  // Keep expanded if the active category would be hidden in the collapsed preview
  useEffect(() => {
    if (!isCompactLayout) return;
    if (selectedIndex >= collapsedLimit) {
      setExpanded(true);
    }
  }, [isCompactLayout, selectedIndex, collapsedLimit]);

  const visibleCategories = useMemo(() => {
    if (!isCompactLayout || expanded) return rootCategories;
    return rootCategories.slice(0, collapsedLimit);
  }, [isCompactLayout, expanded, rootCategories, collapsedLimit]);

  const canToggle =
    isCompactLayout && rootCategories.length > collapsedLimit;

  if (loading) {
    return (
      <div
        className={cn(
          "grid grid-cols-2 gap-2 py-1 sm:grid-cols-3 md:grid-cols-4",
          "lg:flex lg:flex-wrap lg:gap-2"
        )}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-full lg:h-9 lg:w-24 lg:shrink-0" />
        ))}
      </div>
    );
  }

  if (rootCategories.length === 0) return null;

  return (
    <div className="space-y-2 py-1">
      <nav
        aria-label="Categories"
        className={cn(
          isCompactLayout
            ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
            : "flex flex-wrap gap-2"
        )}
      >
        {visibleCategories.map((cat, index) => (
          <CategoryPill
            key={cat.id}
            cat={cat}
            count={countProductsInCategory(products, cat.id, categories)}
            selected={selectedId === cat.id}
            index={index}
            onSelect={onSelect}
            compact={isCompactLayout}
          />
        ))}
      </nav>

      {canToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-beige-dark/20 bg-warm-white text-sm font-medium text-coffee/70 transition-colors hover:border-turquoise/35 hover:text-turquoise"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
              {t("catalog.showLess", "הצג פחות")}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
              {t("catalog.showAll", "הצג הכל")}
              <span className="text-xs text-coffee/40">
                ({rootCategories.length - collapsedLimit}+)
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
