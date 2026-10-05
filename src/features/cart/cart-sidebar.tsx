"use client";

import { CartPanel } from "@/features/cart/cart-panel";
import { useCart } from "@/features/cart/cart-context";
import { cn } from "@/lib/utils";

export function CartSidebar({ className }: { className?: string }) {
  const { itemCount } = useCart();

  return (
    <aside
      className={cn(
        "sticky top-[80px] hidden w-full max-w-[360px] shrink-0 lg:block",
        itemCount > 0 ? "max-h-[calc(100vh-7rem)]" : "h-auto",
        className
      )}
    >
      <div
        className={cn(
          "flex flex-col rounded-2xl bg-warm-white p-5 shadow-soft ring-1 ring-beige-dark/15",
          itemCount > 0 && "h-full min-h-0 overflow-hidden"
        )}
      >
        <CartPanel />
      </div>
    </aside>
  );
}
