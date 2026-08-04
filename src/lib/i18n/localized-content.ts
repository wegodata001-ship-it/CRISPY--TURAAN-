import type { Locale } from "@/lib/i18n/types";
import type { Category, Product } from "@/types";

type LocalizedFields = {
  name_he: string;
  name_ar: string;
  name_en: string;
};

type LocalizedDescriptions = LocalizedFields & {
  description_he: string;
  description_ar: string;
  description_en: string;
};

export function getLocalizedName(item: LocalizedFields, locale: Locale): string {
  switch (locale) {
    case "he":
      return item.name_he || item.name_en;
    case "ar":
      return item.name_ar || item.name_he || item.name_en;
    case "en":
      return item.name_en || item.name_he;
    default:
      return item.name_en;
  }
}

export function getLocalizedDescription(
  item: Pick<Product, "description_he" | "description_ar" | "description_en">,
  locale: Locale
): string {
  switch (locale) {
    case "he":
      return item.description_he || item.description_en;
    case "ar":
      return item.description_ar || item.description_he || item.description_en;
    case "en":
      return item.description_en || item.description_he;
    default:
      return item.description_en;
  }
}

export function getProductDisplayName(product: Product, locale: Locale): string {
  return getLocalizedName(product, locale);
}

export function getCategoryDisplayName(category: Category, locale: Locale): string {
  return getLocalizedName(category, locale);
}

export function isRtlLocale(locale: Locale): boolean {
  return locale === "he" || locale === "ar";
}

export function textDir(locale: Locale): "rtl" | "ltr" {
  return isRtlLocale(locale) ? "rtl" : "ltr";
}

/** Legacy compat — maps old name_ar (was Hebrew) to name_he when needed */
export function normalizeProductFields(p: Product): LocalizedDescriptions {
  return {
    name_he: p.name_he,
    name_ar: p.name_ar,
    name_en: p.name_en,
    description_he: p.description_he,
    description_ar: p.description_ar,
    description_en: p.description_en,
  };
}
