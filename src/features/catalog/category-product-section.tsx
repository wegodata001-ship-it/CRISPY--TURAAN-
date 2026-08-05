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
import { useT } from "@/components/providers/locale-provider";
import { useLocalizedCategory } from "@/hooks/useLocalizedContent";
import { MOBILE_CATALOG_PAGE_SIZE, useIsMobile } from "@/hooks/useIsMobile";
import type { Category, Product } from "@/types";
import { cn } from "@/lib/utils";

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
  "grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:gap-4 md:gap-6 md:px-6 lg:grid-cols-4 xl:grid-cols-5";

interface CategoryProductSectionProps {
  category: Category;
  products: Product[];
  onProductClick: (product: Product) => void;
  defaultExpanded?: boolean;
}

export function CategoryProductSection({
  category,
  products,
  onProductClick,
  defaultExpanded = false,
}: CategoryProductSectionProps) {
  const t = useT();
  const localized = useLocalizedCategory(category);
  const isMobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState(
    defaultExpanded ? products.length : MOBILE_CATALOG_PAGE_SIZE
  );
  const prevCountRef = useRef(visibleCount);

  useEffect(() => {
    setVisibleCount(
      isMobile && !defaultExpanded ? MOBILE_CATALOG_PAGE_SIZE : products.length
    );
    prevCountRef.current = isMobile ? MOBILE_CATALOG_PAGE_SIZE : products.length;
  }, [products.length, isMobile, defaultExpanded, category.id]);

  if (products.length === 0) return null;

  const displayed = isMobile && !defaultExpanded ? products.slice(0, visibleCount) : products;
  const hasMore = isMobile && !defaultExpanded && visibleCount < products.length;
  const animateFrom = prevCountRef.current;

  const loadMore = () => {
    prevCountRef.current = visibleCount;
    setVisibleCount((c) => Math.min(c + MOBILE_CATALOG_PAGE_SIZE, products.length));
  };

  const Icon = iconMap[category.icon] ?? Coffee;

  return (
    <section id={`category-${category.id}`} className="scroll-mt-36 py-6 md:py-8">
      <div className="mb-4 px-4 md:mb-5 md:px-6">
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
            const isNewBatch = index >= animateFrom;
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

      {hasMore && (
        <div className="mt-5 flex justify-center px-4 md:mt-6">
          <button
            type="button"
            onClick={loadMore}
            className={cn(
              "rounded-full border-2 border-coffee/15 bg-warm-white px-8 py-3 text-sm font-semibold text-coffee",
              "shadow-soft transition-all hover:border-turquoise hover:text-turquoise hover:shadow-elevated",
              "active:scale-[0.98]"
            )}
          >
            {t("catalog.showMore")}
          </button>
        </div>
      )}
    </section>
  );
}

export { GRID_CLASS as CATALOG_GRID_CLASS };
