import type { PageTemplateId, PdfMenuCategoryWithProducts, PdfMenuProductView } from "@/types/pdf-menu";

export const IMAGE_COVERAGE_THRESHOLD = 0.7;
export const PAGE_BODY_HEIGHT_PX = 980;
export const TARGET_UTILIZATION_MIN = 70;
/** Leave header, footer, and a little breathing room before splitting a category. */
export const PAGE_CONTENT_BUDGET_PX = 900;
export const DESC_MIN_PX = 12;

export type CategoryLayoutKind = "list" | "grid" | "hero-list" | "hero-cards";
export type ProductPresentationSize = "compact" | "normal" | "expanded";
export type CategoryPresentationStyle = "compact-list" | "descriptive-list" | "cards";

export interface ProductPresentation {
  hasDescription: boolean;
  descriptionLength: number;
  size: ProductPresentationSize;
}

export interface CategoryPresentation {
  layout: CategoryLayoutKind;
  categoryLayout: CategoryPresentationStyle;
  columns: 1 | 2 | 3;
  estimatedHeight: number;
  contentHeight: number;
  preferredPageFraction: number;
  capacity: 25 | 50 | 75 | 100;
  imageCoverage: number;
  productCount: number;
  density: "large" | "medium" | "compact";
  titleSize: number;
  nameSize: number;
  descSize: number;
  priceSize: number;
  rowGap: number;
  showProductImages: boolean;
  useCategoryHero: boolean;
  preferList: boolean;
  avgDescLen: number;
  maxDescLen: number;
}

export interface CategoryPresentationInput {
  productCount: number;
  imageCount: number;
  avgNameLen?: number;
  avgDescLen?: number;
  maxDescLen?: number;
  hasCategoryImage?: boolean;
  templateId?: PageTemplateId;
  pageCategoryCount?: number;
  forceList?: boolean;
  products?: PdfMenuProductView[];
  narrow?: boolean;
}

export interface ProductHeightSettings {
  columns: 1 | 2 | 3;
  nameSize: number;
  descSize: number;
  showImage?: boolean;
  layout?: "list" | "grid";
  narrow?: boolean;
}

const SIZE_NAME = {
  25: "quarter",
  50: "half",
  75: "three_quarters",
  100: "full",
} as const;

export const PRODUCT_DESCRIPTION_TEXT = {
  whiteSpace: "pre-line" as const,
  overflow: "visible" as const,
  textOverflow: "clip" as const,
  overflowWrap: "anywhere" as const,
  wordBreak: "normal" as const,
  lineHeight: 1.7,
};

function snapCapacity(fraction: number): 25 | 50 | 75 | 100 {
  if (fraction <= 0.3) return 25;
  if (fraction <= 0.55) return 50;
  if (fraction <= 0.8) return 75;
  return 100;
}

function listTemplate(template: PageTemplateId): boolean {
  return template === "minimal" || template === "elegant" || template === "two-categories";
}

export function sourceCategoryId(id: string): string {
  return id.replace(/__p\d+$/, "");
}

export function isContinuationCategoryId(id: string): boolean {
  return /__p\d+$/.test(id);
}

export function continuationCategoryId(id: string, chunkIndex: number): string {
  if (chunkIndex <= 0) return sourceCategoryId(id);
  return `${sourceCategoryId(id)}__p${chunkIndex + 1}`;
}

export function continuationTitle(name: string): string {
  const base = name.replace(/\s*—\s*متابعة\s*$/, "").trim();
  return `${base} — متابعة`;
}

export function getProductPresentation(
  product: Pick<PdfMenuProductView, "name" | "description">
): ProductPresentation {
  const descriptionLength = product.description?.trim().length ?? 0;
  const hasDescription = descriptionLength > 0;
  let size: ProductPresentationSize = "compact";
  if (hasDescription) {
    if (descriptionLength > 180) size = "expanded";
    else if (descriptionLength > 40) size = "normal";
  }
  return { hasDescription, descriptionLength, size };
}

