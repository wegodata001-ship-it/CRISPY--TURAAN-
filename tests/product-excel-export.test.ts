import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import type { Category, Product } from "@/types";
import {
  PRODUCT_EXCEL_HEADERS,
  PRODUCT_EXCEL_SHEET_NAME,
  buildProductExcelRows,
  buildProductExcelWorkbook,
  exportCostPrice,
  exportImageUrl,
  heYesNo,
  productExcelFileName,
} from "@/lib/products/product-excel";

function product(over: Partial<Product> & Pick<Product, "id" | "name_he" | "name_ar" | "categoryId">): Product {
  return {
    name_en: over.name_en ?? "",
    description_he: "",
    description_ar: "",
    description_en: "",
    price: 18,
    cost: 0,
    profit: 0,
    businessType: "dessert",
    image: "",
    isPopular: false,
    isNew: false,
    available: true,
    active: true,
    sortOrder: 0,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

const categories: Category[] = [
  {
    id: "cold",
    name_he: "שתיה קרה",
    name_ar: "المشروبات الباردة",
    name_en: "Cold drinks",
    icon: "",
    image: "",
    color: "",
    sortOrder: 1,
    active: true,
  },
  {
    id: "gelato",
    name_he: "גלידות",
    name_ar: "الجيلاتو",
    name_en: "Gelato",
    icon: "",
    image: "",
    color: "",
    sortOrder: 2,
    active: true,
  },
];

const sampleProducts: Product[] = [
  product({
    id: "p1",
    name_he: "לימונדה",
    name_ar: "ليمونادة",
    name_en: "Lemonade",
    categoryId: "cold",
    price: 18,
    cost: 6,
    barcode: "0123456789012",
    image: "https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg",
    active: true,
    sortOrder: 1,
  }),
  product({
    id: "p2",
    name_he: "פיסטוק",
    name_ar: "فستق",
    categoryId: "gelato",
    price: 16,
    cost: 0,
    active: false,
    available: true,
    isWeighted: true,
    includesVat: false,
    sortOrder: 2,
  }),
  product({
    id: "hidden",
    name_he: "מוסתר",
    name_ar: "مخفي",
    categoryId: "gelato",
    price: 19,
    active: false,
    sortOrder: 3,
  }),
];

describe("product excel mapping", () => {
  it("exports every product as one row, including hidden", () => {
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.name)).toEqual(["לימונדה", "פיסטוק", "מוסתר"]);
  });

  it("keeps Hebrew and Arabic names", () => {
    const he = buildProductExcelRows(sampleProducts, categories, "he");
    const ar = buildProductExcelRows(sampleProducts, categories, "ar");
    expect(he[0]?.name).toBe("לימונדה");
    expect(ar[0]?.name).toBe("ليمونادة");
    expect(he[0]?.name).toMatch(/[\u0590-\u05FF]/);
    expect(ar[0]?.name).toMatch(/[\u0600-\u06FF]/);
  });

  it("uses sale price as a number without currency", () => {
    const row = buildProductExcelRows(sampleProducts, categories, "he")[0]!;
    expect(row.price).toBe(18);
    expect(typeof row.price).toBe("number");
    expect(String(row.price)).not.toContain("₪");
  });

  it("keeps barcode as text with leading zeros", () => {
    const row = buildProductExcelRows(sampleProducts, categories, "he")[0]!;
    expect(row.barcode).toBe("0123456789012");
  });

  it("resolves category name instead of id", () => {
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    expect(rows[0]?.category).toBe("שתיה קרה");
    expect(rows.some((r) => r.category === "cold")).toBe(false);
  });

  it("leaves unset cost empty instead of 0", () => {
    expect(exportCostPrice(0)).toBe("");
    expect(exportCostPrice(undefined)).toBe("");
    expect(exportCostPrice(6)).toBe(6);
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    expect(rows[0]?.cost).toBe(6);
    expect(rows[1]?.cost).toBe("");
  });

  it("maps catalog visibility from active", () => {
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    expect(rows[0]?.visible).toBe("כן");
    expect(rows[1]?.visible).toBe("לא");
    expect(heYesNo(false)).toBe("לא");
  });

  it("uses weighted and VAT fields without inventing POS data", () => {
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    expect(rows[0]?.weighted).toBe("לא");
    expect(rows[0]?.vatIncluded).toBe("כן");
    expect(rows[1]?.weighted).toBe("כן");
    expect(rows[1]?.vatIncluded).toBe("לא");
  });

  it("exports https image URLs and skips blob/data", () => {
    expect(exportImageUrl("https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg")).toContain("https://");
    expect(exportImageUrl("blob:http://localhost/1")).toBe("");
    expect(exportImageUrl("data:image/png;base64,xx")).toBe("");
    expect(exportImageUrl("/logo.png", "https://mishkat.example")).toBe("https://mishkat.example/logo.png");
  });

  it("does not mutate source products", () => {
    const snapshot = structuredClone(sampleProducts);
    buildProductExcelRows(sampleProducts, categories, "he");
    expect(sampleProducts).toEqual(snapshot);
  });

  it("builds a dated filename", () => {
    expect(productExcelFileName("MISHKAT CAFÉ", new Date("2026-08-18T12:00:00.000Z"))).toBe(
      "mishkat-cafe-products-2026-08-18.xlsx"
    );
    expect(productExcelFileName("", new Date("2026-08-18T12:00:00.000Z"))).toBe("products-2026-08-18.xlsx");
  });
});

describe("product excel workbook", () => {
  it("writes xlsx with RTL, freeze, filter, numeric price, text barcode", async () => {
    const rows = buildProductExcelRows(sampleProducts, categories, "he");
    const buffer = await buildProductExcelWorkbook(rows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet(PRODUCT_EXCEL_SHEET_NAME);
    expect(sheet).toBeTruthy();
    expect(sheet!.views?.[0]?.rightToLeft).toBe(true);
    expect(sheet!.views?.[0]?.state).toBe("frozen");
    expect(sheet!.views?.[0]?.ySplit).toBe(1);
    expect(sheet!.autoFilter).toBeTruthy();
    expect(sheet!.getRow(1).values.slice(1)).toEqual([...PRODUCT_EXCEL_HEADERS]);
    expect(sheet!.getRow(1).font?.bold).toBe(true);
    expect(sheet!.rowCount).toBe(1 + rows.length);

    const priceCell = sheet!.getRow(2).getCell(2);
    expect(priceCell.value).toBe(18);
    expect(typeof priceCell.value).toBe("number");

    const barcodeCell = sheet!.getRow(2).getCell(3);
    expect(barcodeCell.value).toBe("0123456789012");
    expect(barcodeCell.numFmt).toBe("@");

    const hiddenRow = sheet!.getRow(4);
    expect(hiddenRow.getCell(1).value).toBe("מוסתר");
    expect(hiddenRow.getCell(6).value).toBe("לא");
  });
});
