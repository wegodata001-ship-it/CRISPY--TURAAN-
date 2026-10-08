"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableList } from "@/components/admin/sortable-list";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import {
  addonGroupDraftHasErrors,
  namedAddonOptions,
  newAddonOptionDraft,
  toModifierGroupInput,
  validateAddonGroupDraft,
  type AddonGroupDraft,
  type AddonGroupFieldErrors,
  type AddonOptionDraft,
} from "@/lib/validation/addon-group-builder";
import { saveModifierGroupWithOptions } from "@/services/modifierService";
import type { ModifierGroup, ModifierOption } from "@/types/modifiers";

function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2" dir="ltr">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums dark:text-warm-white">
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function draftFromExisting(
  group: ModifierGroup | null,
  options: ModifierOption[]
): AddonGroupDraft {
  if (!group) {
    return {
      name: "",
      required: false,
      selectionType: "multiple",
      minSelections: 0,
      maxSelections: 3,
      options: [newAddonOptionDraft()],
    };
  }
  const existing = options
    .filter((option) => option.groupId === group.id && !option.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((option) =>
      newAddonOptionDraft({
        clientId: option.id,
        id: option.id,
        name: option.name_he || option.name_ar || option.name_en,
        priceDelta: option.priceDelta,
      })
    );
  return {
    name: group.name_he || group.name_ar || group.name_en,
    nameAr: group.name_ar !== group.name_he ? group.name_ar : "",
    nameEn: group.name_en !== group.name_he ? group.name_en : "",
    required: group.requirement === "required",
    selectionType: group.selectionType === "single" ? "single" : "multiple",
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    options: existing.length > 0 ? existing : [newAddonOptionDraft()],
  };
}

interface GroupBuilderDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ModifierGroup | null;
  existingOptions: ModifierOption[];
  sortOrder: number;
  onSaved: () => void;
  onError: (message: string) => void;
}

