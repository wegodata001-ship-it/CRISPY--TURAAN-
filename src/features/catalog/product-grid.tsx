"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { MOBILE_CATALOG_PAGE_SIZE, useIsMobile } from "@/hooks/useIsMobile";
import { CATALOG_GRID_CLASS } from "@/features/catalog/category-product-section";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
  /** When true, show all products on desktop; mobile always paginates unless limitDesktop is set */
  incrementalMobile?: boolean;
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
  incrementalMobile = true,
}: ProductGridProps) {
  const t = useT();
  const isMobile = useIsMobile();
  const [visibleCount, setVisibleCount] = useState(MOBILE_CATALOG_PAGE_SIZE);
  const prevCountRef = useRef(MOBILE_CATALOG_PAGE_SIZE);

  useEffect(() => {
    const initial = isMobile && incrementalMobile ? MOBILE_CATALOG_PAGE_SIZE : products.length;
    setVisibleCount(initial);
    prevCountRef.current = initial;
  }, [products, isMobile, incrementalMobile]);

  if (loading) {
    return <ProductGridSkeleton count={isMobile ? 6 : 8} />;
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

  const shouldPaginate = isMobile && incrementalMobile;
  const displayed = shouldPaginate ? products.slice(0, visibleCount) : products;
  const hasMore = shouldPaginate && visibleCount < products.length;
  const animateFrom = prevCountRef.current;

  const loadMore = () => {
    prevCountRef.current = visibleCount;
    setVisibleCount((c) => Math.min(c + MOBILE_CATALOG_PAGE_SIZE, products.length));
  };

  return (
    <>
      <div className={CATALOG_GRID_CLASS}>
        <AnimatePresence mode="popLayout">
          {displayed.map((product, index) => {
            const isNewBatch = shouldPaginate && index >= animateFrom;
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
                  onClick={onProductClick ? () => onProductClick(product) : undefined}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {hasMore && (
        <div className="mt-6 flex justify-center px-4 md:mt-8">
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
    </>
  );
}
