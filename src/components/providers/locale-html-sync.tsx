"use client";

import { useEffect } from "react";
import { DEFAULT_LOCALE, LOCALE_META, type Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "mishkat-locale";

/** Applies saved locale to <html> before paint to reduce flash */
export function LocaleHtmlScript() {
  const script = `
(function(){
  try {
    var loc = localStorage.getItem("${STORAGE_KEY}") || "${DEFAULT_LOCALE}";
    var meta = ${JSON.stringify(LOCALE_META)};
    var m = meta[loc] || meta["${DEFAULT_LOCALE}"];
    document.documentElement.lang = loc;
    document.documentElement.dir = m.dir;
  } catch(e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function LocaleHtmlSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = LOCALE_META[locale].dir;
  }, [locale]);
  return null;
}
