"use client";

import { ProductCard } from "./product-card";
import { ProductGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useT } from "@/components/providers/locale-provider";
import { Search } from "lucide-react";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
}

export function ProductGrid({ products, loading, onProductClick }: ProductGridProps) {
  const t = useT();

  if (loading) {
    return <ProductGridSkeleton count={8} />;
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

  return (
    <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:gap-6 md:px-6 lg:grid-cols-4 xl:grid-cols-5">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          index={index}
          onClick={onProductClick ? () => onProductClick(product) : undefined}
        />
      ))}
    </div>
  );
}
