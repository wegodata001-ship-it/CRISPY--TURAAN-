"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { LocalizedEditor } from "@/features/admin/assistant-manager/localized-editor";
import { ASSISTANT_QUICK_ICONS, resolveAssistantIcon } from "@/lib/icons/assistant-icons";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type {
  AssistantQuickAction,
  LocalizedText,
  QuickActionType,
} from "@/lib/assistant/types";
import type { Category, Product } from "@/types";

const EMPTY_TEXT: LocalizedText = { he: "", ar: "", en: "" };
const NEW_TYPES: QuickActionType[] = ["category", "product", "page", "whatsapp", "question"];

function emptyAction(sortOrder: number): AssistantQuickAction {
  return {
    id: `action-${Date.now()}`,
    icon: "coffee",
    label: { ...EMPTY_TEXT },
    action: "category",
    categoryId: "",
    enabled: true,
    sortOrder,
  };
}

export function QuickActionDialog({
  open,
  initial,
  sortOrder,
  categories,
  products,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  initial: AssistantQuickAction | null;
  sortOrder: number;
  categories: Category[];
  products: Product[];
  onOpenChange: (open: boolean) => void;
  onSave: (action: AssistantQuickAction) => void;
}) {
  const t = useT();
  const { dir } = useLocale();
  const [step, setStep] = useState(0);
  const [action, setAction] = useState<AssistantQuickAction>(() => emptyAction(sortOrder));
  const iconNames = useMemo(() => Object.keys(ASSISTANT_QUICK_ICONS), []);

  useEffect(() => {
    if (!open) return;
    setAction(initial ? structuredClone(initial) : emptyAction(sortOrder));
    setStep(0);
  }, [initial, open, sortOrder]);

  const set = (patch: Partial<AssistantQuickAction>) =>
    setAction((current) => ({ ...current, ...patch }));

  const targetValid =
    action.action === "category"
      ? Boolean(action.categoryId)
      : action.action === "product"
        ? Boolean(action.productId)
        : action.action === "page" || action.action === "whatsapp"
          ? Boolean(action.url?.trim())
          : action.action === "question"
            ? Boolean(action.question?.he.trim())
            : true;

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogContent size="md" className="h-[min(720px,calc(100dvh-24px))] sm:h-[min(720px,min(85dvh,900px))]">
        <AdminDialogHeader>
          <AdminDialogTitle>
            {initial ? t("admin.assistant.editAction") : t("admin.assistant.addAction")}
          </AdminDialogTitle>
          <p className="text-sm text-coffee/50">
            {t("admin.assistant.stepOf")
              .replace("{step}", String(step + 1))
              .replace("{count}", "4")}
          </p>
        </AdminDialogHeader>
        <AdminDialogBody>
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {NEW_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => set({ action: type })}
                  className={cn(
                    "min-h-16 rounded-2xl border-2 px-4 text-start",
                    action.action === type
                      ? "border-turquoise bg-turquoise/10"
                      : "border-beige-dark/20 hover:border-turquoise/35"
                  )}
                >
                  {t(`admin.assistant.actionType.${type}`)}
                </button>
              ))}
              {!NEW_TYPES.includes(action.action) && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                  {t("admin.assistant.legacyAction")}
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-xl space-y-4">
              {action.action === "category" && (
                <div>
                  <label className="text-sm font-medium">{t("admin.assistant.chooseCategory")}</label>
                  <select
                    value={action.categoryId || ""}
                    onChange={(event) => set({ categoryId: event.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3"
                  >
                    <option value="">{t("admin.assistant.chooseCategory")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name_he || category.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {action.action === "product" && (
                <div>
                  <label className="text-sm font-medium">{t("admin.assistant.chooseProduct")}</label>
                  <select
                    value={action.productId || ""}
                    onChange={(event) => set({ productId: event.target.value })}
                    className="mt-1 h-11 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3"
                  >
                    <option value="">{t("admin.assistant.chooseProduct")}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name_he || product.name_en}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(action.action === "page" || action.action === "whatsapp") && (
                <div>
                  <label className="text-sm font-medium">
                    {action.action === "whatsapp"
                      ? t("admin.assistant.whatsappLink")
                      : t("admin.assistant.pageLink")}
                  </label>
                  <Input
                    dir="ltr"
                    value={action.url || ""}
                    onChange={(event) => set({ url: event.target.value })}
                    className="mt-1 h-11"
                    placeholder={action.action === "whatsapp" ? "https://wa.me/..." : "/catalog"}
                  />
                </div>
              )}
              {action.action === "question" && (
                <LocalizedEditor
                  value={action.question || EMPTY_TEXT}
                  onChange={(question) => set({ question })}
                  multiline
                  requiredHe
                />
              )}
              {!NEW_TYPES.includes(action.action) && (
                <p className="rounded-xl bg-beige/30 p-4 text-sm">{t("admin.assistant.legacyTargetPreserved")}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="mx-auto max-w-xl">
              <p className="mb-3 text-sm text-coffee/55">{t("admin.assistant.actionLabelsHint")}</p>
              <LocalizedEditor value={action.label} onChange={(label) => set({ label })} requiredHe />
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {iconNames.map((icon) => {
                const Icon = resolveAssistantIcon({ id: icon, icon });
                return (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => set({ icon })}
                    className={cn(
                      "flex min-h-20 flex-col items-center justify-center gap-2 rounded-2xl border",
                      action.icon === icon
                        ? "border-turquoise bg-turquoise/10 text-turquoise"
                        : "border-beige-dark/20"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px]">{t(`admin.assistant.icon.${icon}`, icon)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </AdminDialogBody>
        <AdminDialogFooter className="justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep((current) => current - 1))}
          >
            {step === 0 ? t("admin.action.cancel") : t("common.back")}
          </Button>
          {step < 3 ? (
            <Button
              disabled={(step === 1 && !targetValid) || (step === 2 && !action.label.he.trim())}
              onClick={() => setStep((current) => current + 1)}
            >
              {t("common.continue")}
              {dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button
              disabled={!action.label.he.trim()}
              onClick={() => {
                onSave(action);
                onOpenChange(false);
              }}
            >
              {initial ? t("admin.action.save") : t("admin.assistant.addAction")}
            </Button>
          )}
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialog>
  );
}
