"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { useT, useLocale } from "@/components/providers/locale-provider";
import { useProducts } from "@/hooks/useProducts";
import {
  linkProductModifierGroup,
  unlinkProductModifierGroup,
  updateProductModifierGroup,
} from "@/services/modifierService";
import type { ModifierGroup, ProductModifierGroup } from "@/types/modifiers";
import type { Product } from "@/types";
import { cn } from "@/lib/utils";

function productName(product: Product, locale: string) {
  if (locale === "ar") return product.name_ar || product.name_he || product.name_en;
  if (locale === "en") return product.name_en || product.name_he || product.name_ar;
  return product.name_he || product.name_ar || product.name_en;
}

interface AssignProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: ModifierGroup | null;
  links: ProductModifierGroup[];
  onSaved: () => void;
  onError: (message: string) => void;
}

export function AssignProductsDialog({
  open,
  onOpenChange,
  group,
  links,
  onSaved,
  onError,
}: AssignProductsDialogProps) {
  const t = useT();
  const { locale } = useLocale();
  const { products, loading } = useProducts(undefined, { admin: true });
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const groupLinks = useMemo(
    () => links.filter((link) => link.groupId === group?.id && link.active),
    [links, group?.id]
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(new Set(groupLinks.map((link) => link.productId)));
  }, [open, groupLinks]);

  const visible = products.filter((product) => {
    const name = productName(product, locale).toLowerCase();
    return !query.trim() || name.includes(query.trim().toLowerCase());
  });

  const toggle = (productId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleSave = async () => {
    if (!group || saving) return;
    setSaving(true);

    const existingByProduct = new Map(
      links.filter((link) => link.groupId === group.id).map((link) => [link.productId, link])
    );

    for (const product of products) {
      const link = existingByProduct.get(product.id);
      const shouldLink = selected.has(product.id);
      if (shouldLink && !link) {
        const result = await linkProductModifierGroup({
          productId: product.id,
          groupId: group.id,
          sortOrder: 0,
          active: true,
        });
        if (!result.success) {
          setSaving(false);
          onError(result.error);
          return;
        }
      } else if (shouldLink && link && !link.active) {
        const result = await updateProductModifierGroup(link.id, { active: true });
        if (!result.success) {
          setSaving(false);
          onError(result.error);
          return;
        }
      } else if (!shouldLink && link) {
        const result = await unlinkProductModifierGroup(link.id);
        if (!result.success) {
          setSaving(false);
          onError(result.error);
          return;
        }
      }
    }

    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="md">
      <div className="flex min-h-0 flex-1 flex-col">
        <AdminModalHeader onClose={() => onOpenChange(false)}>
          <AdminModalTitle>
            {t("admin.modifiers.assignProducts")}
            {group ? ` — ${group.name_he || group.name_ar}` : ""}
          </AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody className="space-y-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("admin.builder.searchProducts")}
            className="rounded-xl"
          />
          {loading ? (
            <p className="text-sm text-coffee/50">{t("admin.builder.loadingProducts")}</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-coffee/50">{t("admin.modifiers.noProducts")}</p>
          ) : (
            <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
              {visible.map((product) => {
                const checked = selected.has(product.id);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => toggle(product.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start",
                        checked
                          ? "border-turquoise/40 bg-turquoise/10"
                          : "border-beige-dark/15 hover:bg-beige/30 dark:border-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-md border text-[11px]",
                          checked
                            ? "border-turquoise bg-turquoise text-white"
                            : "border-beige-dark/40"
                        )}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span className="text-sm font-medium dark:text-warm-white">
                        {productName(product, locale)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminModalBody>
        <AdminModalFooter>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t("admin.action.cancel")}
          </Button>
          <Button type="button" className="rounded-xl" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.action.save")}
          </Button>
        </AdminModalFooter>
      </div>
    </AdminModal>
  );
}
