"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useAllProductModifierGroups,
  useModifierGroups,
  useModifierOptions,
} from "@/hooks/useModifiers";
import { useLocale } from "@/components/providers/locale-provider";
import {
  buildModifierPreviewByProductId,
  type ModifierPreviewGroup,
} from "@/lib/menu/modifier-preview";

const ModifierPreviewContext = createContext<Map<string, ModifierPreviewGroup[]>>(
  new Map()
);

/**
 * Loads modifier catalog data once and shares display-only previews by productId.
 * Avoids per-card N+1 builder subscriptions.
 */
export function CatalogModifierPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const { groups } = useModifierGroups();
  const { options } = useModifierOptions();
  const { links } = useAllProductModifierGroups();

  const previewByProductId = useMemo(
    () => buildModifierPreviewByProductId(links, groups, options, locale),
    [links, groups, options, locale]
  );

  return (
    <ModifierPreviewContext.Provider value={previewByProductId}>
      {children}
    </ModifierPreviewContext.Provider>
  );
}

export function useProductModifierPreview(
  productId: string
): ModifierPreviewGroup[] {
  const map = useContext(ModifierPreviewContext);
  return map.get(productId) ?? [];
}
