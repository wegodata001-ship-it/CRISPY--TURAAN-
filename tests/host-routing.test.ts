import { afterEach, describe, expect, it } from "vitest";
import {
  adminPath,
  isMenuAllowedApiPath,
  isMenuBlockedApiPath,
  isMenuHost,
  isOrderingPath,
  isPortalHost,
  isViewOnlyMenuSurface,
  shouldBlockAdminOnHost,
  shouldHideCustomerChrome,
  toInternalAdminPath,
  toPortalPath,
} from "@/lib/domains/host-routing";
import { filterMenuDisplayProducts } from "@/lib/menu/category-tree";
import type { Category, Product } from "@/types";

const HOST_ENV_KEYS = [
  "NEXT_PUBLIC_CRISPY_STAGING_MODE",
  "NEXT_PUBLIC_MENU_HOST",
  "NEXT_PUBLIC_PORTAL_HOST",
  "NEXT_PUBLIC_PUBLIC_HOST",
  "VERCEL_ENV",
] as const;

const savedHostEnv: Record<string, string | undefined> = {};
for (const key of HOST_ENV_KEYS) savedHostEnv[key] = process.env[key];

afterEach(() => {
  for (const key of HOST_ENV_KEYS) {
    const value = savedHostEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("host-routing", () => {
  it("detects portal host", () => {
    expect(isPortalHost("portal.example")).toBe(true);
    expect(isPortalHost("portal.almostafachicken.com")).toBe(true);
    expect(isPortalHost("shop.example")).toBe(false);
    expect(isPortalHost("localhost:3000")).toBe(false);
  });

  it("detects menu host", () => {
    expect(isMenuHost("menu.example")).toBe(true);
    expect(isMenuHost("menu.almostafachicken.com")).toBe(true);
    expect(isMenuHost("shop.example")).toBe(false);
    expect(isMenuHost("portal.example")).toBe(false);
  });

  it("keeps localhost as a unified surface even when MENU/PORTAL hosts are mis-set", () => {
    process.env.NEXT_PUBLIC_CRISPY_STAGING_MODE = "true";
    process.env.NEXT_PUBLIC_MENU_HOST = "localhost";
    process.env.NEXT_PUBLIC_PORTAL_HOST = "localhost";
    process.env.NEXT_PUBLIC_PUBLIC_HOST = "localhost";

    // Middleware must not rewrite /admin → menu-display on local staging.
    expect(isMenuHost("localhost:3000")).toBe(false);
    expect(isPortalHost("localhost:3000")).toBe(false);
    expect(shouldBlockAdminOnHost("localhost:3000")).toBe(false);
    expect(adminPath("login", "dev")).toBe("/admin/login");
    expect(adminPath("products", "dev")).toBe("/admin/products");
    expect(isOrderingPath("/checkout")).toBe(true);
    expect(isViewOnlyMenuSurface("localhost:3000", "/menu-display")).toBe(true);
    expect(isViewOnlyMenuSurface("localhost:3000", "/")).toBe(false);

    // Production-style hosts are unchanged.
    expect(isMenuHost("menu.almostafachicken.com")).toBe(true);
    expect(isPortalHost("portal.almostafachicken.com")).toBe(true);
    expect(shouldBlockAdminOnHost("almostafachicken.com")).toBe(true);
  });

  it("allows only media proxy API on the menu host", () => {
    expect(isMenuAllowedApiPath("/api/media/proxy")).toBe(true);
    expect(isMenuBlockedApiPath("/api/orders")).toBe(true);
    expect(isMenuBlockedApiPath("/api/admin/users")).toBe(true);
    expect(isMenuBlockedApiPath("/api/auth/bootstrap")).toBe(true);
    expect(isMenuBlockedApiPath("/api/seed")).toBe(true);
    expect(isMenuBlockedApiPath("/api/media/proxy")).toBe(false);
  });

  it("blocks /admin on public and menu hosts", () => {
    expect(shouldBlockAdminOnHost("shop.example")).toBe(true);
    expect(shouldBlockAdminOnHost("menu.example")).toBe(true);
    expect(shouldBlockAdminOnHost("portal.example")).toBe(false);
    expect(shouldBlockAdminOnHost("localhost:3000")).toBe(false);
  });

  it("maps portal paths to internal admin routes", () => {
    expect(toInternalAdminPath("/")).toBe("/admin");
    expect(toInternalAdminPath("/login")).toBe("/admin/login");
    expect(toInternalAdminPath("/products")).toBe("/admin/products");
    expect(toInternalAdminPath("/admin/orders")).toBe("/admin/orders");
  });

  it("maps internal admin routes to clean portal paths", () => {
    expect(toPortalPath("/admin")).toBe("/");
    expect(toPortalPath("/admin/login")).toBe("/login");
    expect(toPortalPath("/admin/products")).toBe("/products");
  });

  it("builds surface-aware admin hrefs", () => {
    expect(adminPath("products", "portal")).toBe("/products");
    expect(adminPath("products", "dev")).toBe("/admin/products");
    expect(adminPath("costing", "dev")).toBe("/admin/costing");
    expect(adminPath("costing", "portal")).toBe("/costing");
    expect(adminPath("login", "portal")).toBe("/login");
    expect(adminPath("", "portal")).toBe("/");
  });

  it("hides customer chrome on portal, menu, and /admin", () => {
    expect(shouldHideCustomerChrome("/products", "portal.example")).toBe(true);
    expect(shouldHideCustomerChrome("/", "menu.example")).toBe(true);
    expect(shouldHideCustomerChrome("/menu-display", "localhost")).toBe(true);
    expect(shouldHideCustomerChrome("/catalog", "shop.example")).toBe(false);
    expect(shouldHideCustomerChrome("/admin/products", "localhost")).toBe(true);
  });

  it("flags ordering paths and view-only surface", () => {
    expect(isOrderingPath("/checkout")).toBe(true);
    expect(isOrderingPath("/cart")).toBe(true);
    expect(isOrderingPath("/orders")).toBe(true);
    expect(isViewOnlyMenuSurface("menu.example")).toBe(true);
    expect(isViewOnlyMenuSurface("localhost", "/menu-display")).toBe(true);
    expect(isViewOnlyMenuSurface("shop.example", "/")).toBe(false);
  });
});

describe("menu display product filter", () => {
  it("includes subcategory products under a root category", () => {
    const categories = [
      { id: "coffee", parentId: null, active: true, sortOrder: 1 },
      { id: "hot", parentId: "coffee", active: true, sortOrder: 1 },
    ] as Category[];
    const products = [
      {
        id: "1",
        categoryId: "coffee",
        subcategoryId: "hot",
        active: true,
        sortOrder: 1,
        isPopular: false,
      },
      {
        id: "2",
        categoryId: "desserts",
        active: true,
        sortOrder: 1,
        isPopular: false,
      },
    ] as Product[];

    const all = filterMenuDisplayProducts(products, null, categories);
    expect(all.map((p) => p.id)).toEqual(["1", "2"]);

    const coffee = filterMenuDisplayProducts(products, "coffee", categories);
    expect(coffee.map((p) => p.id)).toEqual(["1"]);
  });
});
