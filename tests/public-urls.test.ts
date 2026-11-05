import { afterEach, describe, expect, it } from "vitest";
import { getAdminQrLinks } from "@/lib/admin-qr-links";
import {
  PRODUCTION_ADMIN_URL,
  PRODUCTION_CUSTOMER_URL,
  PRODUCTION_MENU_URL,
  PRODUCTION_ORDER_URL,
  STAGING_LOCAL_URL,
  StagingPublicUrlError,
  assertPublicUrlSafeForMode,
  getAdminUrl,
  getCustomerUrl,
  getMenuUrl,
  getOrderUrl,
  isAllowedStagingLocalUrl,
  isCrispyStagingLocalMode,
  normalizePublicUrl,
} from "@/lib/public-urls";
import {
  getPublicOrderUrl,
  getPublicSiteUrl,
  isPublicCustomerUrl,
  resolveQrTargetUrl,
} from "@/lib/site-url";

const URL_ENV_KEYS = [
  "NEXT_PUBLIC_CRISPY_STAGING_MODE",
  "NEXT_PUBLIC_ADMIN_URL",
  "NEXT_PUBLIC_PORTAL_URL",
  "NEXT_PUBLIC_CUSTOMER_URL",
  "NEXT_PUBLIC_ORDER_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_MENU_URL",
  "NEXT_PUBLIC_QR_LINK_1",
  "NEXT_PUBLIC_QR_LINK_2",
  "VERCEL_ENV",
] as const;

const savedEnv: Record<string, string | undefined> = {};

