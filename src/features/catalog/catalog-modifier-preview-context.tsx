"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  useAllProductModifierGroups,
  useCategoryModifierGroups,
  useModifierGroups,
  useModifierOptions,
  useProductAddonExclusions,
} from "@/hooks/useModifiers";
import { useAllProducts, useCategories } from "@/hooks/useProducts";
import { useLocale } from "@/components/providers/locale-provider";
import {
  buildModifierPreviewByProductId,
  type ModifierPreviewGroup,
} from "@/lib/menu/modifier-preview";
import { buildProductBuilderConfig } from "@/lib/product-builder/engine";
import { buildResolvedProductModifierLinks } from "@/lib/product-builder/category-addons";
import type { Product } from "@/types";
import type { ProductBuilderConfig } from "@/types/modifiers";

type CatalogAddonsContextValue = {
  previewByProductId: Map<string, ModifierPreviewGroup[]>;
  configByProductId: Map<string, ProductBuilderConfig>;
  loading: boolean;
};

const CatalogAddonsContext = createContext<CatalogAddonsContextValue>({
  previewByProductId: new Map(),
  configByProductId: new Map(),
  loading: true,
});

export function emptyProductAddonConfig(productId: string): ProductBuilderConfig {
  return { productId, groups: [], rules: [], suggestions: [] };
}

/**
 * One shared catalog load for cards + product modal.
 * FINAL = category defaults + product extras − exclusions (de-duped).
 */
export function CatalogModifierPreviewProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { locale } = useLocale();
  const { groups, loading: groupsLoading } = useModifierGroups();
  const { options, loading: optionsLoading } = useModifierOptions();
  const { links, loading: linksLoading } = useAllProductModifierGroups();
  const { links: categoryLinks, loading: categoryLinksLoading } = useCategoryModifierGroups();
  const { exclusions, loading: exclusionsLoading } = useProductAddonExclusions();
  const { products, loading: productsLoading } = useAllProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  const productsForResolve = useMemo(() => {
    const byId = new Map<string, Pick<Product, "id" | "categoryId" | "subcategoryId">>();
    for (const product of products) {
      byId.set(product.id, product);
    }
    for (const link of links) {
      if (!byId.has(link.productId)) {
        byId.set(link.productId, {
          id: link.productId,
          categoryId: "",
          subcategoryId: null,
        });
      }
    }
    return [...byId.values()];
  }, [products, links]);

  const resolvedLinks = useMemo(
    () =>
      buildResolvedProductModifierLinks({
        products: productsForResolve,
        categories,
        categoryLinks,
        productLinks: links,
        exclusions,
      }),
    [productsForResolve, categories, categoryLinks, links, exclusions]
  );

  const previewByProductId = useMemo(
    () => buildModifierPreviewByProductId(resolvedLinks, groups, options, locale),
    [resolvedLinks, groups, options, locale]
  );

  const configByProductId = useMemo(() => {
    const map = new Map<string, ProductBuilderConfig>();
    const productIds = new Set(resolvedLinks.map((link) => link.productId));
    for (const productId of productIds) {
      map.set(
        productId,
        buildProductBuilderConfig({
          productId,
          groups,
          options,
          productGroups: resolvedLinks,
          productOptions: [],
          rules: [],
          suggestions: [],
          inventory: [],
        })
      );
    }
    return map;
  }, [resolvedLinks, groups, options]);

  const value = useMemo(
    () => ({
      previewByProductId,
      configByProductId,
      loading:
        groupsLoading ||
        optionsLoading ||
        linksLoading ||
        categoryLinksLoading ||
        exclusionsLoading ||
        productsLoading ||
        categoriesLoading,
    }),
    [
      previewByProductId,
      configByProductId,
      groupsLoading,
      optionsLoading,
      linksLoading,
      categoryLinksLoading,
      exclusionsLoading,
      productsLoading,
      categoriesLoading,
    ]
  );

  return (
    <CatalogAddonsContext.Provider value={value}>
      {children}
    </CatalogAddonsContext.Provider>
  );
}

export function useProductModifierPreview(productId: string): ModifierPreviewGroup[] {
  const { previewByProductId } = useContext(CatalogAddonsContext);
  return previewByProductId.get(productId) ?? [];
}

export function useProductAddonConfig(productId: string | null): {
  config: ProductBuilderConfig | null;
  loading: boolean;
} {
  const { configByProductId, loading } = useContext(CatalogAddonsContext);
  if (!productId) return { config: null, loading: false };
  return {
    config: configByProductId.get(productId) ?? emptyProductAddonConfig(productId),
    loading,
  };
}
