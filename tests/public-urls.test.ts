import { describe, expect, it } from "vitest";
import { getAdminQrLinks } from "@/lib/admin-qr-links";
import {
  PRODUCTION_ADMIN_URL,
  PRODUCTION_CUSTOMER_URL,
  PRODUCTION_MENU_URL,
  PRODUCTION_ORDER_URL,
  getCustomerUrl,
  getMenuUrl,
  getOrderUrl,
  normalizePublicUrl,
} from "@/lib/public-urls";

describe("public production URLs", () => {
  it("never normalizes localhost into a customer URL", () => {
    expect(normalizePublicUrl("https://localhost", PRODUCTION_MENU_URL)).toBe(
      PRODUCTION_MENU_URL
    );
    expect(normalizePublicUrl("https://menu.localhost", PRODUCTION_MENU_URL)).toBe(
      PRODUCTION_MENU_URL
    );
    expect(normalizePublicUrl("http://127.0.0.1:3000", PRODUCTION_ORDER_URL)).toBe(
      PRODUCTION_ORDER_URL
    );
  });

  it("keeps verified production URLs", () => {
    expect(normalizePublicUrl(PRODUCTION_ADMIN_URL, PRODUCTION_ADMIN_URL)).toBe(
      PRODUCTION_ADMIN_URL
    );
    expect(getMenuUrl()).not.toMatch(/localhost/i);
    expect(getOrderUrl()).not.toMatch(/localhost/i);
  });
});

describe("admin QR links", () => {
  it("uses the same production URL for menu and order cards", () => {
    const links = getAdminQrLinks();
    const menu = links.find((link) => link.id === "menu");
    const order = links.find((link) => link.id === "order");

    expect(menu?.url).toBe(getMenuUrl());
    expect(order?.url).toBe(getOrderUrl());
    expect(menu?.url).toMatch(/^https:\/\//);
    expect(order?.url).toMatch(/^https:\/\//);
    expect(menu?.url).not.toMatch(/localhost/i);
    expect(order?.url).not.toMatch(/localhost/i);
    expect(menu?.url).toBe(PRODUCTION_MENU_URL);
    expect(order?.url).toBe(PRODUCTION_CUSTOMER_URL);
    expect(menu?.url).not.toMatch(/crispy-turaan\.vercel\.app/i);
    expect(order?.url).not.toMatch(/crispy-turaan\.vercel\.app/i);
    expect(menu?.url).not.toContain("/menu-display");
  });

  it("rejects retired Vercel customer hosts", () => {
    expect(
      normalizePublicUrl("https://crispy-turaan.vercel.app/menu-display", PRODUCTION_MENU_URL)
    ).toBe(PRODUCTION_MENU_URL);
    expect(normalizePublicUrl("https://crispy-turaan.vercel.app", PRODUCTION_CUSTOMER_URL)).toBe(
      PRODUCTION_CUSTOMER_URL
    );
    expect(getMenuUrl()).toBe("https://menu.almostafachicken.com");
    expect(getCustomerUrl()).toBe("https://almostafachicken.com");
    expect(getOrderUrl()).toBe(getCustomerUrl());
  });
});
