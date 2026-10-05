"use client";

import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import type { Product } from "@/types";

export const PRODUCT_GRID_CLASS =
  "grid justify-items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))] md:gap-5";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
  variant?: "row" | "featured" | "card";
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
}: ProductGridProps) {
  const t = useT();

  if (loading) {
    return <ProductGridSkeleton count={6} />;
  }

  if (products.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-coffee-light">
        {t("catalog.noProducts")}
      </p>
    );
  }

  return (
    <div className={PRODUCT_GRID_CLASS}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          variant="card"
          onClick={onProductClick ? () => onProductClick(product) : undefined}
        />
      ))}
    </div>
  );
}
