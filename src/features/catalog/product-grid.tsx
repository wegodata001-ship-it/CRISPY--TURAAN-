"use client";

import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateBackground } from "@/components/brand/store-image";
import { Logo } from "@/components/brand/logo";
import { useT } from "@/components/providers/locale-provider";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  onProductClick?: (product: Product) => void;
}

export function ProductGrid({
  products,
  loading,
  onProductClick,
}: ProductGridProps) {
  const t = useT();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-5 md:px-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyStateBackground className="mx-4 md:mx-6">
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <Logo size="md" href={undefined} />
          <h3 className="mt-4 text-lg font-semibold text-dark-brown">
            {t("catalog.noProducts")}
          </h3>
          <p className="mt-1 text-sm text-coffee/60">
            {t("catalog.noProductsHint")}
          </p>
        </div>
      </EmptyStateBackground>
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
