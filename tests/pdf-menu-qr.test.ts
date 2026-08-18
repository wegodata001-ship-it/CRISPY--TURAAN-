import { describe, expect, it } from "vitest";
import {
  getPublicOrderUrl,
  getPublicSiteUrl,
  isPublicCustomerUrl,
  PRODUCTION_SITE_URL,
  resolveQrTargetUrl,
} from "@/lib/site-url";

describe("public site URL", () => {
  it("defaults to the live mshkah storefront", () => {
    expect(getPublicSiteUrl()).toBe(PRODUCTION_SITE_URL);
    expect(getPublicOrderUrl()).toBe("https://mshkah.vercel.app/");
  });

  it("rejects localhost, LAN IPs, and Vercel preview hosts", () => {
    expect(isPublicCustomerUrl("http://localhost:3000")).toBe(false);
    expect(isPublicCustomerUrl("http://127.0.0.1:3000")).toBe(false);
    expect(isPublicCustomerUrl("http://192.168.1.20:3000")).toBe(false);
    expect(isPublicCustomerUrl("https://mshkah-git-feat-xyz.vercel.app")).toBe(false);
    expect(isPublicCustomerUrl("https://mshkah.vercel.app/")).toBe(true);
  });

  it("encodes the production homepage even when given a local origin", () => {
    expect(resolveQrTargetUrl("http://localhost:3000")).toBe("https://mshkah.vercel.app/");
    expect(resolveQrTargetUrl("http://127.0.0.1:3000/admin/menu-builder")).toBe("https://mshkah.vercel.app/");
    expect(resolveQrTargetUrl("https://project-abc-git-branch.vercel.app")).toBe("https://mshkah.vercel.app/");
    expect(resolveQrTargetUrl("not a url")).toBe("https://mshkah.vercel.app/");
    expect(resolveQrTargetUrl("https://mshkah.vercel.app/")).toBe("https://mshkah.vercel.app/");
  });
});
