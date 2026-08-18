import { getAllCategoriesForExport, getAllProductsForExport } from "@/services";
import {
  buildProductExcelRows,
  buildProductExcelWorkbook,
  downloadExcelBuffer,
  productExcelFileName,
} from "@/lib/products/product-excel";
import type { Locale } from "@/lib/i18n/types";

export async function exportAllProductsExcel(options: {
  locale: Locale;
  storeName?: string;
  origin?: string;
}): Promise<{ filename: string; rowCount: number }> {
  const [products, categories] = await Promise.all([
    getAllProductsForExport(),
    getAllCategoriesForExport(),
  ]);

  const origin = options.origin ?? (typeof window === "undefined" ? "" : window.location.origin);
  const rows = buildProductExcelRows(products, categories, options.locale, origin);
  const buffer = await buildProductExcelWorkbook(rows);
  const filename = productExcelFileName(options.storeName);
  downloadExcelBuffer(buffer, filename);
  return { filename, rowCount: rows.length };
}