export function estimateLines(text: string, charsPerLine: number): number {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return 0;
  const per = Math.max(8, charsPerLine);
  return normalized.split("\n").reduce((total, line) => {
    const len = line.trim().length;
    if (!len) return total + 1;
    return total + Math.max(1, Math.ceil(len / per));
  }, 0);
}

export function charsPerLineForColumns(columns: 1 | 2 | 3, narrow?: boolean): number {
  if (narrow) return 22;
  if (columns <= 1) return 34;
  if (columns >= 3) return 14;
  return 18;
}

export function estimateProductHeight(
  product: Pick<PdfMenuProductView, "name" | "description" | "image">,
  settings: ProductHeightSettings
): number {
  const copy = getProductPresentation(product);
  const chars = charsPerLineForColumns(settings.columns, settings.narrow);
  const nameLines = Math.max(1, estimateLines(product.name || "", Math.max(12, chars - 8)));
  const descLines = copy.hasDescription ? estimateLines(product.description || "", chars) : 0;
  const titleHeight = nameLines * (settings.nameSize * 1.3);
  const descriptionHeight = descLines * (Math.max(DESC_MIN_PX, settings.descSize) * 1.7);
  const padding = copy.hasDescription ? 36 : 14;
  const gaps = copy.hasDescription ? 12 : 4;

  if (settings.layout === "grid") {
    const imageHeight = settings.showImage && product.image ? 148 : 0;
    return Math.ceil(titleHeight + descriptionHeight + 22 + imageHeight + padding + gaps);
  }

  return Math.ceil(titleHeight + descriptionHeight + padding + gaps);
}

function descStats(input: CategoryPresentationInput): { avgDesc: number; maxDesc: number; avgName: number } {
  const products = input.products;
  if (products && products.length > 0) {
    const descLens = products.map((p) => p.description?.trim().length ?? 0);
    const nameLens = products.map((p) => p.name?.length ?? 0);
    const avgDesc = descLens.reduce((s, n) => s + n, 0) / products.length;
    return {
      avgDesc,
      maxDesc: Math.max(0, ...descLens),
      avgName: nameLens.reduce((s, n) => s + n, 0) / products.length,
    };
  }
  const avgDesc = input.avgDescLen ?? 0;
  return {
    avgDesc,
    maxDesc: input.maxDescLen ?? avgDesc,
    avgName: input.avgNameLen ?? 0,
  };
}

/**
 * Density + layout for one category. Packing uses `capacity`;
 * the renderer uses typography, columns, and image vs list.
 */