export function GroupBuilderDrawer({
  open,
  onOpenChange,
  editing,
  existingOptions,
  sortOrder,
  onSaved,
  onError,
}: GroupBuilderDrawerProps) {
  const t = useT();
  const nameRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [draft, setDraft] = useState<AddonGroupDraft>(() => draftFromExisting(null, []));
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<AddonGroupFieldErrors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(draftFromExisting(editing, existingOptions));
    setRemovedIds([]);
    setErrors({});
    setTimeout(() => nameRef.current?.focus(), 80);
    // Snapshot options only when the drawer opens or the edited group changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  useEffect(() => {
    if (!open || !editing) return;
    if (existingOptions.length === 0) return;
    setDraft((prev) => {
      if (prev.options.some((option) => option.id)) return prev;
      if (namedAddonOptions(prev.options).length > 0) return prev;
      return draftFromExisting(editing, existingOptions);
    });
  }, [open, editing, existingOptions]);

  const setField = <K extends keyof AddonGroupDraft>(key: K, value: AddonGroupDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateOption = (clientId: string, patch: Partial<AddonOptionDraft>) => {
    setDraft((prev) => ({
      ...prev,
      options: prev.options.map((option) =>
        option.clientId === clientId ? { ...option, ...patch } : option
      ),
    }));
  };

  const addOption = (afterId?: string) => {
    const next = newAddonOptionDraft();
    setDraft((prev) => {
      if (!afterId) return { ...prev, options: [...prev.options, next] };
      const index = prev.options.findIndex((option) => option.clientId === afterId);
      const options = [...prev.options];
      options.splice(index + 1, 0, next);
      return { ...prev, options };
    });
    setTimeout(() => optionRefs.current[next.clientId]?.focus(), 30);
  };

  const removeOption = (option: AddonOptionDraft) => {
    if (option.id) setRemovedIds((prev) => [...prev, option.id!]);
    setDraft((prev) => {
      const options = prev.options.filter((row) => row.clientId !== option.clientId);
      return { ...prev, options: options.length > 0 ? options : [newAddonOptionDraft()] };
    });
  };

  const handleSave = async () => {
    if (saving) return;
    const nextErrors = validateAddonGroupDraft(draft);
    setErrors(nextErrors);
    if (addonGroupDraftHasErrors(nextErrors)) return;

    setSaving(true);
    const payload = toModifierGroupInput(draft, editing?.sortOrder ?? sortOrder);
    const optionDrafts = namedAddonOptions(draft.options).map((option, index) => ({
      id: option.id,
      nameHe: option.name.trim(),
      priceDelta: Number.isFinite(option.priceDelta) ? Math.max(0, option.priceDelta) : 0,
      sortOrder: index,
    }));

    const result = await saveModifierGroupWithOptions(
      editing?.id ?? null,
      payload,
      optionDrafts,
      removedIds
    );
    setSaving(false);

    if (!result.success) {
      onError(result.error);
      return;
    }

    onSaved();
    onOpenChange(false);
  };

  const minFloor = draft.required ? 1 : 0;

  return (
    <AdminModal open={open} onOpenChange={onOpenChange} size="drawer" preventOverlayClose>
      <div className="flex min-h-0 flex-1 flex-col" data-testid="addon-group-builder">
        <AdminModalHeader onClose={() => onOpenChange(false)}>
          <AdminModalTitle className="text-start font-display text-xl">
            {editing ? t("admin.modifiers.editGroup") : t("admin.modifiers.createGroupTitle")}
          </AdminModalTitle>
        </AdminModalHeader>

        <AdminModalBody className="space-y-6">
          <section className="space-y-2">
            <Label htmlFor="addon-group-name">{t("admin.modifiers.groupNameLabel")}</Label>
            <Input
              id="addon-group-name"
              ref={nameRef}
              dir="rtl"
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              className={cn("rounded-xl", errors.name && "border-red-400")}
              autoComplete="off"
            />
            {errors.name && (
              <p className="text-sm text-red-600">{t("admin.modifiers.nameHeMissing")}</p>
            )}
          </section>

          <section className="space-y-3">
            <Label>{t("admin.modifiers.howMany")}</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["single", "multiple"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setField("selectionType", type);
                    if (type === "single") {
                      setField("maxSelections", 1);
                      setField("minSelections", draft.required ? 1 : 0);
                    } else if (draft.maxSelections < 2) {
                      setField("maxSelections", 3);
                    }
                  }}
                  className={cn(
                    "rounded-2xl border-2 px-4 py-4 text-center transition-all",
                    draft.selectionType === type
                      ? "border-turquoise bg-turquoise/10 shadow-soft dark:bg-turquoise/20"
                      : "border-beige-dark/25 hover:border-turquoise/30 dark:border-white/10"
                  )}
                >
                  <p className="text-sm font-semibold dark:text-warm-white">
                    {type === "single"
                      ? t("admin.modifiers.selectionSingle")
                      : t("admin.modifiers.selectionMultiple")}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <Label>{t("admin.modifiers.requiredQuestion")}</Label>
            <button
              type="button"
              role="switch"
              aria-checked={draft.required}
              onClick={() => {
                const next = !draft.required;
                setField("required", next);
                if (next && draft.minSelections < 1) setField("minSelections", 1);
              }}
              className={cn(
                "flex h-12 w-full items-center justify-between rounded-xl border px-4",
                draft.required
                  ? "border-turquoise/40 bg-turquoise/10"
                  : "border-beige-dark/25 bg-beige/20 dark:border-white/10"
              )}
            >
              <span className="text-sm font-medium dark:text-warm-white">
                {draft.required ? t("common.yes") : t("common.no")}
              </span>
              <span
                className={cn(
                  "relative h-7 w-12 rounded-full",
                  draft.required ? "bg-turquoise" : "bg-beige-dark/50"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow",
                    draft.required ? "start-5" : "start-0.5"
                  )}
                />
              </span>
            </button>
            {errors.requiredMin && (
              <p className="text-sm text-red-600">{t("admin.modifiers.requiredMinOne")}</p>
            )}
          </section>

          {draft.selectionType === "multiple" && (
            <section className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("admin.modifiers.minSelect")}</Label>
                <div className="mt-2">
                  <Stepper
                    value={draft.minSelections}
                    onChange={(n) => setField("minSelections", n)}
                    min={minFloor}
                    max={draft.maxSelections}
                  />
                </div>
              </div>
              <div>
                <Label>{t("admin.modifiers.maxSelect")}</Label>
                <div className="mt-2">
                  <Stepper
                    value={draft.maxSelections}
                    onChange={(n) => setField("maxSelections", Math.max(n, draft.minSelections || 1))}
                    min={1}
                    max={20}
                  />
                </div>
              </div>
              {errors.minMax && (
                <p className="col-span-2 text-sm text-red-600">
                  {errors.minMax === "max"
                    ? t("admin.modifiers.maxAtLeastOne")
                    : t("admin.modifiers.maxLessThanMin")}
                </p>
              )}
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>{t("admin.modifiers.options")}</Label>
              <span className="text-xs text-coffee/45" dir="ltr">
                {namedAddonOptions(draft.options).length}
              </span>
            </div>
            {errors.options && (
              <p className="text-sm text-red-600">{t("admin.modifiers.optionsRequired")}</p>
            )}

            <SortableList
              items={draft.options.map((option) => ({ option, id: option.clientId }))}
              onReorder={(items) =>
                setDraft((prev) => ({
                  ...prev,
                  options: items.map((item) => item.option),
                }))
              }
              className="space-y-2"
              renderItem={(item, dragHandle) => {
                const option = item.option;
                return (
                <div
                  data-testid="addon-option-row"
                  className="flex items-center gap-2 rounded-xl border border-beige-dark/20 bg-warm-white p-2 dark:border-white/10 dark:bg-[#1a1412]/60"
                >
                  {dragHandle}
                  <Input
                    ref={(el) => {
                      optionRefs.current[option.clientId] = el;
                    }}
                    dir="rtl"
                    value={option.name}
                    placeholder={t("admin.modifiers.optionName")}
                    onChange={(e) => updateOption(option.clientId, { name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      if (option.name.trim()) addOption(option.clientId);
                    }}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl",
                      errors.optionNames?.[option.clientId] && "border-red-400"
                    )}
                  />
                  <div className="flex w-[7.5rem] shrink-0 items-center gap-1 rounded-xl border border-beige-dark/20 px-2 dark:border-white/10">
                    <span className="text-xs text-coffee/45" dir="ltr">
                      ₪
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      dir="ltr"
                      value={Number.isFinite(option.priceDelta) ? option.priceDelta : 0}
                      onChange={(e) =>
                        updateOption(option.clientId, {
                          priceDelta: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-10 border-0 bg-transparent px-1 text-end tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOption(option)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                    aria-label={t("admin.action.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                );
              }}
            />

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => addOption()}
            >
              <Plus className="h-4 w-4" />
              {t("admin.modifiers.addOption")}
            </Button>
          </section>
        </AdminModalBody>

        <AdminModalFooter className="gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("admin.action.cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1 rounded-xl"
            disabled={saving}
            data-testid="addon-save-group"
            onClick={() => void handleSave()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.modifiers.saveGroup")}
          </Button>
        </AdminModalFooter>
      </div>
    </AdminModal>
  );
}
