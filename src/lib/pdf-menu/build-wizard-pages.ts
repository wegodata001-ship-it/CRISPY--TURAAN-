import type { Category, Product } from "@/types";
import type {
  MenuPage,
  PageCustomSettings,
  PageTemplateId,
  PdfMenuCategoryWithProducts,
  PdfMenuDraft,
  PdfMenuProductView,
  PdfMenuTemplate,
} from "@/types/pdf-menu";
import { DEFAULT_CATEGORY_SETTING, DEFAULT_COVER_SETTINGS, DEFAULT_FOOTER_SETTINGS, DEFAULT_QR_SETTINGS } from "@/types/pdf-menu";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Locale } from "@/lib/i18n/types";
import { packCategories, createPageId, makeCoverPage } from "@/lib/pdf-menu/pagination-engine";
import { getPageTemplate } from "@/lib/pdf-menu/page-templates";
import { getColorTheme } from "@/lib/pdf-menu/color-themes";
import {
  expandCategoriesForDescriptionFit,
  getCategoryPresentation,
  IMAGE_COVERAGE_THRESHOLD,
  sourceCategoryId,
  twoCategoryOrientation,
} from "@/lib/pdf-menu/presentation";
import type { AppSettings } from "@/services/settingsService";

function pickPageTemplate(
  cats: PdfMenuCategoryWithProducts[],
  globalTemplate: PageTemplateId,
  override?: PageTemplateId
): PageTemplateId {
  if (override) return override;
  if (cats.length >= 2) return "two-categories";
  const products = cats.flatMap((c) => c.products);
  const imageRatio = products.length === 0 ? 0 : products.filter((p) => Boolean(p.image)).length / products.length;
  if (imageRatio < IMAGE_COVERAGE_THRESHOLD && globalTemplate === "image-focus") {
    return "elegant";
  }
  return globalTemplate;
}

export function isProductExcluded(draft: PdfMenuDraft, productId: string): boolean {
  return draft.excludedProductIds.includes(productId);
}

function toView(product: Product, locale: Locale): PdfMenuProductView {
  return {
    id: product.id,
    name: getLocalizedName(product, locale),
    description: locale === "ar" ? product.description_ar : locale === "he" ? product.description_he : product.description_en,
    price: product.price,
    image: product.image,
    visible: true,
    sortOrder: product.sortOrder,
  };
}

export function selectedCategoriesWithProducts(
  draft: PdfMenuDraft,
  categories: Category[],
  products: Product[],
  locale: Locale
): PdfMenuCategoryWithProducts[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const result: PdfMenuCategoryWithProducts[] = [];

  draft.selectedCategoryIds.forEach((id, index) => {
    const cat = catMap.get(id);
    if (!cat) return;
    const catProducts = products
      .filter((p) => p.categoryId === id && p.available && p.active)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .filter((p) => !isProductExcluded(draft, p.id))
      .map((p) => toView(p, locale));
    if (catProducts.length === 0) return;

    const sizeOverride = draft.categorySizes[id];
    const presentation = getCategoryPresentation({
      productCount: catProducts.length,
      imageCount: catProducts.filter((p) => Boolean(p.image)).length,
      avgNameLen: catProducts.reduce((s, p) => s + p.name.length, 0) / Math.max(1, catProducts.length),
      avgDescLen: catProducts.reduce((s, p) => s + p.description.length, 0) / Math.max(1, catProducts.length),
      templateId: draft.templateId,
      hasCategoryImage: Boolean(cat.image),
      products: catProducts,
    });
    const computedSize =
      sizeOverride && sizeOverride !== "AUTO"
        ? sizeOverride === "QUARTER"
          ? 25
          : sizeOverride === "HALF"
            ? 50
            : sizeOverride === "THREE_QUARTERS"
              ? 75
              : 100
        : presentation.capacity;

    result.push({
      setting: {
        ...DEFAULT_CATEGORY_SETTING,
        id: "",
        templateId: "wizard",
        categoryId: id,
        sortOrder: index,
        pageSize: sizeOverride ?? "AUTO",
      },
      category: { id, name: getLocalizedName(cat, locale), image: cat.image },
      products: catProducts,
      computedSize,
    });
  });

  return expandCategoriesForDescriptionFit(result, draft.templateId);
}

export function autoPackCategoryIds(cats: PdfMenuCategoryWithProducts[]): string[][] {
  return packCategories(cats).map((group) => group.map((c) => c.setting.categoryId));
}

function themeSettings(draft: PdfMenuDraft, isCover: boolean): PageCustomSettings {
  const theme = getColorTheme(draft.colorThemeId, draft.customColors);
  const template = getPageTemplate(draft.templateId);
  return {
    ...template.defaultSettings,
    backgroundColor: isCover ? theme.coverBg : theme.colors.background,
    accentColor: theme.colors.accent,
    textColor: isCover ? theme.coverText : theme.colors.text,
    headingColor: isCover ? theme.coverText : theme.colors.primary,
    backgroundImageUrl: "",
  };
}

