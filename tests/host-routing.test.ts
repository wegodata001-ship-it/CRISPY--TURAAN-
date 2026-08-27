import { describe, expect, it } from "vitest";
import {
  adminPath,
  isPortalHost,
  shouldBlockAdminOnHost,
  shouldHideCustomerChrome,
  toInternalAdminPath,
  toPortalPath,
} from "@/lib/domains/host-routing";

describe("host-routing", () => {
  it("detects portal host", () => {
    expect(isPortalHost("portal.mishkatcafe.dev")).toBe(true);
    expect(isPortalHost("mishkatcafe.dev")).toBe(false);
    expect(isPortalHost("localhost:3000")).toBe(false);
  });

  it("blocks /admin on public production host only", () => {
    expect(shouldBlockAdminOnHost("mishkatcafe.dev")).toBe(true);
    expect(shouldBlockAdminOnHost("portal.mishkatcafe.dev")).toBe(false);
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
    expect(adminPath("login", "portal")).toBe("/login");
    expect(adminPath("", "portal")).toBe("/");
  });

  it("hides customer chrome on portal and /admin", () => {
    expect(shouldHideCustomerChrome("/products", "portal.mishkatcafe.dev")).toBe(true);
    expect(shouldHideCustomerChrome("/catalog", "mishkatcafe.dev")).toBe(false);
    expect(shouldHideCustomerChrome("/admin/products", "localhost")).toBe(true);
  });
});
