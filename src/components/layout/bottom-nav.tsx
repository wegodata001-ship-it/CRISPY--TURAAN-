"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingBag, ClipboardList, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useCart } from "@/features/cart/cart-context";
import { useT } from "@/components/providers/locale-provider";

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount, openCart } = useCart();
  const t = useT();

  const navItems = [
    { href: "/", labelKey: "nav.home", icon: Home, exact: true },
    { href: "/catalog", labelKey: "nav.catalog", icon: LayoutGrid },
    { href: "/cart", labelKey: "nav.cart", icon: ShoppingBag, isCart: true },
    { href: "/orders", labelKey: "nav.orders", icon: ClipboardList },
    { href: "/account", labelKey: "nav.account", icon: User },
  ];

  if (pathname.startsWith("/admin")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-beige-dark/15 bg-warm-white lg:hidden">
      <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)] pt-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          const label = t(item.labelKey);

          if (item.isCart) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={openCart}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-turquoise" : "text-coffee/45"
                  )}
                  strokeWidth={1.75}
                />
                {itemCount > 0 && (
                  <span className="absolute top-1 end-[calc(50%-18px)] flex h-4 min-w-4 items-center justify-center rounded-full bg-turquoise px-1 text-[9px] font-bold text-warm-white">
                    {itemCount}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-turquoise" : "text-coffee/45"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-0.5 py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-dot"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-turquoise"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-turquoise" : "text-coffee/45"
                )}
                strokeWidth={1.75}
              />
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-turquoise" : "text-coffee/45"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
