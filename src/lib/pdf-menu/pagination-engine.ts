import type {
  ArrangeMode,
  MenuPage,
  PageKind,
  PageTemplateId,
  PdfCoverSettings,
  PdfMenuCategorySetting,
  PdfMenuCategoryWithProducts,
  PdfMenuPageRecord,
  PdfPageSize,
} from "@/types/pdf-menu";
import { DEFAULT_PAGE_CUSTOM_SETTINGS } from "@/types/pdf-menu";
import { categoryFingerprint, getPageTemplate, recommendFromPage } from "@/lib/pdf-menu/page-templates";
import { TARGET_UTILIZATION_MIN, continuationTitle, pageUtilization, sourceCategoryId } from "@/lib/pdf-menu/presentation";

const CAPACITY: Record<Exclude<PdfPageSize, "AUTO">, number> = {
  QUARTER: 25,
  HALF: 50,
  THREE_QUARTERS: 75,
  FULL: 100,
};

const MAX_CATEGORIES_PER_PAGE = 2;

export function createPageId(): string {
  return `page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function computeAutoSize(productCount: number, hasImages: boolean, columns: number): number {
  const basePerProduct = hasImages ? 12 : 8;
  const headerSize = 8;
  const rawSize = headerSize + Math.ceil(productCount / Math.max(1, columns)) * basePerProduct;

  if (rawSize <= 25) return 25;
  if (rawSize <= 50) return 50;
  if (rawSize <= 75) return 75;
  return 100;
}

export function getCategoryCapacity(setting: PdfMenuCategorySetting, productCount: number): number {
  if (setting.pageSize !== "AUTO") {
    return CAPACITY[setting.pageSize];
  }
  return computeAutoSize(productCount, setting.showImages, setting.columns);
}

function usedCapacity(categories: PdfMenuCategoryWithProducts[]): number {
  return categories.reduce((sum, c) => sum + c.computedSize, 0);
}

function withPageNumbers(pages: MenuPage[]): MenuPage[] {
  return pages.map((page, index) => ({
    ...page,
    sortOrder: index,
    pageNumber: index + 1,
    usedCapacity: usedCapacity(page.categories),
    recommendedTemplateId: recommendFromPage(page),
  }));
}

function makeContentPage(
  categories: PdfMenuCategoryWithProducts[],
  extras?: Partial<MenuPage>
): MenuPage {
  const draft: MenuPage = {
    id: extras?.id ?? createPageId(),
    pageNumber: 0,
    sortOrder: 0,
    pageTemplateId: extras?.pageTemplateId ?? "minimal",
    pageKind: extras?.pageKind ?? "content",
    usedCapacity: usedCapacity(categories),
    categories,
    locked: extras?.locked ?? false,
    customSettings: extras?.customSettings ?? { ...DEFAULT_PAGE_CUSTOM_SETTINGS },
    recommendedTemplateId: "minimal",
  };
  draft.pageTemplateId = extras?.pageTemplateId ?? recommendFromPage(draft);
  if (!extras?.customSettings) {
    draft.customSettings = { ...getPageTemplate(draft.pageTemplateId).defaultSettings };
  }
  draft.recommendedTemplateId = recommendFromPage(draft);
  return draft;
}

export function makeCoverPage(cover?: PdfCoverSettings, existing?: MenuPage): MenuPage {
  const template = getPageTemplate("cover");
  return {
    id: existing?.id ?? createPageId(),
    pageNumber: 1,
    sortOrder: 0,
    pageTemplateId: "cover",
    pageKind: "cover",
    usedCapacity: 0,
    categories: [],
    locked: existing?.locked ?? false,
    customSettings: existing?.customSettings ?? {
      ...template.defaultSettings,
      backgroundImageUrl: cover?.backgroundUrl || template.defaultSettings.backgroundImageUrl,
    },
    recommendedTemplateId: "cover",
  };
}

export function packCategories(categories: PdfMenuCategoryWithProducts[]): PdfMenuCategoryWithProducts[][] {
  const visible = categories
    .filter((c) => c.setting.visible)
    .sort((a, b) => a.setting.sortOrder - b.setting.sortOrder);

  if (visible.length === 0) return [];

  const packed: PdfMenuCategoryWithProducts[][] = [];
  let current: PdfMenuCategoryWithProducts[] = [];
  let used = 0;

  for (const cat of visible) {
    const size = cat.computedSize;

    if (cat.setting.startOnNewPage && current.length > 0) {
      packed.push(current);
      current = [];
      used = 0;
    }

    const wouldOverflow = used + size > 100 && current.length > 0;
    const tooManyOnPage = current.length >= MAX_CATEGORIES_PER_PAGE;
    if (wouldOverflow || tooManyOnPage) {
      packed.push(current);
      current = [];
      used = 0;
    }

    current.push(cat);
    used += size;

    if (used >= 100) {
      packed.push(current);
      current = [];
      used = 0;
    }
  }

  if (current.length > 0) packed.push(current);
  return fillSparsePages(packed);
}

/**
 * Pull a later small leftover category into an under-filled page.
 * Keeps max 2 categories/page and never splits a full page.
 */
function fillSparsePages(packed: PdfMenuCategoryWithProducts[][]): PdfMenuCategoryWithProducts[][] {
  const pages = packed.map((group) => [...group]);

  for (let i = 0; i < pages.length; i++) {
    while (true) {
      const current = pages[i];
      if (!current || current.length === 0 || current.length >= MAX_CATEGORIES_PER_PAGE) break;
      const used = pageUtilization(current.map((c) => c.computedSize));
      if (used >= TARGET_UTILIZATION_MIN) break;

      let sourcePage = -1;
      for (let j = i + 1; j < pages.length; j++) {
        const group = pages[j];
        if (!group || group.length !== 1) continue;
        const candidate = group[0];
        if (!candidate || candidate.setting.startOnNewPage || candidate.continuation) continue;
        if (candidate.computedSize > 50) continue;
        if (used + candidate.computedSize > 100) continue;
        sourcePage = j;
        break;
      }
      if (sourcePage < 0) break;

      const moved = pages[sourcePage]?.shift();
      if (!moved) break;
      current.push(moved);
      if ((pages[sourcePage]?.length ?? 0) === 0) {
        pages.splice(sourcePage, 1);
      }
    }
  }

  return pages.filter((group) => group.length > 0);
}

/** Auto layout from categories. Cover is a normal page that can later be reordered. */
export function buildMenuPages(
  categories: PdfMenuCategoryWithProducts[],
  options?: { includeCover?: boolean; cover?: PdfCoverSettings }
): MenuPage[] {
  const packed = packCategories(categories);
  const pages: MenuPage[] = packed.map((cats) => makeContentPage(cats));
  if (options?.includeCover) {
    pages.unshift(makeCoverPage(options.cover));
  }
  return withPageNumbers(pages);
}

function findMatchingSavedPage(
  cats: PdfMenuCategoryWithProducts[],
  saved: MenuPage[]
): MenuPage | undefined {
  const fp = categoryFingerprint(cats);
  return saved.find((page) => categoryFingerprint(page.categories) === fp && page.pageKind !== "cover");
}

export function autoArrangeWithLocks(
  categories: PdfMenuCategoryWithProducts[],
  existing: MenuPage[],
  options?: { includeCover?: boolean; cover?: PdfCoverSettings }
): MenuPage[] {
  const locked = existing.filter((p) => p.locked);
  const lockedCategoryIds = new Set(
    locked.flatMap((p) => p.categories.map((c) => c.setting.categoryId))
  );
  const remaining = categories.filter((c) => !lockedCategoryIds.has(c.setting.categoryId));
  const autoPacked = packCategories(remaining).map((cats) => {
    const match = findMatchingSavedPage(cats, existing.filter((p) => !p.locked));
    return makeContentPage(cats, match ? {
      id: match.id,
      pageTemplateId: match.pageTemplateId,
      pageKind: match.pageKind,
      customSettings: match.customSettings,
      locked: false,
    } : undefined);
  });

  const originalUnlocked = existing.filter((p) => !p.locked);
  const result: MenuPage[] = [];
  let autoIndex = 0;

  for (const page of existing) {
    if (page.locked) {
      result.push(page);
      continue;
    }
    if (page.pageKind === "cover" && options?.includeCover) {
      result.push(makeCoverPage(options.cover, page));
      continue;
    }
    if (autoIndex < autoPacked.length) {
      result.push(autoPacked[autoIndex]!);
      autoIndex++;
    }
  }

  while (autoIndex < autoPacked.length) {
    result.push(autoPacked[autoIndex]!);
    autoIndex++;
  }

  const hasCover = result.some((p) => p.pageKind === "cover");
  if (options?.includeCover && !hasCover) {
    result.unshift(makeCoverPage(options.cover));
  }

  if (result.length === 0 && originalUnlocked.length === 0) {
    return buildMenuPages(categories, options);
  }

  return withPageNumbers(result);
}

export function hydratePagesFromRecords(
  records: PdfMenuPageRecord[],
  categories: PdfMenuCategoryWithProducts[],
  arrangeMode: ArrangeMode,
  options?: { includeCover?: boolean; cover?: PdfCoverSettings }
): MenuPage[] {
  const byId = new Map(categories.map((c) => [c.setting.categoryId, c]));

  const hydrated: MenuPage[] = records
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((record) => {
      const cats = record.categorySlots
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((slot) => byId.get(slot.categoryId))
        .filter((c): c is PdfMenuCategoryWithProducts => Boolean(c));

      return {
        id: record.id,
        pageNumber: 0,
        sortOrder: record.sortOrder,
        pageTemplateId: record.pageTemplateId,
        pageKind: record.pageKind,
        usedCapacity: usedCapacity(cats),
        categories: cats,
        locked: record.locked,
        customSettings: { ...DEFAULT_PAGE_CUSTOM_SETTINGS, ...record.customSettings },
        recommendedTemplateId: "minimal",
      } satisfies MenuPage;
    });

  if (arrangeMode === "manual" && hydrated.length > 0) {
    return withPageNumbers(hydrated);
  }

  if (hydrated.length === 0) {
    return buildMenuPages(categories, options);
  }

  return autoArrangeWithLocks(categories, hydrated, options);
}

export function serializePages(pages: MenuPage[], templateId: string, now = new Date().toISOString()): PdfMenuPageRecord[] {
  return withPageNumbers(pages).map((page) => ({
    id: page.id,
    templateId,
    sortOrder: page.sortOrder,
    pageTemplateId: page.pageTemplateId,
    pageKind: page.pageKind,
    locked: page.locked,
    customSettings: page.customSettings,
    categorySlots: page.categories.map((cat, index) => ({
      categoryId: cat.setting.categoryId,
      sortOrder: index,
      size: cat.computedSize,
    })),
    createdAt: now,
    updatedAt: now,
  }));
}

export function reorderPages(pages: MenuPage[], fromIndex: number, toIndex: number): MenuPage[] {
  if (fromIndex === toIndex) return withPageNumbers(pages);
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= pages.length || toIndex >= pages.length) {
    return withPageNumbers(pages);
  }
  const next = [...pages];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return withPageNumbers(pages);
  next.splice(toIndex, 0, moved);
  return withPageNumbers(next);
}

export function movePage(pages: MenuPage[], pageId: string, direction: "up" | "down"): MenuPage[] {
  const index = pages.findIndex((p) => p.id === pageId);
  if (index < 0) return pages;
  const toIndex = direction === "up" ? index - 1 : index + 1;
  return reorderPages(pages, index, toIndex);
}

export function changePageTemplate(pages: MenuPage[], pageId: string, pageTemplateId: PageTemplateId): MenuPage[] {
  return withPageNumbers(
    pages.map((page) => {
      if (page.id !== pageId) return page;
      const def = getPageTemplate(pageTemplateId);
      return {
        ...page,
        pageTemplateId,
        pageKind: page.pageKind === "cover" && pageTemplateId !== "cover" ? "content" : page.pageKind,
        customSettings: {
          ...def.defaultSettings,
          backgroundImageUrl: page.customSettings.backgroundImageUrl || def.defaultSettings.backgroundImageUrl,
        },
      };
    })
  );
}

export function updatePageSettings(
  pages: MenuPage[],
  pageId: string,
  updates: Partial<Pick<MenuPage, "locked" | "customSettings" | "pageKind">>
): MenuPage[] {
  return withPageNumbers(
    pages.map((page) => {
      if (page.id !== pageId) return page;
      return {
        ...page,
        ...updates,
        customSettings: updates.customSettings
          ? { ...page.customSettings, ...updates.customSettings }
          : page.customSettings,
      };
    })
  );
}

export function canFitInPage(page: MenuPage, categorySize: number): boolean {
  return page.usedCapacity + categorySize <= 100;
}

export function moveCategoryToPage(
  pages: MenuPage[],
  categoryId: string,
  destPageId: string
): { pages: MenuPage[]; ok: boolean; reason?: string } {
  const dest = pages.find((p) => p.id === destPageId);
  if (!dest) return { pages, ok: false, reason: "missing-page" };
  if (dest.pageKind === "cover") return { pages, ok: false, reason: "cover" };

  let moving: PdfMenuCategoryWithProducts | undefined;
  const stripped = pages.map((page) => {
    const found = page.categories.find((c) => c.setting.categoryId === categoryId);
    if (!found) return page;
    moving = found;
    return { ...page, categories: page.categories.filter((c) => c.setting.categoryId !== categoryId) };
  });

  if (!moving) return { pages, ok: false, reason: "missing-category" };

  const destAfter = stripped.find((p) => p.id === destPageId)!;
  if (!canFitInPage({ ...destAfter, usedCapacity: usedCapacity(destAfter.categories) }, moving.computedSize)) {
    return { pages, ok: false, reason: "overflow" };
  }

  const next = stripped.map((page) => {
    if (page.id !== destPageId) return page;
    return { ...page, categories: [...page.categories, moving!] };
  });

  return { pages: withPageNumbers(next), ok: true };
}

const KIND_DEFAULT_TEMPLATE: Record<PageKind, PageTemplateId> = {
  cover: "cover",
  content: "minimal",
  blank: "minimal",
  offer: "promo",
  image: "split",
  custom: "minimal",
};

export function addPage(
  pages: MenuPage[],
  kind: PageKind,
  options?: { afterId?: string; pageTemplateId?: PageTemplateId }
): MenuPage[] {
  const templateId = options?.pageTemplateId ?? KIND_DEFAULT_TEMPLATE[kind];
  const def = getPageTemplate(templateId);
  const page = makeContentPage([], {
    pageKind: kind,
    pageTemplateId: templateId,
    customSettings: { ...def.defaultSettings },
  });

  const afterIndex = options?.afterId ? pages.findIndex((p) => p.id === options.afterId) : pages.length - 1;
  const insertAt = afterIndex >= 0 ? afterIndex + 1 : pages.length;
  const next = [...pages];
  next.splice(insertAt, 0, page);
  return withPageNumbers(next);
}

export function addTwoCategoryPage(pages: MenuPage[]): MenuPage[] {
  return addPage(pages, "content", { pageTemplateId: "two-categories" });
}

export function deletePage(pages: MenuPage[], pageId: string): MenuPage[] {
  return withPageNumbers(pages.filter((p) => p.id !== pageId));
}

export function duplicatePage(
  pages: MenuPage[],
  pageId: string,
  mode: "design" | "content"
): MenuPage[] {
  const index = pages.findIndex((p) => p.id === pageId);
  const source = pages[index];
  if (!source) return pages;
  const copy: MenuPage = {
    ...source,
    id: createPageId(),
    locked: false,
    categories: mode === "content" ? source.categories.map((c) => ({ ...c })) : [],
    customSettings: { ...source.customSettings },
  };
  const next = [...pages];
  next.splice(index + 1, 0, copy);
  return withPageNumbers(next);
}

/** Stable export order — preview and PDF must use this exact sequence. */
export function getPageExportOrder(pages: MenuPage[]): string[] {
  return withPageNumbers(pages.slice().sort((a, b) => a.sortOrder - b.sortOrder)).map((p) => p.id);
}

export function renumberPages(pages: MenuPage[]): MenuPage[] {
  return withPageNumbers(pages);
}

/**
 * Move the last product on a page onto a new continuation page.
 * Used when a rendered page still overflows after packing.
 */
export function peelLastProductFromPage(page: MenuPage): { page: MenuPage; continuation: MenuPage } | null {
  if (page.pageKind === "cover") return null;
  const total = page.categories.reduce((n, c) => n + c.products.filter((p) => p.visible).length, 0);
  if (total <= 1) return null;

  const cats = page.categories.map((c) => ({
    ...c,
    products: c.products.map((p) => ({ ...p })),
  }));

  for (let i = cats.length - 1; i >= 0; i--) {
    const cat = cats[i];
    if (!cat || cat.products.length === 0) continue;
    const moved = cat.products.pop();
    if (!moved) continue;
    const remaining = cats.filter((c) => c.products.length > 0);
    if (remaining.reduce((n, c) => n + c.products.length, 0) < 1) return null;

    const continuationCat: PdfMenuCategoryWithProducts = {
      ...cat,
      products: [moved],
      computedSize: 100,
      continuation: true,
      setting: {
        ...cat.setting,
        categoryId: `${sourceCategoryId(cat.setting.categoryId)}__p${createPageId().slice(-6)}`,
        startOnNewPage: true,
      },
      category: {
        ...cat.category,
        name: continuationTitle(cat.category.name),
      },
    };

    return {
      page: {
        ...page,
        categories: remaining,
        usedCapacity: remaining.reduce((sum, c) => sum + c.computedSize, 0),
      },
      continuation: makeContentPage([continuationCat], {
        pageTemplateId: page.pageTemplateId === "cover" ? "elegant" : page.pageTemplateId,
        customSettings: { ...page.customSettings },
      }),
    };
  }
  return null;
}

export function validatePages(pages: MenuPage[]): string[] {
  const warnings: string[] = [];

  for (const page of pages) {
    if (page.usedCapacity > 100) {
      warnings.push(`Page ${page.pageNumber}: overflow (${page.usedCapacity}%)`);
    }
    if (page.pageKind === "content" && page.categories.length === 0) {
      warnings.push(`Page ${page.pageNumber}: empty page`);
    }
    for (const cat of page.categories) {
      if (cat.products.length === 0) {
        warnings.push(`Page ${page.pageNumber}: "${cat.category.name}" has no products`);
      }
      const missingPrices = cat.products.filter((p) => p.visible && p.price === 0);
      if (missingPrices.length > 0) {
        warnings.push(`"${cat.category.name}": ${missingPrices.length} products without price`);
      }
    }
  }

  return warnings;
}
