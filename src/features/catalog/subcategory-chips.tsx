"use client";

import { useEffect, useRef } from "react";
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
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected && ref.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [selected]);

  return (
    <motion.button
      ref={ref}
      type="button"
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => onSelect(cat.id)}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full font-medium transition-all duration-200",
        "h-9 px-3.5 text-sm",
        "md:h-8 md:px-3 md:text-sm",
        selected
          ? "bg-turquoise/15 text-dark-brown ring-1 ring-turquoise"
          : "border border-beige-dark/25 bg-white text-coffee/75 hover:border-turquoise/35"
      )}
    >
      <span dir={localized.dir} className="min-w-0 truncate">{localized.name}</span>
      <span className={cn("shrink-0 text-xs", selected ? "text-turquoise" : "text-coffee/40")}>
        · {count}
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
    <div className="border-b border-beige-dark/10 pb-2 md:px-0">
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
