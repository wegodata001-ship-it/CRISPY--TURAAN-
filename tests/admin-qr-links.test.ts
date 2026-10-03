import { describe, expect, it } from "vitest";
import { getAdminQrLinks } from "@/lib/admin-qr-links";
import { createQrPngDataUrl } from "@/lib/admin-qr-image";

describe("admin QR links", () => {
  it("exposes two public links from a single config", () => {
    const links = getAdminQrLinks();
    expect(links).toHaveLength(2);
    expect(links[0]?.id).toBe("menu");
    expect(links[1]?.id).toBe("order");
    expect(links[0]?.filename).toBe("crispy-qr-menu.png");
    expect(links[1]?.filename).toBe("crispy-qr-order.png");
    expect(links[0]?.url).toMatch(/^https:\/\//);
    expect(links[1]?.url).toMatch(/^https:\/\//);
    expect(links[0]?.url).not.toBe(links[1]?.url);
  });

  it("builds a PNG from the live URL", async () => {
    const [menu] = getAdminQrLinks();
    const png = await createQrPngDataUrl(menu!.url, 256);
    expect(png.startsWith("data:image/png;base64,")).toBe(true);
    expect(png.length).toBeGreaterThan(500);
  }, 15000);
});
