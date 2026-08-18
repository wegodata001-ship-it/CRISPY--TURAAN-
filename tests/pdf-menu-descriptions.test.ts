import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Product } from "@/types";
import { DEFAULT_CATEGORY_SETTING, DEFAULT_PAGE_CUSTOM_SETTINGS, DEFAULT_PDF_DRAFT, type PdfMenuProductView } from "@/types/pdf-menu";
import {
  estimateLines,
  estimateProductHeight,
  expandCategoriesForDescriptionFit,
  getCategoryPresentation,
  getProductPresentation,
  PRODUCT_DESCRIPTION_TEXT,
  splitProductsToPageChunks,
} from "@/lib/pdf-menu/presentation";
import { computeSmartSize } from "@/lib/pdf-menu/smart-size";
import { peelLastProductFromPage } from "@/lib/pdf-menu/pagination-engine";
import { selectedCategoriesWithProducts } from "@/lib/pdf-menu/build-wizard-pages";
import { MenuPageRenderer } from "@/features/admin/menu-builder/menu-page-renderer";

function arabicOf(length: number): string {
  const unit = "بيض وصلصة ولبن ";
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

function view(over: Partial<PdfMenuProductView> = {}): PdfMenuProductView {
  return {
    id: "p1",
    name: "سلطة حلومي",
    description: "",
    price: 42,
    image: "",
    visible: true,
    sortOrder: 0,
    ...over,
  };
}

describe("product description presentation", () => {
  it("classifies compact / normal / expanded by length", () => {
    expect(getProductPresentation(view()).size).toBe("compact");
    expect(getProductPresentation(view({ description: arabicOf(50) })).size).toBe("normal");
    expect(getProductPresentation(view({ description: arabicOf(120) })).size).toBe("normal");
    expect(getProductPresentation(view({ description: arabicOf(220) })).size).toBe("expanded");
  });

  it("never truncates description CSS", () => {
    expect(PRODUCT_DESCRIPTION_TEXT.whiteSpace).toBe("pre-line");
    expect(PRODUCT_DESCRIPTION_TEXT.overflow).toBe("visible");
    expect(PRODUCT_DESCRIPTION_TEXT.textOverflow).toBe("clip");
    expect(PRODUCT_DESCRIPTION_TEXT.overflowWrap).toBe("anywhere");
  });

  it("estimates more height as the description grows", () => {
    const settings = { columns: 1 as const, nameSize: 16, descSize: 12, layout: "list" as const };
    const shortH = estimateProductHeight(view({ description: arabicOf(50) }), settings);
    const mediumH = estimateProductHeight(view({ description: arabicOf(120) }), settings);
    const longH = estimateProductHeight(view({ description: arabicOf(220) }), settings);
    const veryLongH = estimateProductHeight(view({ description: arabicOf(400) }), settings);
    expect(mediumH).toBeGreaterThan(shortH);
    expect(longH).toBeGreaterThan(mediumH);
    expect(veryLongH).toBeGreaterThan(longH);
    expect(estimateLines("سطر\nسطر\nسطر", 40)).toBe(3);
  });

  it("keeps drink lists compact and two-column", () => {
    const drinks = getCategoryPresentation({
      productCount: 7,
      imageCount: 0,
      avgNameLen: 8,
      avgDescLen: 0,
      templateId: "elegant",
    });
    expect(drinks.categoryLayout).toBe("compact-list");
    expect(drinks.columns).toBe(2);
    expect(drinks.preferList).toBe(true);
  });

  it("uses a spacious one-column list for long breakfast copy", () => {
    const products = [
      view({ id: "a", name: "إفطار لشخصين", description: arabicOf(220) }),
      view({ id: "b", name: "وجبة فطور شخصية", description: arabicOf(180) }),
      view({ id: "c", name: "شكشوكة", description: arabicOf(90) }),
    ];
    const breakfast = getCategoryPresentation({
      productCount: 3,
      imageCount: 0,
      templateId: "elegant",
      products,
    });
    expect(breakfast.columns).toBe(1);
    expect(breakfast.categoryLayout).toBe("descriptive-list");
    expect(breakfast.descSize).toBeGreaterThanOrEqual(12);
  });

  it("raises capacity when descriptions need a full page", () => {
    expect(computeSmartSize({ productCount: 5, imageCount: 0, avgNameLen: 8, avgDescLen: 0 })).toBe(50);
    const long = computeSmartSize({
      productCount: 5,
      imageCount: 0,
      avgNameLen: 12,
      avgDescLen: 220,
      products: Array.from({ length: 5 }, (_, i) => view({ id: `p${i}`, description: arabicOf(220) })),
    });
    expect(long).toBe(100);
  });

  it("splits a category when estimated height exceeds the page budget", () => {
    const products = Array.from({ length: 8 }, (_, i) =>
      view({ id: `p${i}`, name: `طبق ${i + 1}`, description: arabicOf(400) })
    );
    const chunks = splitProductsToPageChunks(products, { imageCount: 0, templateId: "elegant" });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.flat().map((p) => p.id)).toEqual(products.map((p) => p.id));
    expect(chunks.every((chunk) => chunk.length >= 1)).toBe(true);
  });

  it("marks continuation chunks without dropping products", () => {
    const cat = {
      setting: {
        ...DEFAULT_CATEGORY_SETTING,
        id: "s1",
        templateId: "wizard",
        categoryId: "breakfast",
        sortOrder: 0,
      },
      category: { id: "breakfast", name: "فطور", image: "" },
      products: Array.from({ length: 8 }, (_, i) => view({ id: `p${i}`, description: arabicOf(400) })),
      computedSize: 100,
    };
    const expanded = expandCategoriesForDescriptionFit([cat], "elegant");
    expect(expanded.length).toBeGreaterThan(1);
    expect(expanded[0]?.setting.categoryId).toBe("breakfast");
    expect(expanded[1]?.continuation).toBe(true);
    expect(expanded[1]?.category.name).toContain("متابعة");
    expect(expanded.flatMap((c) => c.products).map((p) => p.id)).toHaveLength(8);
  });

  it("peels the last product onto a continuation page", () => {
    const cat = {
      setting: {
        ...DEFAULT_CATEGORY_SETTING,
        id: "s1",
        templateId: "wizard",
        categoryId: "salads",
        sortOrder: 0,
      },
      category: { id: "salads", name: "سلطات", image: "" },
      products: [view({ id: "a" }), view({ id: "b" }), view({ id: "c" })],
      computedSize: 100,
    };
    const page = {
      id: "page-1",
      pageNumber: 1,
      sortOrder: 0,
      pageTemplateId: "elegant" as const,
      pageKind: "content" as const,
      usedCapacity: 100,
      categories: [cat],
      locked: false,
      customSettings: {
        backgroundColor: "#fff",
        backgroundImageUrl: "",
        accentColor: "#000",
        textColor: "#000",
        headingColor: "#000",
        fontSize: "md" as const,
        imageSize: "md" as const,
        productSpacing: 8,
        borderRadius: 12,
        columns: 1,
        alignment: "start" as const,
      },
      recommendedTemplateId: "elegant" as const,
    };
    const peeled = peelLastProductFromPage(page);
    expect(peeled).not.toBeNull();
    expect(peeled?.page.categories[0]?.products.map((p) => p.id)).toEqual(["a", "b"]);
    expect(peeled?.continuation.categories[0]?.products.map((p) => p.id)).toEqual(["c"]);
    expect(peeled?.continuation.categories[0]?.continuation).toBe(true);
  });
});

