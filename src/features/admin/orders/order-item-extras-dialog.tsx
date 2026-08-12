"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { Button } from "@/components/ui/button";
import { ProductBuilder } from "@/features/catalog/product-builder";
import { useProductBuilderConfig } from "@/hooks/useModifiers";
import { getProductById, updateOrderItemExtras } from "@/services";
import {
  calculateUnitPrice,
  collectKitchenNotes,
  modifiersToSelectionState,
  productHasBuilder,
} from "@/lib/product-builder/engine";
import { useT } from "@/components/providers/locale-provider";
import type { Order, OrderItem } from "@/types";
import type { Product } from "@/types";
import type { SelectedModifier } from "@/types/modifiers";

interface OrderItemExtrasDialogProps {
  order: Order | null;
  itemIndex: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function OrderItemExtrasDialog({
  order,
  itemIndex,
  open,
  onOpenChange,
  onSaved,
}: OrderItemExtrasDialogProps) {
  const t = useT();
  const item: OrderItem | null =
    order && itemIndex != null ? (order.items[itemIndex] ?? null) : null;

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unitPrice, setUnitPrice] = useState(item?.price ?? 0);
  const [valid, setValid] = useState(true);
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [selections, setSelections] = useState<SelectedModifier[]>(item?.modifiers ?? []);

  const { config, loading: loadingConfig } = useProductBuilderConfig(
    open && item ? item.productId : null
  );

  const initialState = useMemo(
    () => modifiersToSelectionState(item?.modifiers ?? []),
    [item?.modifiers]
  );

  useEffect(() => {
    if (!open || !item) {
      setProduct(null);
      return;
    }
    setNotes(item.notes ?? "");
    setUnitPrice(item.price);
    setSelections(item.modifiers ?? []);
    setLoadingProduct(true);
    getProductById(item.productId)
      .then((p) => setProduct(p ?? null))
      .finally(() => setLoadingProduct(false));
  }, [open, item]);

  const hasBuilder = productHasBuilder(config);
  const noGroupsLinked =
    config && config.groups.length === 0 && !loadingConfig && !loadingProduct;

  const handleSave = async () => {
    if (!order || itemIndex == null || !item || !valid) return;
    setSaving(true);
    setError(null);

    const finalSelections = selections;
    const price =
      product && finalSelections.length
        ? calculateUnitPrice(product.price, finalSelections)
        : unitPrice;

    const result = await updateOrderItemExtras(order.id, itemIndex, {
      price,
      modifiers: finalSelections.length ? finalSelections : undefined,
      notes,
      kitchenNotes: collectKitchenNotes(finalSelections),
    });

    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogContent size="sm">
        <AdminDialogHeader>
          <AdminDialogTitle className="text-start">
            {t("admin.orders.editExtras")} — {item?.productName}
          </AdminDialogTitle>
        </AdminDialogHeader>

        <AdminDialogBody>
        {loadingProduct || loadingConfig ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
          </div>
        ) : !product ? (
          <p className="text-sm text-coffee/60">{t("admin.orders.productNotFound")}</p>
        ) : noGroupsLinked ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-coffee/70">{t("admin.orders.noExtrasForProduct")}</p>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/admin/products">{t("admin.orders.linkExtrasInProduct")}</Link>
            </Button>
          </div>
        ) : hasBuilder && config ? (
          <ProductBuilder
            product={product}
            config={config}
            quantity={item?.quantity ?? 1}
            onQuantityChange={() => {}}
            notes={notes}
            onNotesChange={setNotes}
            onUnitPriceChange={setUnitPrice}
            onValidChange={setValid}
            onSelectionsChange={setSelections}
            initialState={initialState}
          />
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-coffee/60">{t("admin.orders.noExtrasGroups")}</p>
            <label className="block text-sm font-medium">{t("builder.notes")}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-xl border border-beige-dark/30 px-3 py-2 text-sm"
            />
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </AdminDialogBody>

        <AdminDialogFooter>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {t("admin.action.cancel")}
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            disabled={saving || !valid || loadingProduct || loadingConfig}
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.action.save")}
          </Button>
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialog>
  );
}