export function buildWizardMenuTemplate(
  draft: PdfMenuDraft,
  settings: AppSettings,
  qrDataUrl: string,
  orderUrl: string
): PdfMenuTemplate {
  return {
    id: "wizard",
    name: "قائمة PDF",
    active: true,
    language: "ar",
    direction: "rtl",
    arrangeMode: draft.layoutMode,
    coverSettings: {
      ...DEFAULT_COVER_SETTINGS,
      enabled: draft.showCover,
      logoUrl: draft.showLogo ? draft.logoOverrideUrl || settings.logoUrl : "",
      backgroundUrl: settings.storeImageUrl,
      businessName: settings.storeName,
      subtitle: "القائمة",
      phone: settings.phone,
      instagram: settings.social.instagram,
      whatsapp: settings.social.whatsapp,
      qrUrl: draft.showQr ? qrDataUrl : "",
      showQr: draft.showQr && Boolean(qrDataUrl || orderUrl),
    },
    footerSettings: {
      ...DEFAULT_FOOTER_SETTINGS,
      enabled: true,
      businessName: settings.storeName,
      phone: settings.phone,
      instagram: settings.social.instagram,
      website: orderUrl,
      showPageNumber: true,
    },
    qrSettings: {
      ...DEFAULT_QR_SETTINGS,
      enabled: draft.showQr,
      url: orderUrl,
      position: "cover",
    },
    createdAt: "",
    updatedAt: "",
  };
}

export function buildWizardPages(
  draft: PdfMenuDraft,
  cats: PdfMenuCategoryWithProducts[],
  settings: AppSettings,
  qrDataUrl: string,
  orderUrl: string
): { pages: MenuPage[]; menuTemplate: PdfMenuTemplate } {
  const byId = new Map(cats.map((c) => [c.setting.categoryId, c]));
  const menuTemplate = buildWizardMenuTemplate(draft, settings, qrDataUrl, orderUrl);
  const globalTemplate = draft.templateId;

  let slots = draft.layoutMode === "manual" && draft.pageOrder.length > 0
    ? draft.pageOrder
        .map((slot) => ({
          id: slot.id,
          cats: slot.categoryIds.map((id) => byId.get(id)).filter((c): c is PdfMenuCategoryWithProducts => Boolean(c)),
        }))
        .filter((s) => s.cats.length > 0)
    : autoPackCategoryIds(cats).map((ids) => ({
        id: createPageId(),
        cats: ids.map((id) => byId.get(id)).filter((c): c is PdfMenuCategoryWithProducts => Boolean(c)),
      }));

  const contentPages: MenuPage[] = slots.map((slot, index) => {
    const override = draft.pageTemplateOverrides[slot.id];
    const pageTemplateId = pickPageTemplate(slot.cats, globalTemplate, override);
    const sideBySide =
      slot.cats.length === 2 &&
      twoCategoryOrientation(slot.cats.map((c) => c.products.length)) === "side";
    return {
      id: slot.id,
      pageNumber: 0,
      sortOrder: index,
      pageTemplateId,
      pageKind: "content",
      usedCapacity: slot.cats.reduce((s, c) => s + c.computedSize, 0),
      categories: slot.cats,
      locked: false,
      customSettings: {
        ...themeSettings(draft, false),
        columns: slot.cats.length >= 2 ? (sideBySide ? 2 : 1) : themeSettings(draft, false).columns,
      },
      recommendedTemplateId: pageTemplateId,
    };
  });

  const pages: MenuPage[] = [];
  if (draft.showCover) {
    const cover = makeCoverPage(menuTemplate.coverSettings);
    cover.customSettings = {
      ...themeSettings(draft, true),
      backgroundImageUrl: menuTemplate.coverSettings.backgroundUrl || "",
    };
    pages.push(cover);
  }
  pages.push(...contentPages);

  const numbered = pages.map((page, index) => ({
    ...page,
    sortOrder: index,
    pageNumber: index + 1,
  }));

  return { pages: numbered, menuTemplate };
}

export function draftFromPackedPages(cats: PdfMenuCategoryWithProducts[]): PdfMenuDraft["pageOrder"] {
  return autoPackCategoryIds(cats).map((ids) => ({ id: createPageId(), categoryIds: ids }));
}

export function prunePageOrder(pageOrder: PdfMenuDraft["pageOrder"], selectedIds: string[]): PdfMenuDraft["pageOrder"] {
  const allowed = new Set(selectedIds);
  return pageOrder
    .map((slot) => ({
      ...slot,
      categoryIds: slot.categoryIds.filter((id) => allowed.has(id) || allowed.has(sourceCategoryId(id))),
    }))
    .filter((slot) => slot.categoryIds.length > 0);
}

export function syncPageOrder(draft: PdfMenuDraft, cats: PdfMenuCategoryWithProducts[]): PdfMenuDraft["pageOrder"] {
  const ids = cats.map((c) => c.setting.categoryId);
  if (draft.layoutMode === "auto" || draft.pageOrder.length === 0) {
    const packed = autoPackCategoryIds(cats);
    if (
      packed.length === draft.pageOrder.length &&
      packed.every((group, i) => draft.pageOrder[i]?.categoryIds.join(",") === group.join(","))
    ) {
      return draft.pageOrder;
    }
    return packed.map((categoryIds, index) => ({
      id: draft.pageOrder[index]?.id ?? createPageId(),
      categoryIds,
    }));
  }
  const pruned = prunePageOrder(draft.pageOrder, ids);
  const known = new Set(pruned.flatMap((p) => p.categoryIds));
  const extra = ids
    .filter((id) => !known.has(id))
    .map((id) => ({ id: createPageId(), categoryIds: [id] }));
  return [...pruned, ...extra];
}
