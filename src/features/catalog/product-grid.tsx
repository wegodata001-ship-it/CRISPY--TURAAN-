"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { MOBILE_CATALOG_PAGE_SIZE } from "@/hooks/useIsMobile";
import { CATALOG_GRID_CLASS } from "@/features/catalog/category-product-section";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
  /** When false, show all products without pagination */
  incremental?: boolean;
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
  incremental = true,
}: ProductGridProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const prevCountRef = useRef(MOBILE_CATALOG_PAGE_SIZE);

  useEffect(() => {
    setExpanded(false);
    prevCountRef.current = MOBILE_CATALOG_PAGE_SIZE;
  }, [products]);

  if (loading) {
    return <ProductGridSkeleton count={3} />;
  }

  if (products.length === 0) {
    return (
      <div className="mx-4 md:mx-6">
        <EmptyState
          icon={Search}
          title={t("catalog.noProducts")}
          description={t("catalog.noProductsHint")}
          actionLabel={t("cart.continueShopping")}
          actionHref="/"
        />
      </div>
    );
  }

  const shouldPaginate = incremental && products.length > MOBILE_CATALOG_PAGE_SIZE;
  const displayed =
    shouldPaginate && !expanded ? products.slice(0, MOBILE_CATALOG_PAGE_SIZE) : products;
  const animateFrom = prevCountRef.current;

  const toggleExpanded = () => {
    if (!expanded) {
      prevCountRef.current = MOBILE_CATALOG_PAGE_SIZE;
    }
    setExpanded((v) => !v);
  };

  return (
    <>
      <div className={CATALOG_GRID_CLASS}>
        <div className="px-3 sm:px-4">
        <AnimatePresence mode="popLayout">
          {displayed.map((product, index) => {
            const isNewBatch = expanded && index >= animateFrom;
            return (
              <motion.div
                key={product.id}
                layout
                initial={isNewBatch ? { opacity: 0, y: 12 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  duration: 0.3,
                  delay: isNewBatch ? (index - animateFrom) * 0.05 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <ProductCard
                  product={product}
                  index={index}
                  onClick={onProductClick ? () => onProductClick(product) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>

      {shouldPaginate && (
        <div className="mt-4 flex justify-center px-4">
          <button
            type="button"
            onClick={toggleExpanded}
            className={cn(
              "rounded-full border border-coffee/15 bg-warm-white px-6 py-2.5 text-sm font-semibold text-coffee",
              "shadow-soft transition-all hover:border-turquoise hover:text-turquoise",
              "active:scale-[0.98]"
            )}
          >
            {expanded ? t("catalog.showLess") : t("catalog.showMore")}
          </button>
        </div>
      )}
    </>
  );
}
