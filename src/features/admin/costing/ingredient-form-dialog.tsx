"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { useT } from "@/components/providers/locale-provider";
import { computeCostPerBaseUnit } from "@/lib/costing/units";
import { formatPrice } from "@/lib/utils";
import {
  COSTING_UNITS,
  INGREDIENT_CATEGORIES,
  type CostingUnit,
  type Ingredient,
  type IngredientCategory,
} from "@/types/costing";
import { useIngredientHistory } from "@/hooks/useCosting";

export interface IngredientDraft {
  name: string;
  category: IngredientCategory;
  purchaseQuantity: number;
  purchaseUnit: CostingUnit;
  purchasePrice: number;
  supplierId: string;
  notes: string;
}

const EMPTY: IngredientDraft = {
  name: "",
  category: "other",
  purchaseQuantity: 1,
  purchaseUnit: "kg",
  purchasePrice: 0,
  supplierId: "",
  notes: "",
};

function formatUnitCost(value: number, unit: CostingUnit, label: string) {
  const digits = value < 1 ? 4 : 2;
  return `${formatPrice(Number(value.toFixed(digits)))} / ${label}`;
}

export function IngredientFormDialog({
  open,
  onOpenChange,
  editing,
  canWrite,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Ingredient | null;
  canWrite: boolean;
  onSave: (draft: IngredientDraft) => Promise<void>;
}) {
  const t = useT();
  const [draft, setDraft] = useState<IngredientDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const history = useIngredientHistory(editing?.id ?? null);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDraft({
        name: editing.name,
        category: editing.category,
        purchaseQuantity: editing.purchaseQuantity,
        purchaseUnit: editing.purchaseUnit,
        purchasePrice: editing.purchasePrice,
        supplierId: editing.supplierId ?? "",
        notes: editing.notes ?? "",
      });
    } else {
      setDraft(EMPTY);
    }
  }, [open, editing]);

  const derived = useMemo(
    () =>
      computeCostPerBaseUnit(draft.purchasePrice, draft.purchaseQuantity, draft.purchaseUnit),
    [draft.purchasePrice, draft.purchaseQuantity, draft.purchaseUnit]
  );

  const submit = async () => {
    if (!canWrite || !draft.name.trim() || draft.purchaseQuantity <= 0) return;
    setSaving(true);
    try {
      await onSave(draft);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="md" title={editing ? t("admin.costing.editIngredient") : t("admin.costing.addIngredient")}>
      <AdminModalHeader onClose={() => onOpenChange(false)}>
        <AdminModalTitle>
          {editing ? t("admin.costing.editIngredient") : t("admin.costing.addIngredient")}
        </AdminModalTitle>
      </AdminModalHeader>
      <AdminModalBody className="space-y-4">
        <div>
          <Label>{t("admin.costing.ingredientName")}</Label>
          <Input
            className="mt-1"
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            disabled={!canWrite}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("admin.costing.category")}</Label>
            <Select
              value={draft.category}
              onValueChange={(value) => setDraft({ ...draft, category: value as IngredientCategory })}
              disabled={!canWrite}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INGREDIENT_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {t(`admin.costing.cat.${category}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("admin.costing.purchaseUnit")}</Label>
            <Select
              value={draft.purchaseUnit}
              onValueChange={(value) => setDraft({ ...draft, purchaseUnit: value as CostingUnit })}
              disabled={!canWrite}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COSTING_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {t(`admin.costing.unit.${unit}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("admin.costing.purchaseQty")}</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={draft.purchaseQuantity}
              onChange={(event) =>
                setDraft({ ...draft, purchaseQuantity: Number(event.target.value) || 0 })
              }
              disabled={!canWrite}
            />
          </div>
          <div>
            <Label>{t("admin.costing.purchasePrice")}</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={draft.purchasePrice}
              onChange={(event) =>
                setDraft({ ...draft, purchasePrice: Number(event.target.value) || 0 })
              }
              disabled={!canWrite}
            />
          </div>
        </div>
        <div className="rounded-xl bg-[#FFF4E2] px-4 py-3 text-sm">
          <p className="font-semibold text-[#171717]">{t("admin.costing.unitCost")}</p>
          <p className="mt-1 tabular-nums text-[#D71920]">
            {derived.baseQuantity} {t(`admin.costing.unit.${derived.baseUnit}`)} ·{" "}
            {formatUnitCost(derived.costPerBaseUnit, derived.baseUnit, t(`admin.costing.unit.${derived.baseUnit}`))}
          </p>
        </div>
        <div>
          <Label>{t("admin.costing.supplier")}</Label>
          <Input
            className="mt-1"
            value={draft.supplierId}
            onChange={(event) => setDraft({ ...draft, supplierId: event.target.value })}
            disabled={!canWrite}
          />
        </div>
        <div>
          <Label>{t("admin.costing.notes")}</Label>
          <Input
            className="mt-1"
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            disabled={!canWrite}
          />
        </div>
        {history.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">{t("admin.costing.history")}</p>
            <ul className="space-y-1 text-xs text-coffee/70">
              {history.slice(0, 8).map((item) => (
                <li key={item.id} className="flex justify-between gap-3 tabular-nums">
                  <span>{new Date(item.date).toLocaleDateString()}</span>
                  <span>
                    {formatPrice(item.oldPrice)} → {formatPrice(item.newPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminModalBody>
      <AdminModalFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          {t("admin.costing.cancel")}
        </Button>
        {canWrite && (
          <Button className="bg-[#D71920] hover:bg-[#B51218]" onClick={() => void submit()} disabled={saving}>
            {t("admin.costing.save")}
          </Button>
        )}
      </AdminModalFooter>
    </AdminModal>
  );
}

export function formatIngredientUnitCost(ingredient: Ingredient, unitLabel: string) {
  const digits = ingredient.costPerBaseUnit < 1 ? 4 : 2;
  return `${Number(ingredient.costPerBaseUnit.toFixed(digits))} ₪ / ${unitLabel}`;
}
