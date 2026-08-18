import type { PageTemplateId, PdfMenuProductView } from "@/types/pdf-menu";

export const IMAGE_COVERAGE_THRESHOLD = 0.7;
export const PAGE_BODY_HEIGHT_PX = 980;
export const TARGET_UTILIZATION_MIN = 70;

export type CategoryLayoutKind = "list" | "grid" | "hero-list" | "hero-cards";

export interface CategoryPresentation {
  layout: CategoryLayoutKind;
  columns: 1 | 2 | 3;
  estimatedHeight: number;
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
}

export interface CategoryPresentationInput {
  productCount: number;
  imageCount: number;
  avgNameLen?: number;
  avgDescLen?: number;
  hasCategoryImage?: boolean;
  templateId?: PageTemplateId;
  pageCategoryCount?: number;
  forceList?: boolean;
}

const SIZE_NAME = {
  25: "quarter",
  50: "half",
  75: "three_quarters",
  100: "full",
} as const;

function snapCapacity(fraction: number): 25 | 50 | 75 | 100 {
  if (fraction <= 0.3) return 25;
  if (fraction <= 0.55) return 50;
  if (fraction <= 0.8) return 75;
  return 100;
}

function listTemplate(template: PageTemplateId): boolean {
  return template === "minimal" || template === "elegant" || template === "two-categories";
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
  const avgDesc = input.avgDescLen ?? 0;
  const longCopy = avgDesc > 40 || (input.avgNameLen ?? 0) > 32;

  const preferList =
    Boolean(input.forceList) ||
    listTemplate(template) ||
    template === "split" ||
    imageCoverage < IMAGE_COVERAGE_THRESHOLD;

  const useCategoryHero = Boolean(input.hasCategoryImage) && preferList && !shared && count <= 10;

  let layout: CategoryLayoutKind;
  if (preferList) {
    layout = useCategoryHero ? "hero-list" : "list";
  } else if (count <= 3 && !shared) {
    layout = "hero-cards";
  } else {
    layout = "grid";
  }

  const density: "large" | "medium" | "compact" =
    count <= 3 ? "large" : count <= 12 ? "medium" : "compact";

  let columns: 1 | 2 | 3 = 1;
  if (layout === "list" || layout === "hero-list") {
    if (count <= 1) columns = 1;
    else if (count <= 3) columns = shared ? 1 : 2;
    else columns = 2;
  } else if (layout === "hero-cards") {
    columns = count === 1 ? 1 : 2;
  } else if (template === "promo" && count >= 9) {
    columns = 2;
  } else {
    columns = count === 1 ? 1 : 2;
  }

  const titleSize = density === "large" && !shared ? 32 : density === "compact" ? 26 : 30;
  const nameSize = density === "large" ? 18 : density === "compact" ? 15 : 16;
  const descSize = density === "compact" ? 11 : 12;
  const priceSize = density === "large" ? 17 : density === "compact" ? 14 : 16;
  const rowGap = density === "large" ? 18 : density === "compact" ? 7 : 11;

  const headerH = 56;
  const itemH =
    layout === "grid" || layout === "hero-cards"
      ? (density === "large" ? 220 : density === "medium" ? 168 : 128) + (avgDesc > 0 ? 18 : 0)
      : (density === "large" ? 52 : density === "compact" ? 34 : 42) + (avgDesc > 8 ? 14 : 0);
  const rows = Math.ceil(Math.max(count, 1) / columns);
  const estimatedHeight = headerH + rows * itemH + rowGap * Math.max(0, rows - 1);

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

  if (longCopy && fraction < 1 && count >= 6) {
    fraction = Math.min(1, fraction + 0.25);
  }

  const capacity = snapCapacity(fraction);

  return {
    layout,
    columns,
    estimatedHeight: Math.max(estimatedHeight, Math.round((capacity / 100) * PAGE_BODY_HEIGHT_PX)),
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
    showProductImages: !preferList,
    useCategoryHero,
    preferList,
  };
}

export function estimateCategoryHeight(input: CategoryPresentationInput, templateId?: PageTemplateId): number {
  return getCategoryPresentation({ ...input, templateId: templateId ?? input.templateId }).estimatedHeight;
}

export function productRowWeight(product: Pick<PdfMenuProductView, "name" | "description">): number {
  return 34 + (product.description?.trim() ? 16 : 0) + (product.name.length > 22 ? 8 : 0);
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

export function pageUtilization(sizes: number[]): number {
  return Math.min(100, sizes.reduce((sum, size) => sum + size, 0));
}

export function suggestedSizeName(capacity: 25 | 50 | 75 | 100) {
  return SIZE_NAME[capacity];
}

export function twoCategoryOrientation(
  counts: number[]
): "stacked" | "side" {
  if (counts.length < 2) return "stacked";
  const [a, b] = counts;
  const total = (a ?? 0) + (b ?? 0);
  const max = Math.max(a ?? 0, b ?? 0);
  if (max >= 8 || total >= 12) return "stacked";
  if ((a ?? 0) <= 6 && (b ?? 0) <= 6) return "side";
  return "stacked";
}
