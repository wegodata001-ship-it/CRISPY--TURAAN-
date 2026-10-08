"use client";

import { useState } from "react";
import { useT, useLocale } from "@/components/providers/locale-provider";
import {
  useCategoryModifierGroups,
  useModifierGroups,
  useProductAddonExclusions,
} from "@/hooks/useModifiers";
import { setProductAddonExclusion } from "@/services/modifierService";
import { inheritedAddonSourcesForProduct } from "@/lib/product-builder/category-addons";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import type { Category } from "@/types";

interface ProductInheritedAddonsProps {
  productId: string | null;
  categoryId: string;
  subcategoryId?: string | null;
  categories: Category[];
}

export function ProductInheritedAddons({
  productId,
  categoryId,
  subcategoryId,
  categories,
}: ProductInheritedAddonsProps) {
  const t = useT();
  const { locale } = useLocale();
  const { groups } = useModifierGroups();
  const { links } = useCategoryModifierGroups();
  const { exclusions } = useProductAddonExclusions();
  const [pending, setPending] = useState<string | null>(null);

  const sources = inheritedAddonSourcesForProduct({
    product: { categoryId, subcategoryId },
    categories,
    categoryLinks: links,
  });

  if (sources.length === 0) return null;

  const excludedIds = new Set(
    exclusions.filter((item) => item.productId === productId).map((item) => item.groupId)
  );

  const toggleExclude = async (groupId: string, exclude: boolean) => {
    if (!productId || pending) return;
    setPending(groupId);
    try {
      await setProductAddonExclusion(productId, groupId, exclude);
    } finally {
      setPending(null);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-beige-dark/15 bg-cream/60 p-4">
      <div>
        <h3 className="text-sm font-semibold text-dark-brown">
          {t("admin.categoryAddons.inheritedTitle")}
        </h3>
        <p className="mt-1 text-xs text-coffee/55">{t("admin.categoryAddons.inheritedHint")}</p>
      </div>
      <div className="space-y-2">
        {sources.map((source) => {
          const group = groups.find((item) => item.id === source.groupId);
          const category = categories.find((item) => item.id === source.categoryId);
          const excluded = excludedIds.has(source.groupId);
          return (
            <div
              key={source.groupId}
              className="rounded-xl border border-beige-dark/15 bg-warm-white px-3 py-3"
            >
              <p className="font-medium text-dark-brown">
                {group ? getLocalizedName(group, locale) : source.groupId}
              </p>
              <p className="text-xs text-coffee/50">
                {t("admin.categoryAddons.inheritedFrom")}:{" "}
                {category ? getLocalizedName(category, locale) : source.categoryId}
              </p>
              {productId ? (
                <label className="mt-2 flex items-center gap-2 text-sm text-coffee/80">
                  <input
                    type="checkbox"
                    checked={excluded}
                    disabled={pending === source.groupId}
                    onChange={(event) =>
                      void toggleExclude(source.groupId, event.target.checked)
                    }
                    className="rounded accent-crispy-red"
                  />
                  {t("admin.categoryAddons.excludeGroup").replace(
                    "{group}",
                    group ? getLocalizedName(group, locale) : source.groupId
                  )}
                </label>
              ) : (
                <p className="mt-2 text-xs text-coffee/45">
                  {t("admin.productForm.modifiersAfterSave")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