export function getCategoryPresentation(input: CategoryPresentationInput): CategoryPresentation {
  const count = Math.max(0, input.productCount);
  const imageCoverage = count === 0 ? 0 : input.imageCount / count;
  const template = input.templateId ?? "elegant";
  const shared = (input.pageCategoryCount ?? 1) > 1;
  const { avgDesc, maxDesc, avgName } = descStats(input);
  const longCopy = avgDesc > 40 || maxDesc > 80 || avgName > 32;

  const preferList =
    Boolean(input.forceList) ||
    listTemplate(template) ||
    template === "split" ||
    imageCoverage < IMAGE_COVERAGE_THRESHOLD;

  const useCategoryHero = Boolean(input.hasCategoryImage) && preferList && !shared && count <= 10 && avgDesc < 40;

  let layout: CategoryLayoutKind;
  if (preferList) {
    layout = useCategoryHero ? "hero-list" : "list";
  } else if (count <= 3 && !shared) {
    layout = "hero-cards";
  } else {
    layout = "grid";
  }

  let density: "large" | "medium" | "compact" =
    count <= 3 ? "large" : count <= 12 ? "medium" : "compact";
  if (longCopy && density === "compact") density = "medium";

  let columns: 1 | 2 | 3 = 1;
  if (layout === "list" || layout === "hero-list") {
    if (count <= 1 || input.narrow) {
      columns = 1;
    } else if (maxDesc > 160 || avgDesc > 80) {
      columns = 1;
    } else if (avgDesc > 40 || maxDesc > 80) {
      columns = shared ? 1 : 2;
    } else if (count <= 3) {
      columns = shared ? 1 : 2;
    } else {
      columns = 2;
    }
  } else if (layout === "hero-cards") {
    columns = count === 1 || maxDesc > 80 ? 1 : 2;
  } else if (template === "promo" && count >= 9 && avgDesc < 20) {
    columns = 2;
  } else {
    columns = count === 1 || maxDesc > 120 || avgDesc > 60 ? 1 : 2;
  }

  const categoryLayout: CategoryPresentationStyle =
    layout === "grid" || layout === "hero-cards"
      ? "cards"
      : avgDesc < 8 && maxDesc < 20
        ? "compact-list"
        : "descriptive-list";

  const titleSize = density === "large" && !shared ? 32 : density === "compact" ? 26 : 30;
  const nameSize = density === "large" ? 18 : density === "compact" ? 15 : 16;
  const descSize = density === "large" ? 13 : DESC_MIN_PX;
  const priceSize = density === "large" ? 17 : density === "compact" ? 14 : 16;
  const rowGap =
    categoryLayout === "descriptive-list"
      ? 16
      : density === "large"
        ? 18
        : density === "compact"
          ? 7
          : 11;

  const showProductImages = !preferList;
  const heightSettings: ProductHeightSettings = {
    columns,
    nameSize,
    descSize,
    showImage: showProductImages,
    layout: preferList ? "list" : "grid",
    narrow: input.narrow,
  };

  const headerH = 56 + (useCategoryHero ? 130 : 0);
  let contentHeight: number;
  if (input.products && input.products.length > 0) {
    const products = input.products;
    if (columns <= 1) {
      const body = products.reduce((sum, product) => sum + estimateProductHeight(product, heightSettings) + rowGap, 0);
      contentHeight = headerH + body;
    } else {
      const [left, right] = splitBalanced(products, (product) => estimateProductHeight(product, heightSettings));
      const colH = (list: PdfMenuProductView[]) =>
        list.reduce((sum, product) => sum + estimateProductHeight(product, heightSettings) + rowGap, 0);
      contentHeight = headerH + Math.max(colH(left), colH(right));
    }
  } else {
    const descExtra = estimateLines("x".repeat(Math.round(avgDesc)), charsPerLineForColumns(columns, input.narrow)) *
      (descSize * 1.7);
    const itemH =
      layout === "grid" || layout === "hero-cards"
        ? (density === "large" ? 220 : density === "medium" ? 168 : 128) + descExtra
        : (density === "large" ? 52 : density === "compact" ? 34 : 42) + descExtra;
    const rows = Math.ceil(Math.max(count, 1) / columns);
    contentHeight = headerH + rows * itemH + rowGap * Math.max(0, rows - 1);
  }

  let fraction: number;
  if (layout === "list" || layout === "hero-list") {
    if (count <= 3) fraction = 0.25;
    else if (count <= 8) fraction = 0.5;
    else if (count <= 10) fraction = 0.75;
    else fraction = 1;
  } else if (template === "image-focus") {
    if (count <= 2) fraction = 0.5;
    else if (count <= 4) fraction = 0.75;
    else fraction = 1;
  } else if (count <= 3) {
    fraction = 0.5;
  } else if (count <= 6) {
    fraction = 0.75;
  } else {
    fraction = 1;
  }

  const heightFraction = contentHeight / PAGE_BODY_HEIGHT_PX;
  fraction = Math.max(fraction, heightFraction);

  const capacity = snapCapacity(fraction);

  return {
    layout,
    categoryLayout,
    columns,
    estimatedHeight: Math.round(contentHeight),
    contentHeight: Math.round(contentHeight),
    preferredPageFraction: capacity / 100,
    capacity,
    imageCoverage,
    productCount: count,
    density,
    titleSize,
    nameSize,
    descSize,
    priceSize,
    rowGap,
    showProductImages,
    useCategoryHero,
    preferList,
    avgDescLen: avgDesc,
    maxDescLen: maxDesc,
  };
}

export function estimateCategoryHeight(input: CategoryPresentationInput, templateId?: PageTemplateId): number {
  return getCategoryPresentation({ ...input, templateId: templateId ?? input.templateId }).contentHeight;
}

