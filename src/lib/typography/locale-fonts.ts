import type { Locale } from "@/lib/i18n/types";

/** CSS variable names for locale-aware font stacks (set on <html data-locale>) */
export const LOCALE_FONT_VARS: Record<
  Locale,
  { sans: string; display: string }
> = {
  he: {
    sans: "var(--font-heebo), ui-sans-serif, system-ui, sans-serif",
    display: "var(--font-assistant), var(--font-heebo), ui-sans-serif, sans-serif",
  },
  en: {
    sans: "var(--font-heebo), ui-sans-serif, system-ui, sans-serif",
    display: "var(--font-assistant), var(--font-heebo), ui-sans-serif, sans-serif",
  },
  ar: {
    sans: "var(--font-tajawal), ui-sans-serif, system-ui, sans-serif",
    display: "var(--font-cairo), var(--font-tajawal), ui-sans-serif, sans-serif",
  },
};

export function applyLocaleFonts(locale: Locale) {
  if (typeof document === "undefined") return;
  const fonts = LOCALE_FONT_VARS[locale] ?? LOCALE_FONT_VARS.he;
  document.documentElement.dataset.locale = locale;
  document.documentElement.style.setProperty("--font-sans", fonts.sans);
  document.documentElement.style.setProperty("--font-display", fonts.display);
}
