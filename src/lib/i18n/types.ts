/** Supported locales — extend this array to add languages without code changes elsewhere */
export const LOCALES = ["he", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

export const LOCALE_META: Record<
  Locale,
  { label: string; nativeLabel: string; dir: "rtl" | "ltr"; flag: string }
> = {
  he: { label: "Hebrew", nativeLabel: "עברית", dir: "rtl", flag: "🇮🇱" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl", flag: "🇸🇦" },
  en: { label: "English", nativeLabel: "English", dir: "ltr", flag: "🇬🇧" },
};

export type TranslationMap = Record<string, string>;

export type UiTranslationsDoc = {
  locale: Locale;
  strings: TranslationMap;
  version: number;
  updatedAt?: string;
};
