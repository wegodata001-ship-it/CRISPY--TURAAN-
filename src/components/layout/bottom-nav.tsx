"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, ClipboardList, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCart } from "@/features/cart/cart-context";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/catalog", label: "Catalog", icon: LayoutGrid },
  { href: "/cart", label: "Cart", icon: ShoppingBag, isCart: true },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="glass border-t border-beige-dark/20 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.isCart) {
              return (
                <button
                  key={item.href}
                  onClick={openCart}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1"
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-turquoise" : "text-coffee/50"
                    )}
                  />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-turquoise text-[9px] font-bold text-warm-white">
                      {itemCount}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-medium",
                      isActive ? "text-turquoise" : "text-coffee/50"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1"
              >
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute -top-2 h-0.5 w-8 rounded-full bg-turquoise"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-turquoise" : "text-coffee/50"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-turquoise" : "text-coffee/50"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
