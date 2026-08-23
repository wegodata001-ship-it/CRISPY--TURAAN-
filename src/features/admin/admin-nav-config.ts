import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Tags,
  Layers,
  Link2,
  GitBranch,
  ClipboardList,
  Users,
  ImageIcon,
  MessageSquare,
  UserCog,
  Settings,
  FileText,
  Printer,
} from "lucide-react";

export type AdminNavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

export type AdminNavGroup = {
  labelKey: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    labelKey: "admin.nav.group.overview",
    items: [{ href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard, exact: true }],
  },
  {
    labelKey: "admin.nav.group.catalog",
    items: [
      { href: "/admin/products", labelKey: "admin.products", icon: Package },
      { href: "/admin/categories", labelKey: "admin.categories", icon: Tags },
      { href: "/admin/modifier-groups", labelKey: "admin.modifierManagement", icon: Layers },
      { href: "/admin/product-builder", labelKey: "admin.productAssignments", icon: Link2 },
      { href: "/admin/business-rules", labelKey: "admin.selectionRules", icon: GitBranch },
    ],
  },
  {
    labelKey: "admin.nav.group.sales",
    items: [
      { href: "/admin/orders", labelKey: "admin.orders", icon: ClipboardList },
      { href: "/admin/customers", labelKey: "admin.customers", icon: Users },
    ],
  },
  {
    labelKey: "admin.nav.group.content",
    items: [
      { href: "/admin/banners", labelKey: "admin.banners", icon: ImageIcon },
      { href: "/admin/menu-builder", labelKey: "admin.menuBuilder", icon: FileText },
    ],
  },
  {
    labelKey: "admin.nav.group.system",
    items: [
      { href: "/admin/assistant", labelKey: "admin.assistantManager", icon: MessageSquare },
      { href: "/admin/printer-test", labelKey: "admin.printerTest", icon: Printer },
      { href: "/admin/users", labelKey: "admin.users", icon: UserCog, adminOnly: true },
      { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
    ],
  },
];

/** Map pathname → page title translation key */
export const ADMIN_PAGE_TITLES: Record<string, string> = {
  "/admin": "admin.dashboard",
  "/admin/products": "admin.products",
  "/admin/categories": "admin.categories",
  "/admin/modifier-groups": "admin.modifiers.title",
  "/admin/product-builder": "admin.productAssignments",
  "/admin/business-rules": "admin.selectionRules",
  "/admin/orders": "admin.orders.title",
  "/admin/customers": "admin.customers.title",
  "/admin/banners": "admin.banners.title",
  "/admin/menu-builder": "admin.menuBuilder",
  "/admin/media": "admin.media.title",
  "/admin/assistant": "admin.assistant.title",
  "/admin/printer-test": "admin.printerTest.title",
  "/admin/users": "admin.users.title",
  "/admin/settings": "admin.settings.title",
};

export function getAdminPageTitleKey(pathname: string): string {
  if (ADMIN_PAGE_TITLES[pathname]) return ADMIN_PAGE_TITLES[pathname];
  const match = Object.keys(ADMIN_PAGE_TITLES)
    .filter((k) => k !== "/admin")
    .find((k) => pathname.startsWith(k));
  return match ? ADMIN_PAGE_TITLES[match] : "admin.dashboard";
}
