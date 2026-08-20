"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ProductCard } from "@/features/catalog/product-card";
import { ShowMoreProductsButton } from "@/features/catalog/show-more-products-button";
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import {
  CATALOG_PREVIEW_COUNT,
  getCatalogVisibleProducts,
  shouldShowCatalogExpand,
} from "@/lib/catalog/preview";
import type { Category, Product } from "@/types";

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

const GRID_CLASS =
  "overflow-hidden rounded-2xl bg-warm-white ring-1 ring-beige-dark/10";

interface CategoryProductSectionProps {
  category: Category;
  products: Product[];
  onProductClick: (product: Product) => void;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function CategoryProductSection({
  category,
  products,
  onProductClick,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
}: CategoryProductSectionProps) {
  const t = useT();
  const localized = useLocalizedCategory(category);
  const controlled = typeof onExpandedChange === "function";
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = controlled ? Boolean(expandedProp) : internalExpanded;
  const prevCountRef = useRef(CATALOG_PREVIEW_COUNT);

  useEffect(() => {
    if (controlled) return;
    setInternalExpanded(defaultExpanded);
    prevCountRef.current = CATALOG_PREVIEW_COUNT;
  }, [products.length, defaultExpanded, category.id, controlled]);

  if (products.length === 0) return null;

  const shouldPaginate = !defaultExpanded && shouldShowCatalogExpand(products.length);
  const displayed = shouldPaginate
    ? getCatalogVisibleProducts(products, expanded)
    : products;
  const animateFrom = prevCountRef.current;

  const toggleExpanded = () => {
    const next = !expanded;
    if (next) {
      prevCountRef.current = CATALOG_PREVIEW_COUNT;
    }
    if (controlled) onExpandedChange?.(next);
    else setInternalExpanded(next);
  };

  const Icon = iconMap[category.icon] ?? Coffee;

  return (
    <section id={`category-${category.id}`} className="scroll-mt-36 py-4 md:py-5">
      <div className="mb-3 px-4 md:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-turquoise/10 text-turquoise">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="heading-section" dir={localized.dir}>
              {localized.name}
            </h2>
            <p className="mt-0.5 text-sm text-coffee/55">
              {products.length} {t("catalog.productsCount")}
            </p>
          </div>
        </div>
      </div>

      <div className={GRID_CLASS}>
        <AnimatePresence mode="popLayout">
          {displayed.map((product, index) => {
            const isNewBatch = expanded && index >= animateFrom;
            return (
              <motion.div
                key={product.id}
                layout
                initial={isNewBatch ? { opacity: 0, y: 16 } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: isNewBatch ? (index - animateFrom) * 0.06 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <ProductCard
                  product={product}
                  index={index}
                  onClick={() => onProductClick(product)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {shouldPaginate && (
        <ShowMoreProductsButton
          totalCount={products.length}
          expanded={expanded}
          onToggle={toggleExpanded}
        />
      )}
    </section>
  );
}

export { GRID_CLASS as CATALOG_GRID_CLASS };