describe("wizard description data path", () => {
  it("passes the full Arabic description from the product record", () => {
    const description = arabicOf(400);
    const product: Product = {
      id: "meal-1",
      name_he: "",
      name_ar: "إفطار لشخصين",
      name_en: "",
      description_he: "",
      description_ar: description,
      description_en: "",
      categoryId: "breakfast",
      price: 120,
      cost: 0,
      profit: 0,
      businessType: "food",
      image: "",
      isPopular: false,
      isNew: false,
      available: true,
      active: true,
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    };
    const packed = selectedCategoriesWithProducts(
      { ...DEFAULT_PDF_DRAFT, selectedCategoryIds: ["breakfast"] },
      [
        {
          id: "breakfast",
          name_he: "فطور",
          name_ar: "فطور",
          name_en: "Breakfast",
          icon: "",
          image: "",
          color: "",
          sortOrder: 0,
          active: true,
        },
      ],
      [product],
      "ar"
    );
    expect(packed.some((c) => c.products.some((p) => p.description === description))).toBe(true);
    expect(packed.flatMap((c) => c.products).every((p) => p.description.length === 400)).toBe(true);
  });
});

describe("renderer description contract", () => {
  it("does not clamp, ellipsize, or slice product descriptions", () => {
    const src = readFileSync(resolve(process.cwd(), "src/features/admin/menu-builder/menu-page-renderer.tsx"), "utf8");
    expect(src).toMatch(/data-product-description/);
    expect(src).toMatch(/PRODUCT_DESCRIPTION_TEXT/);
    expect(src).toMatch(/breakInside: "avoid"/);
    expect(src).not.toMatch(/density !== "compact"/);
    expect(src).not.toMatch(/WebkitLineClamp|lineClamp|-webkit-line-clamp/);
    expect(src).not.toMatch(/description\.slice\(|description\.substring\(|truncate\(/);
    const descriptionFn = src.split("function ListProduct")[1]?.split("function SoftPhotoFallback")[0] ?? "";
    expect(descriptionFn).not.toMatch(/textOverflow:\s*"ellipsis"/);
    expect(descriptionFn).not.toMatch(/whiteSpace:\s*"nowrap"/);
  });

  it("shows the same full description in preview and export", () => {
    const shortDesc = arabicOf(50);
    const mediumDesc = arabicOf(120);
    const longDesc = arabicOf(220);
    const veryLongDesc = arabicOf(400);
    const longName = "سلطة موسمية بأوراق خضراء طازجة ومكونات البيت";
    const page = {
      id: "desc-page",
      pageNumber: 1,
      sortOrder: 0,
      pageTemplateId: "elegant" as const,
      pageKind: "content" as const,
      usedCapacity: 100,
      categories: [
        {
          setting: {
            ...DEFAULT_CATEGORY_SETTING,
            id: "s1",
            templateId: "wizard",
            categoryId: "salads",
            sortOrder: 0,
          },
          category: { id: "salads", name: "سلطات", image: "" },
          products: [
            view({ id: "short", name: "سلطة قصيرة", description: shortDesc, price: 28 }),
            view({ id: "medium", name: "سلطة حلومي", description: mediumDesc, price: 42 }),
            view({ id: "long", name: "إفطار لشخصين", description: longDesc, price: 120 }),
            view({ id: "very", name: longName, description: veryLongDesc, price: 68 }),
          ],
          computedSize: 100,
        },
      ],
      locked: false,
      customSettings: { ...DEFAULT_PAGE_CUSTOM_SETTINGS, columns: 1 },
      recommendedTemplateId: "elegant" as const,
    };

    const preview = render(createElement(MenuPageRenderer, { page, menuTemplate: null, mode: "preview" }));
    const previewText = preview.container.textContent ?? "";
    for (const text of [shortDesc, mediumDesc, longDesc, veryLongDesc, longName, "120 ₪"]) {
      expect(previewText).toContain(text);
    }
    expect(preview.container.querySelectorAll("[data-product-description]")).toHaveLength(4);
    preview.unmount();

    const exported = render(createElement(MenuPageRenderer, { page, menuTemplate: null, mode: "export" }));
    const exportText = exported.container.textContent ?? "";
    expect(exportText).toContain(shortDesc);
    expect(exportText).toContain(mediumDesc);
    expect(exportText).toContain(longDesc);
    expect(exportText).toContain(veryLongDesc);
    expect(exportText).toContain(longName);
    expect(exported.container.querySelectorAll("[data-product-description]")).toHaveLength(4);
    exported.unmount();
  });
});
