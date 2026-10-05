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

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-warm-white ring-1 ring-beige-dark/20">
      <Skeleton className="h-[180px] w-full rounded-none sm:h-[200px] md:h-[240px]" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid justify-items-stretch gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))] md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton };
