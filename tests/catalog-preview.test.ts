import { describe, expect, it } from "vitest";
import {
  CATALOG_PREVIEW_COUNT,
  catalogExpandStorageKey,
  catalogRemainingCount,
  formatCatalogShowMoreLabel,
  getCatalogVisibleProducts,
  shouldShowCatalogExpand,
} from "@/lib/catalog/preview";

describe("catalog preview expand", () => {
  it("keeps preview count at 3", () => {
    expect(CATALOG_PREVIEW_COUNT).toBe(3);
  });

  it("does not show expand for 2 or 3 products", () => {
    expect(shouldShowCatalogExpand(2)).toBe(false);
    expect(shouldShowCatalogExpand(3)).toBe(false);
    expect(getCatalogVisibleProducts([1, 2], false)).toEqual([1, 2]);
    expect(getCatalogVisibleProducts([1, 2, 3], false)).toEqual([1, 2, 3]);
  });

  it("shows 3 of 4 collapsed and remaining count of 1", () => {
    expect(shouldShowCatalogExpand(4)).toBe(true);
    expect(getCatalogVisibleProducts([1, 2, 3, 4], false)).toEqual([1, 2, 3]);
    expect(catalogRemainingCount(4)).toBe(1);
    expect(getCatalogVisibleProducts([1, 2, 3, 4], true)).toEqual([1, 2, 3, 4]);
  });

  it("shows 3 of 12 collapsed and remaining count of 9", () => {
    const products = Array.from({ length: 12 }, (_, i) => i + 1);
    expect(getCatalogVisibleProducts(products, false)).toEqual([1, 2, 3]);
    expect(catalogRemainingCount(12)).toBe(9);
    expect(getCatalogVisibleProducts(products, true)).toHaveLength(12);
  });

  it("formats labels with remaining count", () => {
    const t = (key: string, fallback?: string) => {
      const map: Record<string, string> = {
        "catalog.showMoreOne": "הצג עוד מוצר אחד",
        "catalog.showMoreCount": "הצג עוד {count} מוצרים",
        "catalog.showMore": "הצג עוד",
      };
      return map[key] ?? fallback ?? key;
    };
    expect(formatCatalogShowMoreLabel(1, t)).toBe("הצג עוד מוצר אחד");
    expect(formatCatalogShowMoreLabel(9, t)).toBe("הצג עוד 9 מוצרים");
  });

  it("keeps expand keys independent per category", () => {
    expect(catalogExpandStorageKey("a")).toBe("cat:a");
    expect(catalogExpandStorageKey("b")).toBe("cat:b");
    expect(catalogExpandStorageKey("a", "sub1")).toBe("sub:sub1");
    expect(catalogExpandStorageKey("a")).not.toBe(catalogExpandStorageKey("b"));
  });
});
