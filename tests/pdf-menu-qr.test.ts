import { describe, expect, it } from "vitest";
import {
  getPublicOrderUrl,
  getPublicSiteUrl,
  isPublicCustomerUrl,
  PRODUCTION_SITE_URL,
  resolveQrTargetUrl,
} from "@/lib/site-url";

describe("public site URL", () => {
  it("uses the configured public site URL only", () => {
    expect(getPublicSiteUrl()).toBe(PRODUCTION_SITE_URL);
    expect(getPublicOrderUrl()).toBe(PRODUCTION_SITE_URL ? `${PRODUCTION_SITE_URL}/` : "/");
  });

  it("rejects localhost, LAN IPs, and Vercel preview hosts", () => {
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
    const fallback = getPublicOrderUrl();
    expect(resolveQrTargetUrl("http://localhost:3000")).toBe(fallback);
    expect(resolveQrTargetUrl("http://127.0.0.1:3000/admin/menu-builder")).toBe(fallback);
    expect(resolveQrTargetUrl("https://project-abc-git-branch.vercel.app")).toBe(fallback);
    expect(resolveQrTargetUrl("not a url")).toBe(fallback);
    expect(resolveQrTargetUrl("https://example.com/")).toBe("https://example.com/");
  });
});
