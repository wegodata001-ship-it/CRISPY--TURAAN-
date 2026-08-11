"use client";

import { useMemo } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import {
  getCategoryDisplayName,
  getLocalizedDescription,
  getProductDisplayName,
  textDir,
} from "@/lib/i18n/localized-content";
import type { Category, Product } from "@/types";

export function useLocalizedProduct(product: Product) {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      name: getProductDisplayName(product, locale),
      description: getLocalizedDescription(product, locale),
      dir: textDir(locale),
      locale,
    }),
    [product, locale]
  );
}

export function useLocalizedCategory(category: Category | null) {
  const { locale } = useLocale();
  return useMemo(
    () => ({
      name: category ? getCategoryDisplayName(category, locale) : "",
      dir: textDir(locale),
      locale,
    }),
    [category, locale]
  );
}
