"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminDialog,
  AdminDialogBody,
  AdminDialogContent,
  AdminDialogFooter,
  AdminDialogHeader,
  AdminDialogTitle,
} from "@/features/admin/components/admin-dialog";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import { normalizeModifierGroupInput } from "@/lib/validation/modifier-normalize";
import type { ModifierGroupInput } from "@/lib/validation/modifier-schemas";
import type { ModifierGroup } from "@/types/modifiers";

export type GroupFormState = {
  nameHe: string;
  nameAr: string;
  nameEn: string;
  selectionType: "single" | "multiple";
  required: boolean;
  minSelections: number;
  maxSelections: number;
  active: boolean;
};

const DEFAULT_FORM: GroupFormState = {
  nameHe: "",
  nameAr: "",
  nameEn: "",
  selectionType: "single",
  required: false,
  minSelections: 0,
  maxSelections: 3,
  active: true,
};

function BigSwitch({
  checked,
  onChange,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-12 w-full items-center justify-between rounded-xl border px-4 transition-colors",
        checked
          ? "border-turquoise/40 bg-turquoise/10 dark:bg-turquoise/20"
          : "border-beige-dark/25 bg-beige/20 dark:border-white/10 dark:bg-white/5"
      )}
    >
      <span className="text-sm font-medium dark:text-warm-white">
        {checked ? labelOn : labelOff}
      </span>
      <span
        className={cn(
          "relative h-7 w-12 rounded-full transition-colors",
          checked ? "bg-turquoise" : "bg-beige-dark/50"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all",
            checked ? "start-5" : "start-0.5"
          )}
        />
      </span>
    </button>
  );
}

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
    <div className="flex items-center gap-3">
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

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ModifierGroup | null;
  sortOrder: number;
  saving: boolean;
  onSave: (payload: ModifierGroupInput) => Promise<boolean>;
}

export function GroupFormDialog({
  open,
  onOpenChange,
  editing,
  sortOrder,
  saving,
  onSave,
}: GroupFormDialogProps) {
  const t = useT();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<GroupFormState>(DEFAULT_FORM);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setForm({
        nameHe: editing.name_he,
        nameAr: editing.name_ar === editing.name_he ? "" : editing.name_ar,
        nameEn: editing.name_en === editing.name_he ? "" : editing.name_en,
        selectionType:
          editing.selectionType === "multiple" ? "multiple" : "single",
        required: editing.requirement === "required",
        minSelections: editing.minSelections,
        maxSelections: editing.maxSelections,
        active: editing.active,
      });
    } else {
      setForm(DEFAULT_FORM);
    }
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [open, editing]);

  const set = <K extends keyof GroupFormState>(key: K, value: GroupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (saving) return;

    if (!form.nameHe.trim()) {
      setError(t("admin.modifiers.nameHeMissing"));
      nameRef.current?.focus();
      return;
    }

    if (form.selectionType === "multiple" && form.maxSelections < form.minSelections) {
      setError(t("admin.modifiers.maxLessThanMin"));
      return;
    }

    setError(null);
    const payload = normalizeModifierGroupInput({
      nameHe: form.nameHe,
      nameAr: form.nameAr,
      nameEn: form.nameEn,
      selectionType: form.selectionType,
      requirement: form.required ? "required" : "optional",
      minSelections: form.minSelections,
      maxSelections: form.maxSelections,
      sortOrder: editing?.sortOrder ?? sortOrder,
      active: form.active,
      archived: false,
      displayType: "buttons",
    });

    const ok = await onSave(payload);
    if (!ok) setError(t("admin.modifiers.saveFailed"));
  };

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange}>
      <AdminDialogContent
        size="lg"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            void handleSubmit();
          }
        }}
      >
        <AdminDialogHeader>
          <AdminDialogTitle className="text-start font-display text-xl">
            {editing ? t("admin.modifiers.editGroup") : t("admin.modifiers.newGroup")}
          </AdminDialogTitle>
        </AdminDialogHeader>

        <AdminDialogBody className="px-6 py-5">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-6"
        >
          <div className="space-y-6">
            {/* Step 1 — Names */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.modifiers.stepBasic")}
              </h3>
              <div>
                <Label htmlFor="nameHe">{t("admin.modifiers.nameHeRequired")}</Label>
                <Input
                  id="nameHe"
                  ref={nameRef}
                  dir="rtl"
                  value={form.nameHe}
                  onChange={(e) => set("nameHe", e.target.value)}
                  className="mt-1 rounded-xl"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t("admin.modifiers.nameArOptional")}</Label>
                  <Input
                    dir="rtl"
                    value={form.nameAr}
                    onChange={(e) => set("nameAr", e.target.value)}
                    className="mt-1 rounded-xl"
                    placeholder={t("admin.modifiers.optionalPlaceholder")}
                  />
                </div>
                <div>
                  <Label>{t("admin.modifiers.nameEnOptional")}</Label>
                  <Input
                    value={form.nameEn}
                    onChange={(e) => set("nameEn", e.target.value)}
                    className="mt-1 rounded-xl"
                    placeholder={t("admin.modifiers.optionalPlaceholder")}
                  />
                </div>
              </div>
            </section>

            {/* Step 2 — Selection type */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.modifiers.stepSelectionType")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {(["single", "multiple"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set("selectionType", type)}
                    className={cn(
                      "rounded-2xl border-2 px-4 py-5 text-center transition-all",
                      form.selectionType === type
                        ? "border-turquoise bg-turquoise/10 shadow-soft dark:bg-turquoise/20"
                        : "border-beige-dark/25 hover:border-turquoise/30 dark:border-white/10"
                    )}
                  >
                    <span className="text-2xl">{type === "single" ? "⭕" : "☑️"}</span>
                    <p className="mt-2 text-sm font-semibold dark:text-warm-white">
                      {type === "single"
                        ? t("admin.modifiers.selectionSingle")
                        : t("admin.modifiers.selectionMultiple")}
                    </p>
                  </button>
                ))}
              </div>
            </section>

            {/* Step 3 — Min/max (multiple only) */}
            {form.selectionType === "multiple" && (
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                  {t("admin.modifiers.stepMinMax")}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("admin.modifiers.minSelect")}</Label>
                    <div className="mt-2">
                      <Stepper
                        value={form.minSelections}
                        onChange={(n) => set("minSelections", n)}
                        min={form.required ? 1 : 0}
                        max={form.maxSelections}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>{t("admin.modifiers.maxSelect")}</Label>
                    <div className="mt-2">
                      <Stepper
                        value={form.maxSelections}
                        onChange={(n) => set("maxSelections", Math.max(n, form.minSelections))}
                        min={1}
                        max={20}
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Step 4 — Required */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.modifiers.stepRequired")}
              </h3>
              <BigSwitch
                checked={form.required}
                onChange={(v) => {
                  set("required", v);
                  if (v && form.minSelections < 1) set("minSelections", 1);
                }}
                labelOn={t("common.yes")}
                labelOff={t("common.no")}
              />
            </section>

            {/* Step 5 — Active */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-coffee/45">
                {t("admin.modifiers.stepStatus")}
              </h3>
              <BigSwitch
                checked={form.active}
                onChange={(v) => set("active", v)}
                labelOn={t("admin.status.active")}
                labelOff={t("admin.status.inactive")}
              />
            </section>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30">
              {error}
            </p>
          )}
        </form>
        </AdminDialogBody>

        <AdminDialogFooter>
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
            onClick={() => void handleSubmit()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("admin.action.save")
            )}
          </Button>
        </AdminDialogFooter>
      </AdminDialogContent>
    </AdminDialog>
  );
}
