/** Supported locales — extend this array to add languages without code changes elsewhere */
export const LOCALES = ["he", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; dir: "rtl" | "ltr" }
> = {
  he: { label: "Hebrew", nativeLabel: "עברית", dir: "rtl" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  en: { label: "English", nativeLabel: "English", dir: "ltr" },
};

export type TranslationMap = Record<string, string>;

export type UiTranslationsDoc = {
  locale: Locale;
  strings: TranslationMap;
  version: number;
  updatedAt?: string;
};
