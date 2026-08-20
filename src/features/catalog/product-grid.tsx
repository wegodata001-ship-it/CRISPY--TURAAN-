"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { CATALOG_GRID_CLASS } from "@/features/catalog/category-product-section";
import { ShowMoreProductsButton } from "@/features/catalog/show-more-products-button";
import {
  CATALOG_PREVIEW_COUNT,
  getCatalogVisibleProducts,
  shouldShowCatalogExpand,
} from "@/lib/catalog/preview";
import { Search } from "lucide-react";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
  /** When false, show all products without the preview collapse. */
  incremental?: boolean;
  /** Controlled expand state (per-category from parent). */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
  incremental = true,
  expanded: expandedProp,
  onExpandedChange,
}: ProductGridProps) {
  const t = useT();
  const controlled = typeof onExpandedChange === "function";
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = controlled ? Boolean(expandedProp) : internalExpanded;
  const prevCountRef = useRef(CATALOG_PREVIEW_COUNT);

  useEffect(() => {
    if (controlled) return;
    setInternalExpanded(false);
    prevCountRef.current = CATALOG_PREVIEW_COUNT;
  }, [products, controlled]);

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

  const shouldPaginate = incremental && shouldShowCatalogExpand(products.length);
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
        <ShowMoreProductsButton
          totalCount={products.length}
          expanded={expanded}
          onToggle={toggleExpanded}
        />
      )}
    </>
  );
}
