import { describe, expect, it } from "vitest";
import type { Category, Product } from "@/types";
import { DEFAULT_PDF_DRAFT, type PdfMenuDraft } from "@/types/pdf-menu";
import {
  autoPackCategoryIds,
  buildWizardPages,
  isProductExcluded,
  prunePageOrder,
  selectedCategoriesWithProducts,
  syncPageOrder,
} from "@/lib/pdf-menu/build-wizard-pages";
import { getColorTheme, PDF_COLOR_THEMES } from "@/lib/pdf-menu/color-themes";
import { WIZARD_TEMPLATES } from "@/lib/pdf-menu/page-templates";
import { filterExportPages } from "@/lib/pdf-menu/page-content";
import { loadPdfDraft, savePdfDraft } from "@/lib/pdf-menu/draft-storage";
import type { AppSettings } from "@/services/settingsService";

function category(id: string, name: string, sortOrder: number): Category {
  return {
    id,
    name_he: name,
    name_ar: name,
    name_en: name,
    icon: "",
    image: "",
    color: "",
    sortOrder,
    active: true,
  };
}

function product(id: string, categoryId: string, name: string, sortOrder: number): Product {
  return {
    id,
    name_he: name,
    name_ar: name,
    name_en: name,
    description_he: "",
    description_ar: "",
    description_en: "",
    categoryId,
    price: 16,
    cost: 0,
    profit: 0,
    businessType: "dessert",
    image: "",
    isPopular: false,
    isNew: false,
    available: true,
    active: true,
    sortOrder,
    createdAt: "",
    updatedAt: "",
  };
}

const cats = [
  category("gelato", "الجيلاتو", 0),
  category("coffee", "القهوة", 1),
  category("tea", "الشاي", 2),
];

