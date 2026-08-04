"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Tags,
  ClipboardList,
  Users,
  ImageIcon,
  Store,
  Settings,
  UserCog,
  FolderOpen,
  Bot,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BRAND } from "@/lib/brand";
import { useT } from "@/components/providers/locale-provider";
import { useAuth } from "@/components/providers/auth-provider";

const navItems = [
  { href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", labelKey: "admin.products", icon: Package },
  { href: "/admin/categories", labelKey: "admin.categories", icon: Tags },
  { href: "/admin/orders", labelKey: "admin.orders", icon: ClipboardList },
  { href: "/admin/customers", labelKey: "admin.customers", icon: Users },
  { href: "/admin/banners", labelKey: "admin.banners", icon: ImageIcon },
  { href: "/admin/ai-assistant", labelKey: "admin.aiAssistant", icon: Bot },
  { href: "/admin/media", labelKey: "admin.media", icon: FolderOpen },
  { href: "/admin/users", labelKey: "admin.users", icon: UserCog, adminOnly: true },
  { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "Admin"
  );

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-coffee text-warm-white shadow-soft dark:bg-turquoise dark:text-warm-white"
                : "text-coffee/70 hover:bg-beige/60 hover:text-dark-brown dark:text-warm-white/70 dark:hover:bg-white/10 dark:hover:text-warm-white"
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "scale-110")} />
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const t = useT();

  return (
    <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-beige-dark/20 bg-warm-white/95 backdrop-blur-xl lg:flex dark:border-white/10 dark:bg-[#1a1412]/95">
      <div className="flex h-full flex-col p-5">
        <Logo size="md" href="/admin" showText showTagline />
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-beige-dark/20 pt-4 dark:border-white/10">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-coffee/60 transition-colors hover:bg-beige/40 dark:text-warm-white/60 dark:hover:bg-white/10"
          >
            <Store className="h-4 w-4" />
            {t("nav.home")}
          </Link>
          <p className="mt-2 px-3 text-[10px] text-coffee/40">{BRAND.name}</p>
        </div>
      </div>
    </aside>
  );
}

export function AdminMobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-dark-brown/50 lg:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-warm-white p-5 shadow-elevated lg:hidden dark:bg-[#1a1412]"
          >
            <div className="flex items-center justify-between">
              <Logo size="sm" href="/admin" showText />
              <button onClick={onClose} className="rounded-lg p-2 hover:bg-beige/40">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <LanguageSwitcher />
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavLinks onNavigate={onClose} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
