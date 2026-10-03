import { describe, expect, it } from "vitest";
import {
  isDoubleEncodedStoragePath,
  menuImageProxyUrl,
  resolveMenuImageSrc,
  sanitizeMenuImageUrl,
} from "@/lib/pdf-menu/menu-image";

const FIREBASE =
  "https://firebasestorage.googleapis.com/v0/b/crispy-d0bf7.firebasestorage.app/o/products%2Fnew-1786.jpg?alt=media&token=abc";

describe("menu image URLs", () => {
  it("keeps a valid Firebase download URL as stored", () => {
    expect(sanitizeMenuImageUrl(FIREBASE)).toBe(FIREBASE);
    expect(isDoubleEncodedStoragePath(FIREBASE)).toBe(false);
  });

  it("rejects empty, blob, and malformed values", () => {
    expect(sanitizeMenuImageUrl("")).toBeNull();
    expect(sanitizeMenuImageUrl("undefined")).toBeNull();
    expect(sanitizeMenuImageUrl("blob:http://localhost/1")).toBeNull();
    expect(sanitizeMenuImageUrl(null)).toBeNull();
  });

  it("does not double-encode when building the export proxy URL", () => {
    const proxied = menuImageProxyUrl(FIREBASE);
    const passed = new URL(proxied, "http://localhost:3000").searchParams.get("url");
    expect(passed).toBe(FIREBASE);
    expect(passed).toContain("products%2F");
    expect(passed).not.toContain("products%252F");
  });

  it("uses a same-origin proxy only in export mode", () => {
    expect(resolveMenuImageSrc(FIREBASE, "preview")).toBe(FIREBASE);
    expect(resolveMenuImageSrc(FIREBASE, "export")).toMatch(/^\/api\/media\/proxy\?url=/);
    expect(resolveMenuImageSrc("/logo-transparent.png", "export")).toBe("/logo-transparent.png");
  });
});
