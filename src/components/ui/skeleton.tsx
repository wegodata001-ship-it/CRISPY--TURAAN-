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
    <div className="grid grid-cols-[72px_1fr_60px] items-center gap-3 py-4">
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
      </div>
      <Skeleton className="h-[60px] w-[60px] rounded-xl" />
    </div>
  );
}

function ProductGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-warm-white ring-1 ring-beige-dark/10">
      <div className="divide-y divide-beige-dark/12 px-3 sm:px-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export { Skeleton, ProductCardSkeleton, ProductGridSkeleton };