export function productRowWeight(
  product: Pick<PdfMenuProductView, "name" | "description" | "image">,
  columns: 1 | 2 | 3 = 2
): number {
  return estimateProductHeight(product, {
    columns,
    nameSize: 16,
    descSize: DESC_MIN_PX,
    layout: "list",
  });
}

/** Greedy height balance — not a naive half split. */
export function splitBalanced<T>(items: T[], weight: (item: T) => number): [T[], T[]] {
  const left: T[] = [];
  const right: T[] = [];
  let leftH = 0;
  let rightH = 0;
  for (const item of items) {
    const w = Math.max(1, weight(item));
    if (leftH <= rightH) {
      left.push(item);
      leftH += w;
    } else {
      right.push(item);
      rightH += w;
    }
  }
  return [left, right];
}

export function splitProductsToPageChunks(
  products: PdfMenuProductView[],
  baseInput: Omit<CategoryPresentationInput, "productCount" | "products">
): PdfMenuProductView[][] {
  if (products.length === 0) return [[]];
  const chunks: PdfMenuProductView[][] = [];
  let current: PdfMenuProductView[] = [];

  const heightOf = (list: PdfMenuProductView[]) =>
    getCategoryPresentation({
      ...baseInput,
      productCount: list.length,
      imageCount: list.filter((p) => Boolean(p.image)).length,
      products: list,
    }).contentHeight;

  for (const product of products) {
    if (current.length === 0) {
      current = [product];
      continue;
    }
    if (heightOf([...current, product]) > PAGE_CONTENT_BUDGET_PX) {
      chunks.push(current);
      current = [product];
    } else {
      current.push(product);
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export function expandCategoriesForDescriptionFit(
  cats: PdfMenuCategoryWithProducts[],
  templateId?: PageTemplateId
): PdfMenuCategoryWithProducts[] {
  const out: PdfMenuCategoryWithProducts[] = [];
  for (const cat of cats) {
    const visible = cat.products.filter((p) => p.visible);
    if (visible.length === 0) {
      out.push(cat);
      continue;
    }
    const base = {
      templateId: templateId ?? "elegant",
      hasCategoryImage: Boolean(cat.category.image),
      imageCount: visible.filter((p) => Boolean(p.image)).length,
      avgNameLen: visible.reduce((s, p) => s + p.name.length, 0) / Math.max(1, visible.length),
      avgDescLen: visible.reduce((s, p) => s + (p.description?.length ?? 0), 0) / Math.max(1, visible.length),
    };
    const chunks = splitProductsToPageChunks(visible, base);
    chunks.forEach((products, index) => {
      const presentation = getCategoryPresentation({
        ...base,
        productCount: products.length,
        imageCount: products.filter((p) => Boolean(p.image)).length,
        products,
      });
      const split = chunks.length > 1;
      out.push({
        ...cat,
        products,
        computedSize: split ? 100 : cat.setting.pageSize !== "AUTO" ? cat.computedSize : presentation.capacity,
        continuation: Boolean(cat.continuation) || index > 0,
        setting: {
          ...cat.setting,
          categoryId: continuationCategoryId(cat.setting.categoryId, index),
          startOnNewPage: index > 0 || cat.setting.startOnNewPage,
        },
        category: {
          ...cat.category,
          name: index > 0 ? continuationTitle(cat.category.name) : cat.category.name.replace(/\s*—\s*متابعة\s*$/, ""),
        },
      });
    });
  }
  return out;
}

export function pageUtilization(sizes: number[]): number {
  return Math.min(100, sizes.reduce((sum, size) => sum + size, 0));
}

export function suggestedSizeName(capacity: 25 | 50 | 75 | 100) {
  return SIZE_NAME[capacity];
}

export function twoCategoryOrientation(counts: number[]): "stacked" | "side" {
  if (counts.length < 2) return "stacked";
  const [a, b] = counts;
  const total = (a ?? 0) + (b ?? 0);
  const max = Math.max(a ?? 0, b ?? 0);
  if (max >= 8 || total >= 12) return "stacked";
  if ((a ?? 0) <= 6 && (b ?? 0) <= 6) return "side";
  return "stacked";
}
