"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useAllCategories, useProducts } from "@/hooks/useProducts";
import {
  useBusinessRules,
  useModifierGroups,
  useModifierOptions,
} from "@/hooks/useModifiers";
import {
  createBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
} from "@/services/modifierService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import {
  AdminToastStack,
  createToast,
  type AdminToast,
} from "@/features/admin/components/admin-toast";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import type {
  BusinessRule,
  BusinessRuleAction,
  BusinessRuleCondition,
} from "@/types/modifiers";
import type { BusinessRuleInput } from "@/lib/validation/modifier-schemas";
import { cn } from "@/lib/utils";

type SourceType = "product" | "category" | "group" | "option";

const ACTION_LABEL_KEYS: Record<BusinessRuleAction["type"], string> = {
  hide_group: "admin.rules.actionHideGroup",
  hide_option: "admin.rules.actionHideOption",
  show_group: "admin.rules.actionShowGroup",
  show_option: "admin.rules.actionShowOption",
};

function sourceFromCondition(condition: BusinessRuleCondition): SourceType {
  if (condition.type === "product_is") return "product";
  if (condition.type === "category_is") return "category";
  if (condition.type === "group_has_selection") return "group";
  return "option";
}

function emptyRule(priority: number): BusinessRuleInput {
  return {
    name: "",
    enabled: true,
    priority,
    conditions: [{ type: "option_selected", optionId: "" }],
    actions: [{ type: "hide_group", groupId: "" }],
  };
}

