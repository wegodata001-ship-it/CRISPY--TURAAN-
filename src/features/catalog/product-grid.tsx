"use client";

import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { useT } from "@/components/providers/locale-provider";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
  variant?: "row" | "featured";
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
  variant = "row",
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

  if (variant === "featured") {
    return (
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
            variant="featured"
            onClick={onProductClick ? () => onProductClick(product) : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          variant="row"
          onClick={onProductClick ? () => onProductClick(product) : undefined}
        />
      ))}
    </div>
  );
}
