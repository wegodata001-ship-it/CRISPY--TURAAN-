import { describe, expect, it } from "vitest";
import type { PdfMenuCategorySetting, PdfMenuCategoryWithProducts } from "@/types/pdf-menu";
import { DEFAULT_CATEGORY_SETTING, DEFAULT_PAGE_CUSTOM_SETTINGS } from "@/types/pdf-menu";
import {
  autoArrangeWithLocks,
  buildMenuPages,
  changePageTemplate,
  createPageId,
  duplicatePage,
  getPageExportOrder,
  moveCategoryToPage,
  packCategories,
  reorderPages,
  serializePages,
  hydratePagesFromRecords,
} from "@/lib/pdf-menu/pagination-engine";
import { recommendPageTemplate, PAGE_TEMPLATES } from "@/lib/pdf-menu/page-templates";
import { computeSmartSize, estimateCategoryLayoutSize } from "@/lib/pdf-menu/smart-size";
import { isUnsupportedCssColor, mixHexWithWhite } from "@/lib/pdf-menu/pdf-safe-color";
import {
  getCategoryPresentation,
  pageUtilization,
  splitBalanced,
} from "@/lib/pdf-menu/presentation";

function cat(
  id: string,
  name: string,
  productCount: number,
  size: number,
  extras?: Partial<PdfMenuCategorySetting>
): PdfMenuCategoryWithProducts {
  return {
    setting: {
      ...DEFAULT_CATEGORY_SETTING,
      id: `s-${id}`,
      templateId: "t1",
      categoryId: id,
      sortOrder: Number(id.replace(/\D/g, "") || 0),
      ...extras,
    },
    category: { id, name, image: "" },
    products: Array.from({ length: productCount }, (_, i) => ({
      id: `${id}-p${i}`,
      name: `${name} ${i + 1}`,
      description: "",
      price: 10 + i,
      image: i % 2 === 0 ? "https://example.com/x.jpg" : "",
      visible: true,
      sortOrder: i,
    })),
    computedSize: size,
  };
}