export function BusinessRulesAdmin() {
  const t = useT();
  const { dir } = useLocale();
  const { rules, loading } = useBusinessRules();
  const { groups } = useModifierGroups();
  const { options } = useModifierOptions();
  const { products } = useProducts(undefined, { admin: true });
  const { categories } = useAllCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BusinessRule | null>(null);
  const [draft, setDraft] = useState<BusinessRuleInput>(() => emptyRule(0));
  const [source, setSource] = useState<SourceType>("option");
  const [sourceGroupId, setSourceGroupId] = useState("");
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleteRule, setDeleteRule] = useState<BusinessRule | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups]);
  const optionById = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const condition = draft.conditions[0]!;
  const action = draft.actions[0]!;
  const sourceOptions = sourceGroupId
    ? options.filter((option) => option.groupId === sourceGroupId)
    : options;

  const setCondition = (next: BusinessRuleCondition) =>
    setDraft((current) => ({
      ...current,
      conditions: [next, ...current.conditions.slice(1)],
    }));
  const setAction = (next: BusinessRuleAction) =>
    setDraft((current) => ({
      ...current,
      actions: [next, ...current.actions.slice(1)],
    }));

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyRule(rules.length));
    setSource("option");
    setSourceGroupId(groups[0]?.id ?? "");
    setStep(0);
    setOpen(true);
  };

  const openEdit = (rule: BusinessRule) => {
    const firstCondition = rule.conditions[0]!;
    setEditing(rule);
    setDraft({
      name: rule.name,
      enabled: rule.enabled,
      priority: rule.priority,
      conditions: structuredClone(rule.conditions),
      actions: structuredClone(rule.actions),
    });
    setSource(sourceFromCondition(firstCondition));
    setSourceGroupId(
      firstCondition.groupId ??
        optionById.get(firstCondition.optionId ?? "")?.groupId ??
        ""
    );
    setStep(0);
    setOpen(true);
  };

  useEffect(() => {
    if (!open || source !== "option" || sourceGroupId) return;
    setSourceGroupId(groups[0]?.id ?? "");
  }, [groups, open, source, sourceGroupId]);

  const conditionValid =
    draft.name.trim().length > 0 &&
    (condition.type === "product_is"
      ? Boolean(condition.productId)
      : condition.type === "category_is"
        ? Boolean(condition.categoryId)
        : condition.type === "group_has_selection"
          ? Boolean(condition.groupId)
          : Boolean(condition.optionId));
  const actionValid = Boolean(action.type);
  const targetValid = action.type.endsWith("_group")
    ? Boolean(action.groupId)
    : Boolean(action.optionId);

  const saveRule = async () => {
    if (!conditionValid || !actionValid || !targetValid || saving) return;
    setSaving(true);
    try {
      const result = editing
        ? await updateBusinessRule(editing.id, draft)
        : await createBusinessRule(draft);
      if (!result.success) {
        setToasts((current) => [...current, createToast(result.error, "error")]);
        return;
      }
      setOpen(false);
      setToasts((current) => [...current, createToast(t("admin.rules.saved"))]);
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule: BusinessRule) => {
    const result = await updateBusinessRule(rule.id, { enabled: !rule.enabled });
    if (!result.success) {
      setToasts((current) => [...current, createToast(result.error, "error")]);
    }
  };

  const duplicateRule = async (rule: BusinessRule) => {
    const result = await createBusinessRule({
      name: `${rule.name} (${t("admin.action.duplicate")})`,
      enabled: false,
      priority: rule.priority + 1,
      conditions: structuredClone(rule.conditions),
      actions: structuredClone(rule.actions),
    });
    if (!result.success) {
      setToasts((current) => [...current, createToast(result.error, "error")]);
      return;
    }
    setToasts((current) => [...current, createToast(t("admin.rules.saved"))]);
  };

  const conditionText = (ruleCondition: BusinessRuleCondition): string => {
    switch (ruleCondition.type) {
      case "product_is":
        return `${t("admin.rules.sourceProduct")}: ${productById.get(ruleCondition.productId ?? "")?.name_he || "—"}`;
      case "category_is":
        return `${t("admin.rules.sourceCategory")}: ${categoryById.get(ruleCondition.categoryId ?? "")?.name_he || "—"}`;
      case "group_has_selection":
        return `${t("admin.rules.sourceGroup")}: ${groupById.get(ruleCondition.groupId ?? "")?.name_he || "—"}`;
      case "option_not_selected":
        return `${t("admin.rules.optionNotSelected")}: ${optionById.get(ruleCondition.optionId ?? "")?.name_he || "—"}`;
      default:
        return `${optionById.get(ruleCondition.optionId ?? "")?.name_he || "—"} ${t("admin.rules.isSelected")}`;
    }
  };

  const actionText = (ruleAction: BusinessRuleAction): string => {
    const target = ruleAction.groupId
      ? groupById.get(ruleAction.groupId)?.name_he
      : optionById.get(ruleAction.optionId ?? "")?.name_he;
    return `${t(ACTION_LABEL_KEYS[ruleAction.type])} “${target || "—"}”`;
  };

  if (loading) {
    return <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-turquoise" /></div>;
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <AdminPageHeader
        title={t("admin.rules.selectionRulesTitle")}
        subtitle={t("admin.rules.selectionRulesSubtitle")}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />{t("admin.rules.new")}</Button>}
      />

      {rules.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-beige-dark/30 bg-warm-white p-12 text-center">
          <p className="font-semibold">{t("admin.rules.noSelectionRules")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-coffee/55">{t("admin.rules.selectionRulesHint")}</p>
          <Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" />{t("admin.rules.new")}</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className={cn(
                "rounded-2xl border bg-warm-white p-4 shadow-soft",
                rule.enabled ? "border-beige-dark/15" : "border-beige-dark/10 opacity-70"
              )}
            >
              <div className="flex items-start gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-600">
                  <Flame className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-base font-bold leading-tight">{rule.name}</h2>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        rule.enabled
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          rule.enabled ? "bg-emerald-500" : "bg-stone-400"
                        )}
                      />
                      {rule.enabled ? t("admin.status.active") : t("admin.status.disabled")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-coffee/70">
                    <span className="font-semibold text-coffee/90">{t("admin.rules.ifLabel")}:</span>{" "}
                    {rule.conditions.map(conditionText).join(` ${t("admin.rules.andLabel")} `)}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-coffee/70">
                    <span className="font-semibold text-coffee/90">{t("admin.rules.thenLabel")}:</span>{" "}
                    {rule.actions.map(actionText).join(", ")}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-beige-dark/10 pt-2">
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => openEdit(rule)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.action.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => void duplicateRule(rule)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("admin.action.duplicate")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => void toggleRule(rule)}
                >
                  {rule.enabled ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {rule.enabled ? t("admin.rules.disableRule") : t("admin.rules.enableRule")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                  onClick={() => setDeleteRule(rule)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("admin.action.delete")}
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AdminModal open={open} onOpenChange={setOpen} size="md">
        <AdminModalHeader onClose={() => setOpen(false)}>
          <AdminModalTitle>{editing ? t("admin.rules.edit") : t("admin.rules.newSelectionRule")}</AdminModalTitle>
          <p className="text-sm text-coffee/50">{t("admin.rules.stepOf").replace("{step}", String(step + 1)).replace("{count}", "3")}</p>
        </AdminModalHeader>
        <AdminModalBody>
            {step === 0 && (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                  <div><label className="text-sm font-medium">{t("admin.rules.ruleName")}</label><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 h-11" /></div>
                  <div><label className="text-sm font-medium">{t("admin.rules.priority")}</label><Input type="number" min={0} value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} className="mt-1 h-11" /></div>
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold">{t("admin.rules.whenTitle")}</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(["product", "category", "group", "option"] as SourceType[]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setSource(value);
                          if (value === "product") setCondition({ type: "product_is", productId: "" });
                          if (value === "category") setCondition({ type: "category_is", categoryId: "" });
                          if (value === "group") setCondition({ type: "group_has_selection", groupId: "" });
                          if (value === "option") setCondition({ type: "option_selected", optionId: "" });
                        }}
                        className={cn("min-h-12 rounded-xl border-2 px-3 text-start", source === value ? "border-turquoise bg-turquoise/10" : "border-beige-dark/15")}
                      >
                        {t(`admin.rules.source.${value}`)}
                      </button>
                    ))}
                  </div>
                </div>
                {source === "product" && <select value={condition.productId || ""} onChange={(event) => setCondition({ type: "product_is", productId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseProduct")}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name_he || product.name_en}</option>)}</select>}
                {source === "category" && <select value={condition.categoryId || ""} onChange={(event) => setCondition({ type: "category_is", categoryId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseCategory")}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name_he || category.name_en}</option>)}</select>}
                {source === "group" && <select value={condition.groupId || ""} onChange={(event) => setCondition({ type: "group_has_selection", groupId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseGroup")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name_he || group.name_en}</option>)}</select>}
                {source === "option" && <div className="grid gap-3 sm:grid-cols-2">
                  <select value={sourceGroupId} onChange={(event) => { setSourceGroupId(event.target.value); setCondition({ type: condition.type === "option_not_selected" ? "option_not_selected" : "option_selected", optionId: "" }); }} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseGroup")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name_he || group.name_en}</option>)}</select>
                  <select value={condition.optionId || ""} onChange={(event) => setCondition({ type: condition.type === "option_not_selected" ? "option_not_selected" : "option_selected", optionId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseOption")}</option>{sourceOptions.map((option) => <option key={option.id} value={option.id}>{option.name_he || option.name_en}</option>)}</select>
                  <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={condition.type === "option_not_selected"} onChange={(event) => setCondition({ type: event.target.checked ? "option_not_selected" : "option_selected", optionId: condition.optionId })} />{t("admin.rules.whenNotSelected")}</label>
                </div>}
              </div>
            )}

            {step === 1 && (
              <div>
                <h3 className="font-display text-lg font-bold">{t("admin.rules.whatToDoTitle")}</h3>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(["show_group", "hide_group", "show_option", "hide_option"] as BusinessRuleAction["type"][]).map((type) => (
                    <button key={type} type="button" onClick={() => setAction({ type })} className={cn("min-h-14 rounded-xl border-2 px-3 text-start", action.type === type ? "border-turquoise bg-turquoise/10" : "border-beige-dark/15")}>{t(ACTION_LABEL_KEYS[type])}</button>
                  ))}
                  <button type="button" disabled className="min-h-14 rounded-xl border border-dashed px-3 text-start text-coffee/35">{t("admin.rules.makeRequired")} · {t("admin.rules.notSupported")}</button>
                  <button type="button" disabled className="min-h-14 rounded-xl border border-dashed px-3 text-start text-coffee/35">{t("admin.rules.makeOptional")} · {t("admin.rules.notSupported")}</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h3 className="font-display text-lg font-bold">{t("admin.rules.targetTitle")}</h3>
                {action.type.endsWith("_group") ? (
                  <select value={action.groupId || ""} onChange={(event) => setAction({ type: action.type, groupId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseGroup")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name_he || group.name_en}</option>)}</select>
                ) : (
                  <select value={action.optionId || ""} onChange={(event) => setAction({ type: action.type, optionId: event.target.value })} className="h-11 w-full rounded-xl border px-3"><option value="">{t("admin.rules.chooseOption")}</option>{options.map((option) => <option key={option.id} value={option.id}>{groupById.get(option.groupId)?.name_he} — {option.name_he || option.name_en}</option>)}</select>
                )}
                <div className="rounded-2xl bg-beige/25 p-4 text-sm">
                  <p><span className="font-semibold">{t("admin.rules.ifLabel")}:</span> {conditionText(condition)}</p>
                  <p className="mt-2"><span className="font-semibold">{t("admin.rules.thenLabel")}:</span> {actionText(action)}</p>
                </div>
              </div>
            )}
        </AdminModalBody>
        <AdminModalFooter className="justify-between">
          <Button variant="outline" onClick={() => step === 0 ? setOpen(false) : setStep((current) => current - 1)}>{step === 0 ? t("admin.action.cancel") : t("common.back")}</Button>
          {step < 2 ? <Button disabled={(step === 0 && !conditionValid) || (step === 1 && !actionValid)} onClick={() => setStep((current) => current + 1)}>{t("common.continue")}<span aria-hidden>{dir === "rtl" ? "←" : "→"}</span></Button> : <Button disabled={!targetValid || saving} onClick={() => void saveRule()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.rules.saveRule")}</Button>}
        </AdminModalFooter>
      </AdminModal>

      <AdminModal open={Boolean(deleteRule)} onOpenChange={(value) => !value && setDeleteRule(null)} size="sm">
        <AdminModalHeader onClose={() => setDeleteRule(null)}><AdminModalTitle>{t("admin.rules.deleteTitle")}</AdminModalTitle></AdminModalHeader>
        <AdminModalBody>{t("admin.rules.deleteQuestion").replace("{name}", deleteRule?.name || "")}</AdminModalBody>
        <AdminModalFooter><Button variant="outline" onClick={() => setDeleteRule(null)}>{t("admin.action.cancel")}</Button><Button variant="destructive" onClick={async () => { if (!deleteRule) return; const result = await deleteBusinessRule(deleteRule.id); if (!result.success) setToasts((current) => [...current, createToast(result.error, "error")]); setDeleteRule(null); }}>{t("admin.action.delete")}</Button></AdminModalFooter>
      </AdminModal>

      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
