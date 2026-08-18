import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ARABIC_SAMPLE_WORDS,
  assertArabicIntact,
  formatMenuPrice,
  looksLikeMojibake,
} from "@/lib/pdf-menu/a4";
import { packCategories, getPageExportOrder } from "@/lib/pdf-menu/pagination-engine";
import { computeSmartSize } from "@/lib/pdf-menu/smart-size";
import { filterExportPages, productDensity } from "@/lib/pdf-menu/page-content";
import { PAGE_TEMPLATES } from "@/lib/pdf-menu/page-templates";
import type { MenuPage, PdfMenuCategoryWithProducts } from "@/types/pdf-menu";
import { DEFAULT_CATEGORY_SETTING, DEFAULT_PAGE_CUSTOM_SETTINGS } from "@/types/pdf-menu";

function samplePage(over: Partial<MenuPage> = {}): MenuPage {
  const cat: PdfMenuCategoryWithProducts = {
    setting: { ...DEFAULT_CATEGORY_SETTING, id: "s1", templateId: "t", categoryId: "c1", sortOrder: 0 },
    category: { id: "c1", name: "المشروبات الباردة", image: "" },
    products: [
      { id: "p1", name: "آيس لاتيه", description: "", price: 16, image: "", visible: true, sortOrder: 0 },
      { id: "p2", name: "موكا باردة", description: "", price: 18, image: "", visible: true, sortOrder: 1 },
      { id: "p3", name: "قهوة عربية", description: "", price: 12, image: "", visible: true, sortOrder: 2 },
    ],
    computedSize: 100,
  };
  return {
    id: "page-1",
    pageNumber: 1,
    sortOrder: 0,
    pageTemplateId: "minimal",
    pageKind: "content",
    usedCapacity: 100,
    categories: [cat],
    locked: false,
    customSettings: { ...DEFAULT_PAGE_CUSTOM_SETTINGS },
    recommendedTemplateId: "minimal",
    ...over,
  };
}

describe("Arabic encoding", () => {
  it("keeps sample Arabic words intact", () => {
    for (const word of ARABIC_SAMPLE_WORDS) {
      expect(assertArabicIntact(word)).toBe(true);
      expect(looksLikeMojibake(word)).toBe(false);
    }
  });

  it("detects classic mojibake", () => {
    expect(looksLikeMojibake('þ"Ý')).toBe(true);
  });

  it("does not reverse Arabic in price formatting", () => {
    expect(formatMenuPrice(16)).toBe("16 ₪");
    expect(formatMenuPrice(16)).not.toBe("₪ 61");
  });
});

describe("export pages", () => {
  it("drops empty content pages and keeps cover", () => {
    const empty = samplePage({
      id: "empty",
      pageKind: "content",
      categories: [],
    });
    const cover = samplePage({ id: "cover", pageKind: "cover", pageTemplateId: "cover", categories: [] });
    const filled = samplePage();
    const filtered = filterExportPages([empty, cover, filled]);
    expect(filtered.map((p) => p.id)).toEqual(["cover", "page-1"]);
  });

  it("keeps preview/export order identical", () => {
    const pages = [samplePage({ id: "a", sortOrder: 1 }), samplePage({ id: "b", sortOrder: 0 })];
    expect(getPageExportOrder(pages)).toEqual(["b", "a"]);
  });
});

describe("density + templates", () => {
  it("uses large cards for few products", () => {
    expect(productDensity(3)).toBe("large");
    expect(productDensity(6)).toBe("medium");
    expect(productDensity(12)).toBe("compact");
  });

  it("has at least 7 distinct page templates", () => {
    const ids = PAGE_TEMPLATES.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining([
      "minimal", "image-focus", "elegant", "split", "two-categories", "full-background", "promo",
    ]));
  });
});

describe("auto packing", () => {
  it("puts a 5-item coffee list and a 3-item tea list on one page", () => {
    const coffeeSize = computeSmartSize({ productCount: 5, imageCount: 0, avgNameLen: 8, avgDescLen: 0 });
    const teaSize = computeSmartSize({ productCount: 3, imageCount: 0, avgNameLen: 8, avgDescLen: 0 });
    expect(coffeeSize).toBe(50);
    expect(teaSize).toBe(25);

    const coffee = samplePage().categories[0]!;
    const tea = {
      ...coffee,
      setting: { ...coffee.setting, id: "s2", categoryId: "c2", sortOrder: 1 },
      category: { id: "c2", name: "الشاي", image: "" },
      products: coffee.products,
      computedSize: teaSize,
    };
    const packed = packCategories([
      { ...coffee, computedSize: coffeeSize, products: coffee.products.concat(coffee.products.slice(0, 2)) },
      tea,
    ]);
    expect(packed).toHaveLength(1);
    expect(packed[0]?.map((c) => c.category.id)).toEqual(["c1", "c2"]);
  });
});

describe("PDF engine contract", () => {
  it("does not draw Arabic with jsPDF text()", () => {
    const src = readFileSync(resolve(process.cwd(), "src/features/admin/menu-builder/pdf-exporter.tsx"), "utf8");
    expect(src).not.toMatch(/pdf\.text\(/);
    expect(src).not.toMatch(/split\(""\)\.reverse/);
    expect(src).not.toMatch(/decodeURIComponent\(escape/);
    expect(src).not.toMatch(/html-to-image/);
    expect(src).not.toMatch(/from ["']html2canvas["']/);
    expect(src).toMatch(/html2canvas-pro/);
    expect(src).toMatch(/buildMenuPdfBlob/);
    expect(src).toMatch(/preparePdfExportNode/);
    expect(src).toMatch(/MenuPageRenderer/);
    expect(src).toMatch(/mode="export"/);
  });

  it("builds the customer QR from the public site URL, not the browser origin", () => {
    const wizard = readFileSync(resolve(process.cwd(), "src/features/admin/menu-builder/wizard/wizard-admin.tsx"), "utf8");
    const qr = readFileSync(resolve(process.cwd(), "src/lib/pdf-menu/qr.ts"), "utf8");
    expect(wizard).not.toMatch(/window\.location\.origin/);
    expect(wizard).toMatch(/getPublicOrderUrl/);
    expect(qr).toMatch(/resolveQrTargetUrl/);
  });

  it("does not use unsupported CSS color functions in the page renderer", () => {
    const src = readFileSync(resolve(process.cwd(), "src/features/admin/menu-builder/menu-page-renderer.tsx"), "utf8");
    expect(src).not.toMatch(/oklab\(/);
    expect(src).not.toMatch(/oklch\(/);
    expect(src).not.toMatch(/color-mix\(/);
    expect(src).not.toMatch(/rgba\(26,20,16,0\.04\)/);
    expect(src).toMatch(/getCategoryPresentation/);
    expect(src).toMatch(/aspectRatio: "4 \/ 3"/);
  });
});
