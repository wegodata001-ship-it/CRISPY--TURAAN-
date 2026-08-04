"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-beige/60",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-warm-white/40 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

function ProductCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-warm-white shadow-soft ring-1 ring-beige-dark/15">
      <Skeleton className={cn("w-full", compact ? "aspect-square" : "aspect-[4/5]")} />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 md:grid-cols-3 md:px-6 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton };
