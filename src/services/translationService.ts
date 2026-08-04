import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Locale, TranslationMap, UiTranslationsDoc } from "@/lib/i18n/types";
import { UI_TRANSLATIONS_SEED } from "@/data/ui-translations-seed";

function docToMap(data: Record<string, unknown> | undefined): TranslationMap {
  if (!data?.strings || typeof data.strings !== "object") return {};
  return data.strings as TranslationMap;
}

export async function fetchLocaleStrings(locale: Locale): Promise<TranslationMap> {
  try {
    const db = getDb();
    const snap = await getDoc(doc(db, COLLECTIONS.uiTranslations, locale));
    if (snap.exists()) {
      const mapped = docToMap(snap.data());
      if (Object.keys(mapped).length > 0) return mapped;
    }
  } catch {
    /* fallback below */
  }
  return UI_TRANSLATIONS_SEED[locale] ?? {};
}

export async function fetchAllLocaleStrings(): Promise<Record<Locale, TranslationMap>> {
  try {
    const db = getDb();
    const snap = await getDocs(collection(db, COLLECTIONS.uiTranslations));
    const result: Record<string, TranslationMap> = {};
    for (const d of snap.docs) {
      const mapped = docToMap(d.data());
      if (Object.keys(mapped).length > 0) result[d.id] = mapped;
    }
    if (Object.keys(result).length > 0) {
      return {
        he: result.he ?? UI_TRANSLATIONS_SEED.he,
        ar: result.ar ?? UI_TRANSLATIONS_SEED.ar,
        en: result.en ?? UI_TRANSLATIONS_SEED.en,
      };
    }
  } catch {
    /* fallback */
  }
  return UI_TRANSLATIONS_SEED;
}

export function subscribeToLocaleStrings(
  locale: Locale,
  onData: (strings: TranslationMap) => void,
  onError?: (msg: string) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(
    doc(db, COLLECTIONS.uiTranslations, locale),
    (snap) => {
      if (snap.exists()) {
        const mapped = docToMap(snap.data());
        onData(Object.keys(mapped).length > 0 ? mapped : UI_TRANSLATIONS_SEED[locale]);
      } else {
        onData(UI_TRANSLATIONS_SEED[locale]);
      }
    },
    (err) => {
      onError?.(err.message);
      onData(UI_TRANSLATIONS_SEED[locale]);
    }
  );
}

export function getSeedTranslations(): Record<Locale, TranslationMap> {
  return UI_TRANSLATIONS_SEED;
}

export type { UiTranslationsDoc };
