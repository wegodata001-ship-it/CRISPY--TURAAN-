import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCollapsedVisibleCategories } from "@/lib/menu/category-tree";

describe("menu category strip mobile UX", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/catalog/menu-category-strip.tsx"),
    "utf8"
  );

  it("uses a horizontal scroller and avoids LTR direction hacks", () => {
    expect(source).toMatch(/HorizontalScroller/);
    expect(source).not.toMatch(/overflow-x-auto/);
    expect(source).not.toMatch(/direction:\s*ltr/);
    expect(source).not.toMatch(/dir=["']ltr["']/);
  });

  it("highlights the selected category in yellow", () => {
    expect(source).toMatch(/bg-gold/);
  });
});

describe("getCollapsedVisibleCategories", () => {
  const roots = Array.from({ length: 10 }, (_, i) => ({ id: `c${i + 1}` }));

  it("returns the first N categories when selected is already visible", () => {
    expect(getCollapsedVisibleCategories(roots, "c2", 4).map((c) => c.id)).toEqual([
      "c1",
      "c2",
      "c3",
      "c4",
    ]);
  });

  it("swaps the last slot for an active category beyond the limit", () => {
    expect(getCollapsedVisibleCategories(roots, "c10", 4).map((c) => c.id)).toEqual([
      "c1",
      "c2",
      "c3",
      "c10",
    ]);
  });

  it("returns all roots when under the limit", () => {
    expect(getCollapsedVisibleCategories(roots.slice(0, 3), "c2", 4).map((c) => c.id)).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
  });
});
