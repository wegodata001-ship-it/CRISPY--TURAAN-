"use client";

import { CartPanel } from "@/features/cart/cart-panel";
import { cn } from "@/lib/utils";

export function CartSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "sticky top-[88px] hidden h-[calc(100vh-7rem)] w-full shrink-0 lg:block",
        className
      )}
    >
      <div className="flex h-full flex-col rounded-2xl bg-warm-white p-5 shadow-soft ring-1 ring-beige-dark/15">
        <CartPanel />
      </div>
    </aside>
  );
}
