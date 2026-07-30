"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  Users,
  ImageIcon,
  Store,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/banners", label: "Banners", icon: ImageIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-beige-dark/20 lg:bg-warm-white/80 lg:backdrop-blur-md">
      <div className="flex flex-col h-full p-5">
        <Logo size="md" href="/admin" showText showTagline />

        <nav className="mt-8 flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-coffee text-warm-white shadow-soft"
                    : "text-coffee/70 hover:bg-beige/60 hover:text-dark-brown"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-beige-dark/20 pt-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-coffee/60 hover:bg-beige/40 hover:text-dark-brown transition-colors"
          >
            <Store className="h-4 w-4" />
            View Store
          </Link>
          <p className="px-3 text-[10px] text-coffee/40">{BRAND.name} Admin</p>
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden border-b border-beige-dark/20 bg-warm-white/90 backdrop-blur-md">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/account" className="text-coffee/50 hover:text-coffee">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <Logo size="xs" href="/admin" />
        <span className="text-sm font-semibold text-dark-brown">Admin</span>
      </div>
      <div className="hide-scrollbar flex gap-1 overflow-x-auto px-4 pb-3">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                isActive
                  ? "bg-coffee text-warm-white"
                  : "bg-beige/60 text-coffee"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
