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
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "bg-turquoise text-warm-white shadow-soft"
          : "bg-beige/50 text-coffee hover:bg-beige dark:bg-white/10 dark:text-warm-white/90"
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
    <div className="border-b border-beige-dark/15 px-4 pb-4 md:px-6">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={parentId}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-2"
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