describe("page templates library", () => {
  it("includes at least 6 content designs plus cover", () => {
    expect(PAGE_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    expect(PAGE_TEMPLATES.map((t) => t.id)).toContain("minimal");
    expect(PAGE_TEMPLATES.map((t) => t.id)).toContain("image-focus");
    expect(PAGE_TEMPLATES.map((t) => t.id)).toContain("two-categories");
  });

  it("recommends two-categories for two small groups", () => {
    expect(recommendPageTemplate({ categoryCount: 2, productCount: 6, imageCount: 2 })).toBe("two-categories");
  });
});

describe("page order", () => {
  it("packs full + two halves onto separate pages", () => {
    const pages = buildMenuPages([
      cat("gelato", "Gelato", 12, 100),
      cat("coffee", "Coffee", 5, 50),
      cat("tea", "Tea", 4, 50),
    ]);
    expect(pages[0]?.categories.map((c) => c.category.id)).toEqual(["gelato"]);
    expect(pages[1]?.categories.map((c) => c.category.id)).toEqual(["coffee", "tea"]);
  });

  it("reorders pages and updates page numbers", () => {
    const pages = buildMenuPages([
      cat("a", "A", 10, 100),
      cat("b", "B", 10, 100),
      cat("c", "C", 10, 100),
    ]);
    const reordered = reorderPages(pages, 2, 0);
    expect(reordered.map((p) => p.categories[0]?.category.id)).toEqual(["c", "a", "b"]);
    expect(reordered.map((p) => p.pageNumber)).toEqual([1, 2, 3]);
  });

  it("keeps export order identical to preview order", () => {
    const pages = buildMenuPages([cat("a", "A", 10, 100), cat("b", "B", 10, 100)]);
    const reordered = reorderPages(pages, 1, 0);
    expect(getPageExportOrder(reordered)).toEqual(reordered.map((p) => p.id));
  });
});

describe("change template", () => {
  it("does not drop categories when switching design", () => {
    const pages = buildMenuPages([cat("coffee", "Coffee", 5, 50), cat("tea", "Tea", 4, 50)]);
    const target = pages[0]!;
    const catsBefore = target.categories.map((c) => c.setting.categoryId);
    const next = changePageTemplate(pages, target.id, "elegant");
    expect(next[0]?.pageTemplateId).toBe("elegant");
    expect(next[0]?.categories.map((c) => c.setting.categoryId)).toEqual(catsBefore);
  });
});

describe("move category between pages", () => {
  it("moves tea from page 1 to page 2", () => {
    const pages = buildMenuPages([
      cat("coffee", "Coffee", 5, 50),
      cat("tea", "Tea", 4, 50),
      cat("dessert", "Dessert", 8, 50, { startOnNewPage: true }),
    ]);
    const dest = pages[1]!;
    expect(pages[0]?.categories.map((c) => c.setting.categoryId)).toEqual(["coffee", "tea"]);
    const result = moveCategoryToPage(pages, "tea", dest.id);
    expect(result.ok).toBe(true);
    expect(result.pages[0]?.categories.map((c) => c.setting.categoryId)).toEqual(["coffee"]);
    expect(result.pages[1]?.categories.map((c) => c.setting.categoryId)).toContain("tea");
  });

  it("blocks overflow", () => {
    const pages = buildMenuPages([cat("a", "A", 12, 100), cat("b", "B", 12, 100)]);
    const result = moveCategoryToPage(pages, "a", pages[1]!.id);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("overflow");
  });
});

describe("lock + auto arrange", () => {
  it("does not move locked page content", () => {
    const coffee = cat("coffee", "Coffee", 5, 50);
    const tea = cat("tea", "Tea", 4, 50);
    const gelato = cat("gelato", "Gelato", 12, 100);
    const initial = buildMenuPages([coffee, tea, gelato]);
    const locked = initial.map((p, i) => (i === 0 ? { ...p, locked: true } : p));
    const next = autoArrangeWithLocks([gelato, coffee, tea], locked);
    const lockedAfter = next.find((p) => p.locked);
    expect(lockedAfter?.categories.map((c) => c.setting.categoryId).sort()).toEqual(["coffee", "tea"]);
  });
});

describe("persistence round-trip", () => {
  it("restores sortOrder after serialize + hydrate", () => {
    const built = reorderPages(
      buildMenuPages([cat("a", "A", 10, 100), cat("b", "B", 10, 100), cat("c", "C", 10, 100)]),
      2,
      0
    );
    const records = serializePages(built, "t1");
    const hydrated = hydratePagesFromRecords(records, [cat("a", "A", 10, 100), cat("b", "B", 10, 100), cat("c", "C", 10, 100)], "manual");
    expect(hydrated.map((p) => p.categories[0]?.category.id)).toEqual(
      built.map((p) => p.categories[0]?.category.id)
    );
  });
});

describe("duplicate page", () => {
  it("design-only copy has no categories", () => {
    const pages = buildMenuPages([cat("a", "A", 10, 100)]);
    const next = duplicatePage(pages, pages[0]!.id, "design");
    expect(next).toHaveLength(2);
    expect(next[1]?.categories).toHaveLength(0);
    expect(next[1]?.pageTemplateId).toBe(pages[0]?.pageTemplateId);
  });
});

describe("ids", () => {
  it("creates unique page ids", () => {
    expect(createPageId()).not.toBe(createPageId());
  });

  it("keeps default custom settings defined", () => {
    expect(DEFAULT_PAGE_CUSTOM_SETTINGS.columns).toBeGreaterThan(0);
  });
});

describe("auto size + packing", () => {
  it("keeps 1–3 products small and 4–6 at half page", () => {
    expect(computeSmartSize({ productCount: 3, imageCount: 0, avgNameLen: 8, avgDescLen: 0 })).toBe(25);
    expect(computeSmartSize({ productCount: 5, imageCount: 0, avgNameLen: 8, avgDescLen: 0 })).toBe(50);
    expect(computeSmartSize({ productCount: 12, imageCount: 2, avgNameLen: 8, avgDescLen: 0 })).toBe(100);
  });

  it("prefers list when most products have no images", () => {
    const estimate = estimateCategoryLayoutSize({
      productCount: 7,
      imageCount: 0,
      avgNameLen: 10,
      avgDescLen: 0,
    });
    expect(estimate.preferList).toBe(true);
    expect(estimate.capacity).toBe(50);
  });

  it("packs two small categories onto one page", () => {
    const pages = buildMenuPages([
      cat("coffee", "Coffee", 3, 25),
      cat("tea", "Tea", 3, 25),
    ]);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.categories.map((c) => c.category.id)).toEqual(["coffee", "tea"]);
  });

  it("detects unsupported CSS colors and tints with HEX/RGB only", () => {
    expect(isUnsupportedCssColor("oklab(0.5 0.1 0.1)")).toBe(true);
    expect(isUnsupportedCssColor("oklch(0.7 0.1 40)")).toBe(true);
    expect(isUnsupportedCssColor("color-mix(in srgb, red 8%, white)")).toBe(true);
    expect(isUnsupportedCssColor("#eca772")).toBe(false);
    expect(mixHexWithWhite("#ECA772", 0.92)).toMatch(/^rgb\(/);
  });

  it("uses list layout when image coverage is under 70%", () => {
    const low = getCategoryPresentation({
      productCount: 10,
      imageCount: 6,
      templateId: "image-focus",
    });
    expect(low.imageCoverage).toBe(0.6);
    expect(low.preferList).toBe(true);
    expect(low.layout).toBe("list");

    const high = getCategoryPresentation({
      productCount: 10,
      imageCount: 8,
      templateId: "image-focus",
    });
    expect(high.preferList).toBe(false);
    expect(high.layout).toBe("grid");
    expect(high.capacity).toBe(100);
  });

  it("lets image-focus estimate more height than a compact list", () => {
    const listH = getCategoryPresentation({
      productCount: 8,
      imageCount: 8,
      templateId: "elegant",
    }).estimatedHeight;
    const imageH = getCategoryPresentation({
      productCount: 8,
      imageCount: 8,
      templateId: "image-focus",
    }).estimatedHeight;
    expect(imageH).toBeGreaterThan(listH);
    expect(computeSmartSize({ productCount: 8, imageCount: 8, templateId: "elegant" })).toBe(50);
    expect(computeSmartSize({ productCount: 8, imageCount: 8, templateId: "image-focus" })).toBe(100);
  });

  it("balances columns by estimated height instead of a naive half split", () => {
    const items = [
      { id: "a", w: 80 },
      { id: "b", w: 20 },
      { id: "c", w: 20 },
      { id: "d", w: 20 },
      { id: "e", w: 20 },
    ];
    const [left, right] = splitBalanced(items, (item) => item.w);
    const leftH = left.reduce((s, i) => s + i.w, 0);
    const rightH = right.reduce((s, i) => s + i.w, 0);
    expect(Math.abs(leftH - rightH)).toBeLessThanOrEqual(20);
    expect(left[0]?.id).toBe("a");
  });

  it("pulls a later leftover category into an under-filled page", () => {
    const packed = packCategories([
      cat("coffee", "Coffee", 5, 50),
      cat("gelato", "Gelato", 12, 100),
      cat("tea", "Tea", 3, 25),
    ]);
    expect(packed.map((group) => group.map((c) => c.category.id))).toEqual([
      ["coffee", "tea"],
      ["gelato"],
    ]);
    expect(pageUtilization(packed[0]!.map((c) => c.computedSize))).toBe(75);
  });
});
