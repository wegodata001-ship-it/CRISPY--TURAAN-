"use client";

import { ProductCard } from "./product-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyStateBackground } from "@/components/brand/store-image";
import { Logo } from "@/components/brand/logo";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  loading: boolean;
}

export function ProductGrid({ products, loading }: ProductGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-4 md:px-6 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] rounded-2xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyStateBackground className="mx-4 md:mx-6">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Logo size="md" href={undefined} />
          <h3 className="mt-4 text-lg font-semibold text-dark-brown">
            No products found
          </h3>
          <p className="mt-1 text-sm text-coffee/60">
            Try adjusting your search or filters
          </p>
        </div>
      </EmptyStateBackground>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 md:grid-cols-3 md:gap-4 md:px-6 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
