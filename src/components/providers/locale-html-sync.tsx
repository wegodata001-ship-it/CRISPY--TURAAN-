"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/types";
import { applyLocaleFonts } from "@/lib/typography/locale-fonts";

const STORAGE_KEY = "mishkat-locale";

/** Applies saved locale + fonts to <html> before paint to reduce flash */
export function LocaleHtmlScript() {
  const script = `
(function(){
  try {
    var loc = localStorage.getItem("${STORAGE_KEY}") || "${DEFAULT_LOCALE}";
    var meta = ${JSON.stringify(LOCALE_META)};
    var m = meta[loc] || meta["${DEFAULT_LOCALE}"];
    document.documentElement.lang = loc;
    document.documentElement.dir = m.dir;
    document.documentElement.dataset.locale = loc;
    var fonts = ${JSON.stringify({
      he: {
        sans: "var(--font-heebo), ui-sans-serif, system-ui, sans-serif",
        display: "var(--font-assistant), var(--font-heebo), ui-sans-serif, sans-serif",
      },
      en: {
        sans: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        display: "var(--font-playfair), Georgia, 'Times New Roman', serif",
      },
      ar: {
        sans: "var(--font-tajawal), ui-sans-serif, system-ui, sans-serif",
        display: "var(--font-cairo), var(--font-tajawal), ui-sans-serif, sans-serif",
      },
    })};
    var f = fonts[loc] || fonts["${DEFAULT_LOCALE}"];
    document.documentElement.style.setProperty("--font-sans", f.sans);
    document.documentElement.style.setProperty("--font-display", f.display);
  } catch(e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function LocaleHtmlSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
    applyLocaleFonts(locale);
  }, [locale]);
  return null;
}