function snapshotEnv() {
  for (const key of URL_ENV_KEYS) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of URL_ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function clearUrlEnv() {
  for (const key of URL_ENV_KEYS) {
    delete process.env[key];
  }
}

snapshotEnv();
afterEach(() => {
  restoreEnv();
});

describe("public production URLs", () => {
  it("never normalizes localhost into a customer URL", () => {
    clearUrlEnv();
    expect(normalizePublicUrl("https://localhost", PRODUCTION_MENU_URL)).toBe(PRODUCTION_MENU_URL);
    expect(normalizePublicUrl("https://menu.localhost", PRODUCTION_MENU_URL)).toBe(PRODUCTION_MENU_URL);
    expect(normalizePublicUrl("http://127.0.0.1:3000", PRODUCTION_ORDER_URL)).toBe(PRODUCTION_ORDER_URL);
  });

  it("keeps verified production URLs", () => {
    clearUrlEnv();
    expect(normalizePublicUrl(PRODUCTION_ADMIN_URL, PRODUCTION_ADMIN_URL)).toBe(PRODUCTION_ADMIN_URL);
    expect(getMenuUrl()).not.toMatch(/localhost/i);
    expect(getOrderUrl()).not.toMatch(/localhost/i);
  });
});

describe("admin QR links", () => {
  it("uses the same production URL for menu and order cards", () => {
    clearUrlEnv();
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
    clearUrlEnv();
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

describe("staging local URL isolation", () => {
  function enableStagingLocal(overrides: Record<string, string> = {}) {
    clearUrlEnv();
    process.env.NEXT_PUBLIC_CRISPY_STAGING_MODE = "true";
    process.env.NEXT_PUBLIC_ADMIN_URL = STAGING_LOCAL_URL;
    process.env.NEXT_PUBLIC_PORTAL_URL = STAGING_LOCAL_URL;
    process.env.NEXT_PUBLIC_CUSTOMER_URL = STAGING_LOCAL_URL;
    process.env.NEXT_PUBLIC_ORDER_URL = STAGING_LOCAL_URL;
    process.env.NEXT_PUBLIC_SITE_URL = STAGING_LOCAL_URL;
    process.env.NEXT_PUBLIC_MENU_URL = STAGING_LOCAL_URL;
    for (const [key, value] of Object.entries(overrides)) {
      process.env[key] = value;
    }
  }

  it("detects staging mode and ignores it on Vercel production", () => {
    clearUrlEnv();
    process.env.NEXT_PUBLIC_CRISPY_STAGING_MODE = "true";
    expect(isCrispyStagingLocalMode()).toBe(true);
    process.env.VERCEL_ENV = "production";
    expect(isCrispyStagingLocalMode()).toBe(false);
  });

  it("allows only http://localhost:3000 as a staging local URL", () => {
    expect(isAllowedStagingLocalUrl("http://localhost:3000")).toBe(true);
    expect(isAllowedStagingLocalUrl("http://localhost:3000/")).toBe(true);
    expect(isAllowedStagingLocalUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isAllowedStagingLocalUrl("http://localhost")).toBe(false);
    expect(isAllowedStagingLocalUrl("https://localhost:3000")).toBe(false);
    expect(isAllowedStagingLocalUrl("https://almostafachicken.com")).toBe(false);
  });

  it("returns localhost for all public URL helpers in staging mode", () => {
    enableStagingLocal();
    expect(getAdminUrl()).toBe(STAGING_LOCAL_URL);
    expect(getMenuUrl()).toBe(STAGING_LOCAL_URL);
    expect(getCustomerUrl()).toBe(STAGING_LOCAL_URL);
    expect(getOrderUrl()).toBe(STAGING_LOCAL_URL);
    expect(getPublicSiteUrl()).toBe(STAGING_LOCAL_URL);
    expect(getPublicOrderUrl()).toBe(`${STAGING_LOCAL_URL}/`);
    expect(resolveQrTargetUrl()).toBe(`${STAGING_LOCAL_URL}/`);
    expect(resolveQrTargetUrl("http://localhost:3000/cart")).toBe("http://localhost:3000/cart");
  });

  it("never falls back to the live customer domain when staging env points at production", () => {
    enableStagingLocal({
      NEXT_PUBLIC_CUSTOMER_URL: PRODUCTION_CUSTOMER_URL,
      NEXT_PUBLIC_ORDER_URL: PRODUCTION_CUSTOMER_URL,
      NEXT_PUBLIC_SITE_URL: PRODUCTION_CUSTOMER_URL,
      NEXT_PUBLIC_MENU_URL: PRODUCTION_MENU_URL,
      NEXT_PUBLIC_ADMIN_URL: PRODUCTION_ADMIN_URL,
    });

    expect(getCustomerUrl()).toBe(STAGING_LOCAL_URL);
    expect(getOrderUrl()).toBe(STAGING_LOCAL_URL);
    expect(getMenuUrl()).toBe(STAGING_LOCAL_URL);
    expect(getAdminUrl()).toBe(STAGING_LOCAL_URL);
    expect(getPublicSiteUrl()).toBe(STAGING_LOCAL_URL);
    expect(resolveQrTargetUrl(PRODUCTION_CUSTOMER_URL)).toBe(`${STAGING_LOCAL_URL}/`);
    expect(getCustomerUrl()).not.toContain("almostafachicken.com");
    expect(getMenuUrl()).not.toContain("almostafachicken.com");
    expect(getAdminUrl()).not.toContain("crispy-turaan.vercel.app");
  });

  it("normalizes localhost:3000 in staging and refuses production fallbacks", () => {
    enableStagingLocal();
    expect(normalizePublicUrl("http://localhost:3000", PRODUCTION_MENU_URL)).toBe(STAGING_LOCAL_URL);
    expect(normalizePublicUrl("https://almostafachicken.com", PRODUCTION_MENU_URL)).toBe(
      STAGING_LOCAL_URL
    );
    expect(normalizePublicUrl("http://127.0.0.1:3000", PRODUCTION_ORDER_URL)).toBe(STAGING_LOCAL_URL);
  });

  it("treats localhost:3000 as a valid public URL only in staging mode", () => {
    clearUrlEnv();
    expect(isPublicCustomerUrl("http://localhost:3000")).toBe(false);
    enableStagingLocal();
    expect(isPublicCustomerUrl("http://localhost:3000")).toBe(true);
    expect(isPublicCustomerUrl(PRODUCTION_CUSTOMER_URL)).toBe(false);
  });

  it("throws a safe staging error instead of accepting a live customer URL", () => {
    enableStagingLocal();
    expect(() => assertPublicUrlSafeForMode(PRODUCTION_CUSTOMER_URL)).toThrow(StagingPublicUrlError);
    expect(assertPublicUrlSafeForMode(STAGING_LOCAL_URL)).toBe(STAGING_LOCAL_URL);
  });

  it("keeps admin QR cards on localhost in staging mode", () => {
    enableStagingLocal();
    const links = getAdminQrLinks();
    expect(links.map((link) => link.url)).toEqual([STAGING_LOCAL_URL, STAGING_LOCAL_URL]);
  });
});
