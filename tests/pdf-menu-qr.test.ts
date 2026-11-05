import { afterEach, describe, expect, it } from "vitest";
import {
  getPublicOrderUrl,
  getPublicSiteUrl,
  isPublicCustomerUrl,
  PRODUCTION_SITE_URL,
  resolveQrTargetUrl,
} from "@/lib/site-url";

const KEYS = [
  "NEXT_PUBLIC_CRISPY_STAGING_MODE",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_CUSTOMER_URL",
  "NEXT_PUBLIC_ORDER_URL",
  "VERCEL_ENV",
] as const;

const saved: Record<string, string | undefined> = {};
for (const key of KEYS) saved[key] = process.env[key];

afterEach(() => {
  for (const key of KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("public site URL", () => {
  it("uses the configured public site URL only", () => {
    for (const key of KEYS) delete process.env[key];
    expect(getPublicSiteUrl()).toBe(PRODUCTION_SITE_URL);
    expect(getPublicOrderUrl()).toBe(PRODUCTION_SITE_URL ? `${PRODUCTION_SITE_URL}/` : "/");
  });

  it("rejects localhost, LAN IPs, and Vercel preview hosts", () => {
    for (const key of KEYS) delete process.env[key];
    expect(isPublicCustomerUrl("http://localhost:3000")).toBe(false);
    expect(isPublicCustomerUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isPublicCustomerUrl("http://192.168.1.20:3000")).toBe(false);
    expect(isPublicCustomerUrl("https://crispy-git-feat-xyz.vercel.app")).toBe(false);
    expect(isPublicCustomerUrl("https://crispy-turaan.vercel.app")).toBe(false);
    expect(isPublicCustomerUrl("https://crispy-turaan.vercel.app/menu-display")).toBe(false);
    expect(isPublicCustomerUrl("https://example.com/")).toBe(true);
    expect(isPublicCustomerUrl("https://almostafachicken.com/")).toBe(true);
  });

  it("does not encode localhost or preview hosts as the public order URL", () => {
    for (const key of KEYS) delete process.env[key];
    const fallback = getPublicOrderUrl();
    expect(resolveQrTargetUrl("http://localhost:3000")).toBe(fallback);
    expect(resolveQrTargetUrl("http://127.0.0.1:3000/admin/menu-builder")).toBe(fallback);
    expect(resolveQrTargetUrl("https://project-abc-git-branch.vercel.app")).toBe(fallback);
    expect(resolveQrTargetUrl("not a url")).toBe(fallback);
    expect(resolveQrTargetUrl("https://example.com/")).toBe("https://example.com/");
  });
});