const products: Product[] = [
  ...Array.from({ length: 12 }, (_, i) => product(`g${i}`, "gelato", `جيلاتو ${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => product(`c${i}`, "coffee", `قهوة ${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => product(`t${i}`, "tea", `شاي ${i + 1}`, i)),
];

const settings: AppSettings = {
  storeName: "CRISPY",
  logoUrl: "/logo-transparent.png",
  storeImageUrl: "",
  showProductThumbnails: true,
  phone: "",
  address: "",
  hours: "",
  currency: "ILS",
  theme: { primary: "#3D2B24", accent: "#007A80", background: "#F8F3ED" },
  seo: { title: "", description: "" },
  social: { instagram: "", facebook: "", whatsapp: "" },
  mapsUrl: "",
  faviconUrl: "",
};

function draft(over: Partial<PdfMenuDraft> = {}): PdfMenuDraft {
  return {
    ...DEFAULT_PDF_DRAFT,
    selectedCategoryIds: ["gelato", "coffee", "tea"],
    ...over,
  };
}

describe("wizard product exclusion", () => {
  it("hides products from the PDF draft only", () => {
    const d = draft({ excludedProductIds: ["g0", "g1", "g2"] });
    const packed = selectedCategoriesWithProducts(d, cats, products, "ar");
    const gelato = packed.find((c) => c.category.id === "gelato");
    expect(gelato?.products.map((p) => p.id)).not.toContain("g0");
    expect(gelato?.products).toHaveLength(9);
    expect(products.filter((p) => p.categoryId === "gelato")).toHaveLength(12);
    expect(isProductExcluded(d, "g0")).toBe(true);
    expect(products.find((p) => p.id === "g0")?.available).toBe(true);
  });
});

describe("wizard auto layout", () => {
  it("gives a large category its own page and can pair two small ones", () => {
    const packed = selectedCategoriesWithProducts(draft(), cats, products, "ar");
    const groups = autoPackCategoryIds(packed);
    expect(groups[0]).toEqual(["gelato"]);
    expect(groups[1]).toEqual(["coffee", "tea"]);
  });

  it("packs two 3-product categories onto one page", () => {
    const smallCats = [category("a", "A", 0), category("b", "B", 1)];
    const smallProducts = [
      ...Array.from({ length: 3 }, (_, i) => product(`a${i}`, "a", "نسكافيه", i)),
      ...Array.from({ length: 3 }, (_, i) => product(`b${i}`, "b", "شاي", i)),
    ];
    const packed = selectedCategoriesWithProducts(
      { ...DEFAULT_PDF_DRAFT, selectedCategoryIds: ["a", "b"] },
      smallCats,
      smallProducts,
      "ar"
    );
    expect(packed.map((c) => c.computedSize)).toEqual([25, 25]);
    expect(autoPackCategoryIds(packed)).toEqual([["a", "b"]]);
  });

  it("keeps selection order after pruning a removed category", () => {
    const order = [
      { id: "p1", categoryIds: ["gelato"] },
      { id: "p2", categoryIds: ["coffee", "tea"] },
    ];
    expect(prunePageOrder(order, ["gelato", "tea"])).toEqual([
      { id: "p1", categoryIds: ["gelato"] },
      { id: "p2", categoryIds: ["tea"] },
    ]);
  });

  it("manual sync keeps current grouping and appends new categories", () => {
    const packed = selectedCategoriesWithProducts(draft(), cats, products, "ar");
    const next = syncPageOrder(
      draft({
        layoutMode: "manual",
        pageOrder: [{ id: "keep", categoryIds: ["gelato"] }],
      }),
      packed
    );
    expect(next[0]?.id).toBe("keep");
    expect(next[0]?.categoryIds).toEqual(["gelato"]);
    expect(next.slice(1).flatMap((p) => p.categoryIds).sort()).toEqual(["coffee", "tea"]);
  });
});

describe("wizard design + pages", () => {
  it("exposes at least 6 wizard templates and 5 color themes", () => {
    expect(WIZARD_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(PDF_COLOR_THEMES.length).toBeGreaterThanOrEqual(5);
  });

  it("applies different theme colors to cover and content", () => {
    const packed = selectedCategoriesWithProducts(draft(), cats, products, "ar");
    const rose = buildWizardPages(draft({ colorThemeId: "rose-cream" }), packed, settings, "", "");
    const gold = buildWizardPages(draft({ colorThemeId: "black-gold" }), packed, settings, "", "");
    expect(rose.pages[0]?.customSettings.backgroundColor).not.toBe(gold.pages[0]?.customSettings.backgroundColor);
    expect(rose.menuTemplate.coverSettings.logoUrl).toBe("/logo-transparent.png");
    expect(filterExportPages(rose.pages).every((p) => p.pageKind === "cover" || p.categories.length > 0)).toBe(true);
  });

  it("keeps Arabic names on generated pages", () => {
    const packed = selectedCategoriesWithProducts(draft(), cats, products, "ar");
    const { pages } = buildWizardPages(draft(), packed, settings, "data:image/png;base64,xx", "https://example.com");
    const names = pages.flatMap((p) => p.categories.map((c) => c.category.name));
    expect(names).toContain("الجيلاتو");
    expect(names.join("")).toMatch(/[\u0600-\u06FF]/);
    expect(pages[0]?.pageKind).toBe("cover");
    expect(pages.some((p) => p.categories.some((c) => c.products.some((prod) => prod.price === 16)))).toBe(true);
  });

  it("custom colors flow into the renderer settings", () => {
    const theme = getColorTheme("custom", {
      primary: "#111111",
      secondary: "#222222",
      background: "#ABCDEF",
      text: "#333333",
      accent: "#444444",
    });
    expect(theme.colors.background).toBe("#ABCDEF");
  });
});

describe("wizard draft persistence", () => {
  it("restores step, exclusions, and page order", () => {
    const d = draft({
      currentStep: 3,
      layoutMode: "manual",
      excludedProductIds: ["g0", "g1"],
      pageOrder: [
        { id: "page-a", categoryIds: ["tea", "coffee"] },
        { id: "page-b", categoryIds: ["gelato"] },
      ],
    });
    savePdfDraft(d);
    const loaded = loadPdfDraft();
    expect(loaded.currentStep).toBe(3);
    expect(loaded.layoutMode).toBe("manual");
    expect(loaded.excludedProductIds).toEqual(["g0", "g1"]);
    expect(loaded.pageOrder.map((p) => p.categoryIds)).toEqual([["tea", "coffee"], ["gelato"]]);
  });
});
