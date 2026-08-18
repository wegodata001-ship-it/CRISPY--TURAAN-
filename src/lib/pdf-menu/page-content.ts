import type { MenuPage, PdfMenuProductView } from "@/types/pdf-menu";

export function visibleProducts(page: MenuPage): PdfMenuProductView[] {
  return page.categories.flatMap((c) => c.products.filter((p) => p.visible));
}

export function pageHasContent(page: MenuPage): boolean {
  if (page.pageKind === "cover") return true;
  if (page.pageKind === "image" && page.customSettings.backgroundImageUrl) return true;
  if (page.pageKind === "blank") return page.categories.length > 0;
  return page.categories.some((c) => c.products.some((p) => p.visible));
}

export function filterExportPages(pages: MenuPage[]): MenuPage[] {
  return pages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter(pageHasContent);
}

export function productDensity(count: number): "large" | "medium" | "compact" {
  if (count <= 3) return "large";
  if (count <= 8) return "medium";
  return "compact";
}
