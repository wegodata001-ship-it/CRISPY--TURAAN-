import type { Category, Product } from "@/types";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { normalizeImageUrl } from "@/lib/menu/placeholders";

export const PRODUCT_EXCEL_SHEET_NAME = "מוצרים";

export const PRODUCT_EXCEL_HEADERS = [
  "שם מוצר",
  "מחיר",
  "ברקוד",
  "קטגוריה",
  "מחיר עלות",
  "גלוי",
  "שקיל",
  'כולל מע"מ',
  "קישור לתמונה",
] as const;

export const PRODUCT_EXCEL_COLUMN_WIDTHS = [28, 12, 18, 20, 14, 10, 10, 12, 45] as const;

export type ProductExcelYesNo = "כן" | "לא";

export interface ProductExcelRow {
  name: string;
  price: number;
  barcode: string;
  category: string;
  cost: number | "";
  visible: ProductExcelYesNo;
  weighted: ProductExcelYesNo;
  vatIncluded: ProductExcelYesNo;
  imageUrl: string;
}

export function heYesNo(value: boolean): ProductExcelYesNo {
  return value ? "כן" : "לא";
}

export function exportCostPrice(cost: number | undefined | null): number | "" {
  if (cost == null || cost === 0) return "";
  return cost;
}

export function exportImageUrl(image: string | undefined | null, origin = ""): string {
  const normalized = normalizeImageUrl(image);
  if (!normalized) return "";
  if (/^(blob:|data:)/i.test(normalized)) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith("/") && origin) return `${origin.replace(/\/$/, "")}${normalized}`;
  return "";
}

export function productExcelFileName(storeName?: string, date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  const slug = (storeName ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug ? `${slug}-products-${day}.xlsx` : `products-${day}.xlsx`;
}

export function buildProductExcelRows(
  products: Product[],
  categories: Category[],
  locale: Locale,
  origin = ""
): ProductExcelRow[] {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  return [...products]
    .sort((a, b) => {
      const catA = categoryMap.get(a.categoryId)?.sortOrder ?? 9999;
      const catB = categoryMap.get(b.categoryId)?.sortOrder ?? 9999;
      if (catA !== catB) return catA - catB;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return getLocalizedName(a, locale).localeCompare(getLocalizedName(b, locale), locale);
    })
    .map((product) => {
      const category = categoryMap.get(product.categoryId);
      return {
        name: getLocalizedName(product, locale),
        price: product.price,
        barcode: product.barcode ?? "",
        category: category ? getLocalizedName(category, locale) : "",
        cost: exportCostPrice(product.cost),
        visible: heYesNo(product.active !== false),
        weighted: heYesNo(product.isWeighted === true),
        vatIncluded: heYesNo(product.includesVat !== false),
        imageUrl: exportImageUrl(product.image, origin),
      };
    });
}

export async function buildProductExcelWorkbook(rows: ProductExcelRow[]): Promise<ArrayBuffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "MISHKAT";
  const sheet = workbook.addWorksheet(PRODUCT_EXCEL_SHEET_NAME, {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });

  sheet.columns = PRODUCT_EXCEL_HEADERS.map((header, index) => ({
    header,
    key: String(index),
    width: PRODUCT_EXCEL_COLUMN_WIDTHS[index],
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.font = { bold: true, name: "Arial" };
  headerRow.alignment = { horizontal: "right", vertical: "middle" };

  for (const row of rows) {
    const excelRow = sheet.addRow([
      row.name,
      row.price,
      row.barcode,
      row.category,
      row.cost === "" ? null : row.cost,
      row.visible,
      row.weighted,
      row.vatIncluded,
      row.imageUrl,
    ]);
    excelRow.alignment = { horizontal: "right", vertical: "middle" };
    excelRow.getCell(2).numFmt = "0.##";
    excelRow.getCell(2).alignment = { horizontal: "right" };
    excelRow.getCell(3).numFmt = "@";
    if (row.cost !== "") {
      excelRow.getCell(5).numFmt = "0.##";
    }
  }

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: PRODUCT_EXCEL_HEADERS.length },
    };
  } else {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: PRODUCT_EXCEL_HEADERS.length },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function downloadExcelBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
