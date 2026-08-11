"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { useCategories, useAllProducts } from "@/hooks/useProducts";
import {
  countProductsInSubcategory,
  getSubcategories,
  hasSubcategories,
} from "@/lib/menu/category-tree";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

function SubChip({
  cat,
  count,
  selected,
  onSelect,
}: {
  cat: Category;
  count: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const localized = useLocalizedCategory(cat);

  return (
    <motion.button
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "inline-flex shrink-0 snap-start items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
        selected
          ? "border-2 border-turquoise bg-turquoise/8 text-dark-brown"
          : "border border-beige-dark/25 bg-warm-white text-coffee/75 hover:border-turquoise/35"
      )}
    >
      <span dir={localized.dir}>{localized.name}</span>
      <span className={cn("text-xs", selected ? "text-warm-white/80" : "text-coffee/45")}>
        ({count})
      </span>
    </motion.button>
  );
}

interface SubcategoryChipsProps {
  parentId: string | null;
  selectedSubId: string | null;
  onSelect: (subcategoryId: string) => void;
}

export function SubcategoryChips({ parentId, selectedSubId, onSelect }: SubcategoryChipsProps) {
  const { categories } = useCategories();
  const { products } = useAllProducts();

  if (!parentId || !hasSubcategories(categories, parentId)) return null;

  const subs = getSubcategories(categories, parentId);

  return (
    <div className="border-b border-beige-dark/10 px-4 pb-3 md:px-6">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={parentId}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="hide-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto md:flex-wrap md:overflow-visible"
        >
          {subs.map((sub) => (
            <SubChip
              key={sub.id}
              cat={sub}
              count={countProductsInSubcategory(products, sub.id)}
              selected={selectedSubId === sub.id}
              onSelect={onSelect}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
