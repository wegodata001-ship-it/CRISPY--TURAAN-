"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  Camera,
  ChevronDown,
  Loader2,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useModifierOptions } from "@/hooks/useModifiers";
import { getProductModifierOptions, updateModifierOption } from "@/services";
import { uploadModifierOptionImage, deleteImageByUrl } from "@/services/storageService";
import { compressProductImage } from "@/lib/images/compress-image";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import {
  normalizeModifierGroupInput,
  normalizeModifierOptionInput,
} from "@/lib/validation/modifier-normalize";
import type {
  ModifierGroup,
  ModifierOption,
  ProductModifierGroup,
  ProductModifierOption,
} from "@/types/modifiers";
import { MODIFIER_TEMPLATES, type ModifierTemplate } from "./modifier-templates";
import type {
  PendingLinkOverride,
  PendingModifierChanges,
  PendingModifierGroupCreate,
  PendingOptionOverride,
} from "./product-modifier-pending";

function formatPrice(value: number): string {
  if (!value) return "0";
  return value % 1 === 0 ? String(value) : value.toFixed(2);
}

function OptionImageButton({
  option,
  onUpdated,
}: {
  option: ModifierOption;
  onUpdated: () => void;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const compressed = await compressProductImage(file);
    const result = await uploadModifierOptionImage(compressed, option.groupId, option.id);
    if (result.success && result.data) {
      if (option.image) await deleteImageByUrl(option.image).catch(() => {});
      await updateModifierOption(
        option.id,
        normalizeModifierOptionInput({
          groupId: option.groupId,
          nameHe: option.name_he,
          priceDelta: option.priceDelta,
          sortOrder: option.sortOrder,
          imageUrl: result.data,
          active: option.active,
          archived: option.archived,
        })
      );
      onUpdated();
    }
    setUploading(false);
  };

  return (
    <>
      <button
        type="button"
        title={t("admin.productForm.optionImage")}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-beige-dark/25 bg-beige/30 hover:bg-beige/50 dark:border-white/10 dark:bg-white/5",
          uploading && "opacity-60"
        )}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-turquoise" />
        ) : option.image ? (
          <Image src={option.image} alt="" fill className="object-cover" sizes="36px" />
        ) : (
          <Camera className="h-3.5 w-3.5 text-coffee/45" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </>
  );
}

function OptionRow({
  option,
  onDelete,
  onUpdate,
  onPendingChange,
  resetVersion,
}: {
  option: ModifierOption;
  onDelete: () => void;
  onUpdate: () => void;
  onPendingChange: (name: string, price: string) => void;
  resetVersion: number;
}) {
  const [name, setName] = useState(option.name_he);
  const [price, setPrice] = useState(formatPrice(option.priceDelta));

  useEffect(() => {
    setName(option.name_he);
    setPrice(formatPrice(option.priceDelta));
  }, [option.name_he, option.priceDelta, resetVersion]);

  return (
    <div className="flex items-center gap-2 rounded-xl bg-warm-white px-2 py-1.5 dark:bg-[#1a1412]/60">
      <OptionImageButton option={option} onUpdated={onUpdate} />
      <Input
        dir="rtl"
        value={name}
        onChange={(e) => {
          const next = e.target.value;
          setName(next);
          onPendingChange(next, price);
        }}
        className="h-10 min-w-0 flex-1 rounded-lg border-0 bg-transparent px-2 text-sm shadow-none focus-visible:ring-1"
      />
      <div className="flex w-[88px] shrink-0 items-center gap-0.5 text-sm text-coffee/60">
        <span>+</span>
        <Input
          type="number"
          min={0}
          step="0.5"
          value={price}
          onChange={(e) => {
            const next = e.target.value;
            setPrice(next);
            onPendingChange(name, next);
          }}
          className="h-10 w-full rounded-lg border-beige-dark/20 px-2 text-sm"
        />
        <span className="shrink-0 text-xs">₪</span>
      </div>
      <button
        type="button"
        onClick={onDelete}
        className="rounded-lg p-2 text-coffee/35 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
        aria-label="Delete"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function NewOptionInput({
  groupId,
  sortOrder,
  onStage,
  onDraftChange,
  autoFocus,
  resetVersion,
}: {
  groupId: string;
  sortOrder: number;
  onStage: (key: string, name: string, price: string) => void;
  onDraftChange: (name: string, price: string) => void;
  autoFocus?: boolean;
  resetVersion: number;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    setName("");
    setPrice("");
  }, [resetVersion]);

  const addOption = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onStage(`${groupId}:${Date.now()}`, trimmed, price);
    setName("");
    setPrice("");
    onDraftChange("", "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-beige-dark/30">
          <Plus className="h-3.5 w-3.5 text-coffee/30" />
        </div>
        <Input
          ref={inputRef}
          dir="rtl"
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => {
            const next = e.target.value;
            setName(next);
            onDraftChange(next, price);
          }}
          placeholder={t("admin.productForm.addOptionPlaceholder")}
          className="h-10 flex-1 rounded-lg text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
        />
        <div className="flex w-[88px] shrink-0 items-center gap-0.5 text-sm text-coffee/60">
          <span>+</span>
          <Input
            type="number"
            min={0}
            step="0.5"
            value={price}
            onChange={(e) => {
              const next = e.target.value;
              setPrice(next);
              onDraftChange(name, next);
            }}
            placeholder="0"
            className="h-10 w-full rounded-lg border-beige-dark/20 px-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addOption();
              }
            }}
          />
          <span className="shrink-0 text-xs">₪</span>
        </div>
      </div>
    </div>
  );
}

function ModifierGroupCard({
  group,
  linkActive,
  linkRequirement,
  linkSelectionType,
  optionActiveById,
  dragHandle,
  onUnlink,
  onGroupChange,
  onPendingGroupChange,
  onLinkOverride,
  onOptionOverride,
  onPendingOptionChange,
  onStageOption,
  onDraftOptionChange,
  onDeleteOption,
  defaultFocusOptions,
  resetVersion,
}: {
  group: ModifierGroup;
  linkActive: boolean;
  linkRequirement: "required" | "optional";
  linkSelectionType: "single" | "multiple";
  optionActiveById: Map<string, boolean>;
  dragHandle?: React.ReactNode;
  onUnlink: () => void;
  onGroupChange: () => void;
  onPendingGroupChange: (
    group: ModifierGroup,
    settings: {
      name: string;
      selectionType: "single" | "multiple";
      requirement: "required" | "optional";
      minSelections: number;
      maxSelections: number;
    }
  ) => void;
  onLinkOverride: (override: PendingLinkOverride) => void;
  onOptionOverride: (override: PendingOptionOverride) => void;
  onPendingOptionChange: (
    option: ModifierOption,
    name: string,
    price: string,
    sortOrder?: number
  ) => void;
  onStageOption: (
    groupId: string,
    key: string,
    name: string,
    price: string,
    sortOrder: number
  ) => void;
  onDraftOptionChange: (
    groupId: string,
    name: string,
    price: string,
    sortOrder: number
  ) => void;
  onDeleteOption: (option: ModifierOption) => void;
  defaultFocusOptions?: boolean;
  resetVersion: number;
}) {
  const t = useT();
  const { options, loading } = useModifierOptions(group.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectionType, setSelectionType] = useState<"single" | "multiple">(
    linkSelectionType
  );
  const [groupName, setGroupName] = useState(group.name_he);
  const [requirement, setRequirement] = useState<"required" | "optional">(
    linkRequirement
  );
  const [activeOnProduct, setActiveOnProduct] = useState(linkActive);
  const [minSelections, setMinSelections] = useState(group.minSelections);
  const [maxSelections, setMaxSelections] = useState(group.maxSelections);
  const [orderedOptions, setOrderedOptions] = useState<ModifierOption[]>(options);
  const [hiddenOptionIds, setHiddenOptionIds] = useState<Set<string>>(new Set());
  const [stagedOptions, setStagedOptions] = useState<
    { key: string; name: string; price: string }[]
  >([]);

  useEffect(() => {
    setSelectionType(linkSelectionType);
    setGroupName(group.name_he);
    setRequirement(linkRequirement);
    setActiveOnProduct(linkActive);
    setMinSelections(group.minSelections);
    setMaxSelections(group.maxSelections);
    setOrderedOptions(options);
    setHiddenOptionIds(new Set());
    setStagedOptions([]);
  }, [
    linkActive,
    linkRequirement,
    linkSelectionType,
    group.name_he,
    group.minSelections,
    group.maxSelections,
    options,
    resetVersion,
  ]);

  const selectionLabel =
    selectionType === "multiple"
      ? t("admin.productForm.selectionMultipleShort")
      : t("admin.productForm.selectionSingleShort");
  const requiredLabel =
    requirement === "required"
      ? t("admin.productForm.requiredShort")
      : t("admin.productForm.optionalShort");

  const emitGlobalNameOrLimits = (
    nextName: string,
    nextMin: number,
    nextMax: number
  ) => {
    onPendingGroupChange(group, {
      name: nextName,
      selectionType: group.selectionType === "multiple" ? "multiple" : "single",
      requirement: group.requirement,
      minSelections: nextMin,
      maxSelections: nextMax,
    });
  };

  const emitLinkOverride = (
    patch: Partial<{
      selectionType: "single" | "multiple";
      requirement: "required" | "optional";
      active: boolean;
    }>
  ) => {
    const nextSelection = patch.selectionType ?? selectionType;
    const nextRequirement = patch.requirement ?? requirement;
    const nextActive = patch.active ?? activeOnProduct;
    setSelectionType(nextSelection);
    setRequirement(nextRequirement);
    setActiveOnProduct(nextActive);
    if (nextSelection === "single") {
      setMinSelections(0);
      setMaxSelections(1);
    }
    onLinkOverride({
      groupId: group.id,
      active: nextActive,
      selectionType: nextSelection,
      requirement: nextRequirement,
    });
  };

  const handleReorderOptions = (reordered: ModifierOption[]) => {
    setOrderedOptions(reordered);
    reordered.forEach((option, index) => {
      onPendingOptionChange(
        option,
        option.name_he,
        formatPrice(option.priceDelta),
        index + 1
      );
    });
  };

  const handleDeleteOption = (option: ModifierOption) => {
    if (!confirm(t("admin.modifiers.deleteOptionConfirm"))) return;
    setHiddenOptionIds((previous) => new Set(previous).add(option.id));
    onDeleteOption(option);
  };

  const visibleOptions = orderedOptions.filter(
    (option) => !hiddenOptionIds.has(option.id) && !option.archived
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-beige-dark/20 bg-cream/20 dark:border-white/10 dark:bg-white/[0.03]",
        !activeOnProduct && "opacity-70"
      )}
    >
      <div className="flex items-start gap-2 border-b border-beige-dark/15 px-3 py-3 sm:px-4">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Input
                dir="rtl"
                value={groupName}
                onChange={(event) => {
                  const next = event.target.value;
                  setGroupName(next);
                  emitGlobalNameOrLimits(next, minSelections, maxSelections);
                }}
                className="h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-1 dark:text-warm-white"
              />
              <p className="mt-0.5 text-xs text-coffee/45">
                {selectionLabel} • {requiredLabel}
                {!activeOnProduct ? ` • ${t("admin.productForm.hiddenOnProduct")}` : ""}
              </p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="rounded-lg p-2 text-coffee/40 hover:bg-beige/40"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden
                  />
                  <div className="absolute end-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-beige-dark/20 bg-warm-white py-1 shadow-soft dark:border-white/10 dark:bg-[#1a1412]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => {
                        setMenuOpen(false);
                        onUnlink();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t("admin.productForm.unlinkGroup")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-3 py-4 sm:px-4">
        <div className="space-y-2">
          <p className="text-xs font-medium text-coffee/55">{t("admin.productForm.selectionTypeLabel")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`selection-${group.id}`}
                checked={selectionType !== "multiple"}
                onChange={() => emitLinkOverride({ selectionType: "single" })}
                className="accent-coffee"
              />
              {t("admin.productForm.selectionSingleShort")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={`selection-${group.id}`}
                checked={selectionType === "multiple"}
                onChange={() => emitLinkOverride({ selectionType: "multiple" })}
                className="accent-coffee"
              />
              {t("admin.productForm.selectionMultipleShort")}
            </label>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requirement === "required"}
              onChange={(e) =>
                emitLinkOverride({
                  requirement: e.target.checked ? "required" : "optional",
                })
              }
              className="rounded accent-coffee"
            />
            {t("admin.productForm.requiredCheckbox")}
          </label>
          {selectionType === "multiple" && (
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-xs text-coffee/55">
                <span>Min</span>
                <Input
                  type="number"
                  min={0}
                  value={minSelections}
                  onChange={(event) => {
                    const nextMin = Math.max(0, Number(event.target.value) || 0);
                    setMinSelections(nextMin);
                    emitGlobalNameOrLimits(groupName, nextMin, maxSelections);
                  }}
                  className="h-9"
                />
              </label>
              <label className="space-y-1 text-xs text-coffee/55">
                <span>Max</span>
                <Input
                  type="number"
                  min={1}
                  value={maxSelections}
                  onChange={(event) => {
                    const nextMax = Math.max(1, Number(event.target.value) || 1);
                    setMaxSelections(nextMax);
                    emitGlobalNameOrLimits(groupName, minSelections, nextMax);
                  }}
                  className="h-9"
                />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-beige-dark/15 bg-beige/15 p-3 dark:border-white/10 dark:bg-white/[0.04]">
          <div>
            <p className="text-xs font-medium text-coffee/70">
              {t("admin.productForm.productAdaptation")}
            </p>
            <p className="mt-0.5 text-[11px] text-coffee/45">
              {t("admin.productForm.productOverrideHint")}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!activeOnProduct}
              onChange={(e) => emitLinkOverride({ active: !e.target.checked })}
              className="rounded accent-coffee"
            />
            {t("admin.productForm.hideGroupOnProduct")}
          </label>
          {visibleOptions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-coffee/55">
                {t("admin.productForm.optionVisibleOnProduct")}
              </p>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {visibleOptions.map((option) => {
                  const visible = optionActiveById.get(option.id) ?? true;
                  return (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-warm-white/70 px-2 py-1.5 text-sm dark:bg-white/5"
                      dir="rtl"
                    >
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(e) =>
                          onOptionOverride({
                            optionId: option.id,
                            groupId: group.id,
                            active: e.target.checked,
                          })
                        }
                        className="rounded accent-coffee"
                      />
                      <span className={cn(!visible && "text-coffee/40 line-through")}>
                        {option.name_he}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="hidden grid-cols-[1fr_88px_36px] gap-2 px-2 text-xs text-coffee/45 sm:grid">
            <span>{t("admin.productForm.optionName")}</span>
            <span>{t("admin.productForm.priceExtra")}</span>
            <span />
          </div>

          {loading ? (
            <p className="text-xs text-coffee/45">{t("admin.modifiers.loadingOptions")}</p>
          ) : visibleOptions.length > 0 ? (
            <SortableList
              items={visibleOptions}
              onReorder={handleReorderOptions}
              className="space-y-1.5"
              renderItem={(opt, handle) => (
                <div className="flex items-center gap-1">
                  {handle}
                  <div className="min-w-0 flex-1">
                    <OptionRow
                      option={opt}
                      onDelete={() => handleDeleteOption(opt)}
                      onUpdate={onGroupChange}
                      onPendingChange={(name, price) =>
                        onPendingOptionChange(opt, name, price)
                      }
                      resetVersion={resetVersion}
                    />
                  </div>
                </div>
              )}
            />
          ) : null}

          {stagedOptions.map((option) => (
            <div
              key={option.key}
              className="flex items-center justify-between rounded-xl bg-warm-white px-3 py-2 text-sm dark:bg-[#1a1412]/60"
              dir="rtl"
            >
              <span>{option.name}</span>
              <span className="text-xs text-coffee/45">
                +{formatPrice(parseFloat(option.price) || 0)} ₪
              </span>
            </div>
          ))}

          <NewOptionInput
            groupId={group.id}
            sortOrder={orderedOptions.length + stagedOptions.length + 1}
            onStage={(key, name, price) => {
              setStagedOptions((previous) => [
                ...previous,
                { key, name, price },
              ]);
              onStageOption(
                group.id,
                key,
                name,
                price,
                orderedOptions.length + stagedOptions.length + 1
              );
            }}
            onDraftChange={(name, price) =>
              onDraftOptionChange(
                group.id,
                name,
                price,
                orderedOptions.length + stagedOptions.length + 1
              )
            }
            autoFocus={defaultFocusOptions}
            resetVersion={resetVersion}
          />
        </div>
      </div>
    </div>
  );
}

function NewGroupCard({
  draftKey,
  onDraftChange,
  onReady,
  onCancel,
  initialTemplate,
}: {
  draftKey: string;
  onDraftChange: (draft: PendingModifierGroupCreate | null) => void;
  onReady: () => void;
  onCancel: () => void;
  initialTemplate?: ModifierTemplate | null;
}) {
  const t = useT();
  const nameRef = useRef<HTMLInputElement>(null);
  const optionRef = useRef<HTMLInputElement>(null);
  const [groupName, setGroupName] = useState(initialTemplate?.nameHe ?? "");
  const [selectionType, setSelectionType] = useState<"single" | "multiple">(
    initialTemplate?.selectionType ?? "single"
  );
  const [required, setRequired] = useState(initialTemplate?.required ?? false);
  const [pendingOptions, setPendingOptions] = useState<{ nameHe: string; priceDelta: number }[]>(
    initialTemplate?.options.map((o) => ({ nameHe: o.nameHe, priceDelta: o.priceDelta ?? 0 })) ?? []
  );
  const [optionName, setOptionName] = useState("");
  const [optionPrice, setOptionPrice] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const emitDraft = useCallback(
    (
      next: Partial<{
        groupName: string;
        selectionType: "single" | "multiple";
        required: boolean;
        pendingOptions: { nameHe: string; priceDelta: number }[];
        optionName: string;
        optionPrice: string;
      }> = {}
    ) => {
      const nextGroupName = next.groupName ?? groupName;
      const nextSelectionType = next.selectionType ?? selectionType;
      const nextRequired = next.required ?? required;
      const nextPendingOptions = next.pendingOptions ?? pendingOptions;
      const nextOptionName = next.optionName ?? optionName;
      const nextOptionPrice = next.optionPrice ?? optionPrice;
      const currentOption = nextOptionName.trim()
        ? [
            {
              nameHe: nextOptionName.trim(),
              priceDelta: parseFloat(nextOptionPrice) || 0,
            },
          ]
        : [];
      const allOptions = [...nextPendingOptions, ...currentOption];

      if (!nextGroupName.trim() && allOptions.length === 0) {
        onDraftChange(null);
        return;
      }

      onDraftChange({
        key: draftKey,
        data: normalizeModifierGroupInput({
          nameHe: nextGroupName,
          selectionType: nextSelectionType,
          requirement: nextRequired ? "required" : "optional",
          minSelections: 0,
          maxSelections: nextSelectionType === "multiple" ? 10 : 1,
          sortOrder: Date.now(),
          active: true,
          archived: false,
          displayType: "buttons",
        }),
        options: allOptions.map((option, index) =>
          normalizeModifierOptionInput({
            groupId: "__pending_group__",
            nameHe: option.nameHe,
            priceDelta: option.priceDelta,
            sortOrder: index + 1,
            active: true,
            archived: false,
          })
        ),
      });
    },
    [
      draftKey,
      groupName,
      onDraftChange,
      optionName,
      optionPrice,
      pendingOptions,
      required,
      selectionType,
    ]
  );

  useEffect(() => {
    emitDraft();
  }, [emitDraft]);

  const handleAddOptionEnter = () => {
    const trimmed = optionName.trim();
    if (!trimmed) return;

    const priceDelta = parseFloat(optionPrice) || 0;
    const nextOptions = [...pendingOptions, { nameHe: trimmed, priceDelta }];
    setPendingOptions(nextOptions);
    setOptionName("");
    setOptionPrice("");
    emitDraft({
      pendingOptions: nextOptions,
      optionName: "",
      optionPrice: "",
    });
    optionRef.current?.focus();
  };

  const handleDone = () => {
    if (!groupName.trim()) {
      setNameError(t("admin.productForm.groupNameRequired"));
      nameRef.current?.focus();
      return;
    }
    emitDraft();
    onReady();
  };

  return (
    <div className="rounded-2xl border-2 border-turquoise/30 bg-turquoise/5 p-4 dark:bg-turquoise/10">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-dark-brown dark:text-warm-white">
          {t("admin.productForm.newGroupCardTitle")}
        </h4>
        <button
          type="button"
          onClick={() => {
            onDraftChange(null);
            onCancel();
          }}
          className="rounded-lg p-1.5 hover:bg-beige/40"
        >
          <X className="h-4 w-4 text-coffee/45" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">{t("admin.productForm.groupNameLabel")}</Label>
          <Input
            ref={nameRef}
            dir="rtl"
            value={groupName}
            onChange={(e) => {
              const next = e.target.value;
              setGroupName(next);
              setNameError(null);
              emitDraft({ groupName: next });
            }}
            placeholder={t("admin.productForm.groupNamePlaceholder")}
            className={cn("mt-1 h-11 rounded-xl", nameError && "border-red-400 ring-1 ring-red-400")}
          />
          {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-coffee/55">{t("admin.productForm.selectionTypeLabel")}</p>
          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={selectionType === "single"}
                onChange={() => {
                  setSelectionType("single");
                  emitDraft({ selectionType: "single" });
                }}
                className="accent-coffee"
              />
              {t("admin.productForm.selectionSingleShort")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={selectionType === "multiple"}
                onChange={() => {
                  setSelectionType("multiple");
                  emitDraft({ selectionType: "multiple" });
                }}
                className="accent-coffee"
              />
              {t("admin.productForm.selectionMultipleShort")}
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => {
                setRequired(e.target.checked);
                emitDraft({ required: e.target.checked });
              }}
              className="rounded accent-coffee"
            />
            {t("admin.productForm.requiredCheckbox")}
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-coffee/55">{t("admin.productForm.optionsLabel")}</p>

          {pendingOptions.length > 0 && (
            <ul className="space-y-1">
              {pendingOptions.map((opt, i) => (
                <li
                  key={`${opt.nameHe}-${i}`}
                  className="flex items-center justify-between rounded-lg bg-warm-white/80 px-3 py-2 text-sm dark:bg-white/5"
                  dir="rtl"
                >
                  <span>{opt.nameHe}</span>
                  <span className="text-xs text-coffee/45">+{formatPrice(opt.priceDelta)} ₪</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <Input
              ref={optionRef}
              dir="rtl"
              value={optionName}
              onChange={(e) => {
                const next = e.target.value;
                setOptionName(next);
                emitDraft({ optionName: next });
              }}
              placeholder={t("admin.productForm.addOptionPlaceholder")}
              className="h-11 flex-1 rounded-xl text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddOptionEnter();
                }
              }}
            />
            <div className="flex w-[88px] shrink-0 items-center gap-0.5 text-sm">
              <span className="text-coffee/50">+</span>
              <Input
                type="number"
                min={0}
                step="0.5"
                value={optionPrice}
                onChange={(e) => {
                  const next = e.target.value;
                  setOptionPrice(next);
                  emitDraft({ optionPrice: next });
                }}
                placeholder="0"
                className="h-11 rounded-xl px-2 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOptionEnter();
                  }
                }}
              />
              <span className="text-xs text-coffee/50">₪</span>
            </div>
          </div>
          <p className="text-xs text-coffee/40">{t("admin.productForm.pressEnterHint")}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="h-11 flex-1 rounded-xl sm:flex-none"
            onClick={handleDone}
          >
            {t("admin.productForm.finishGroup")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ProductModifiersPanelProps {
  productId: string | null;
  allGroups: ModifierGroup[];
  linkedGroupIds: string[];
  onLinkedChange: (ids: string[]) => void;
  existingLinks?: ProductModifierGroup[];
  onDirty?: () => void;
}

export interface ProductModifiersPanelHandle {
  collectPendingChanges: () => PendingModifierChanges;
  markSaved: () => void;
}

export const ProductModifiersPanel = forwardRef<
  ProductModifiersPanelHandle,
  ProductModifiersPanelProps
>(function ProductModifiersPanel(
  {
    productId,
    allGroups,
    linkedGroupIds,
    onLinkedChange,
    existingLinks = [],
    onDirty,
  },
  ref
) {
  const t = useT();
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [templateSeed, setTemplateSeed] = useState<ModifierTemplate | null>(null);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const [extraGroups, setExtraGroups] = useState<ModifierGroup[]>([]);
  const [showExisting, setShowExisting] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [overrideTick, setOverrideTick] = useState(0);
  const [loadedOptionOverrides, setLoadedOptionOverrides] = useState<
    ProductModifierOption[]
  >([]);
  const newGroupDraftKey = useRef(`group:${Date.now()}`);
  const pendingGroupUpdates = useRef(
    new Map<string, PendingModifierChanges["groupUpdates"][number]>()
  );
  const pendingOptionUpdates = useRef(
    new Map<string, PendingModifierChanges["optionUpdates"][number]>()
  );
  const pendingOptionCreates = useRef(
    new Map<string, PendingModifierChanges["optionCreates"][number]>()
  );
  const pendingGroupCreates = useRef(
    new Map<string, PendingModifierGroupCreate>()
  );
  const pendingLinkOverrides = useRef(new Map<string, PendingLinkOverride>());
  const pendingOptionOverrides = useRef(new Map<string, PendingOptionOverride>());

  const mergedGroups = useMemo(() => {
    const byId = new Map(allGroups.map((g) => [g.id, g]));
    for (const g of extraGroups) byId.set(g.id, g);
    return [...byId.values()];
  }, [allGroups, extraGroups]);

  const linkedGroups = linkedGroupIds
    .map((id) => mergedGroups.find((g) => g.id === id))
    .filter(Boolean) as ModifierGroup[];

  const assignableGroups = useMemo(
    () => mergedGroups.filter((g) => !g.archived),
    [mergedGroups]
  );

  const unlinkedGroups = mergedGroups.filter(
    (g) => !linkedGroupIds.includes(g.id) && !g.archived
  );

  const markDirty = useCallback(() => onDirty?.(), [onDirty]);

  useEffect(() => {
    pendingLinkOverrides.current.clear();
    pendingOptionOverrides.current.clear();
    setOverrideTick((value) => value + 1);

    if (!productId) {
      setLoadedOptionOverrides([]);
      return;
    }

    let cancelled = false;
    void getProductModifierOptions(productId).then((options) => {
      if (!cancelled) setLoadedOptionOverrides(options);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const optionActiveById = useMemo(() => {
    void overrideTick;
    const map = new Map<string, boolean>();
    for (const option of loadedOptionOverrides) {
      map.set(option.optionId, option.active);
    }
    for (const override of pendingOptionOverrides.current.values()) {
      map.set(override.optionId, override.active);
    }
    return map;
  }, [loadedOptionOverrides, overrideTick]);

  const getLinkSettings = useCallback(
    (group: ModifierGroup) => {
      void overrideTick;
      const pending = pendingLinkOverrides.current.get(group.id);
      const existing = existingLinks.find((link) => link.groupId === group.id);
      const rawSelection =
        pending?.selectionType ??
        existing?.selectionType ??
        group.selectionType;
      const selectionType: "single" | "multiple" =
        rawSelection === "multiple" ? "multiple" : "single";
      const requirement =
        pending?.requirement ?? existing?.requirement ?? group.requirement;
      const active = pending?.active ?? existing?.active ?? true;
      return { selectionType, requirement, active };
    },
    [existingLinks, overrideTick]
  );

  useImperativeHandle(
    ref,
    () => ({
      collectPendingChanges: () => ({
        groupUpdates: [...pendingGroupUpdates.current.values()],
        optionUpdates: [...pendingOptionUpdates.current.values()],
        optionCreates: [...pendingOptionCreates.current.values()],
        groupCreates: [...pendingGroupCreates.current.values()],
        linkOverrides: [...pendingLinkOverrides.current.values()],
        optionOverrides: [...pendingOptionOverrides.current.values()],
      }),
      markSaved: () => {
        const savedOptionOverrides = [...pendingOptionOverrides.current.values()];
        if (savedOptionOverrides.length > 0) {
          setLoadedOptionOverrides((previous) => {
            const byOptionId = new Map(
              previous.map((item) => [item.optionId, item])
            );
            for (const override of savedOptionOverrides) {
              const existing = byOptionId.get(override.optionId);
              byOptionId.set(override.optionId, {
                id: existing?.id ?? `${productId}_${override.optionId}`,
                productId: productId ?? existing?.productId ?? "",
                optionId: override.optionId,
                active: override.active,
                priceDeltaOverride:
                  override.priceDeltaOverride ?? existing?.priceDeltaOverride,
                sortOrderOverride:
                  override.sortOrderOverride ?? existing?.sortOrderOverride,
              });
            }
            return [...byOptionId.values()];
          });
        }
        pendingGroupUpdates.current.clear();
        pendingOptionUpdates.current.clear();
        pendingOptionCreates.current.clear();
        pendingGroupCreates.current.clear();
        pendingLinkOverrides.current.clear();
        pendingOptionOverrides.current.clear();
        setShowNewGroup(false);
        setTemplateSeed(null);
        setOverrideTick((value) => value + 1);
        setResetVersion((version) => version + 1);
        newGroupDraftKey.current = `group:${Date.now()}`;
        if (productId) {
          void getProductModifierOptions(productId).then(setLoadedOptionOverrides);
        }
      },
    }),
    [productId]
  );

  const handlePendingGroupChange = useCallback(
    (
      group: ModifierGroup,
      settings: {
        name: string;
        selectionType: "single" | "multiple";
        requirement: "required" | "optional";
        minSelections: number;
        maxSelections: number;
      }
    ) => {
      const data = normalizeModifierGroupInput({
        nameHe: settings.name,
        nameAr: group.name_ar,
        nameEn: group.name_en,
        selectionType: settings.selectionType,
        requirement: settings.requirement,
        minSelections: settings.minSelections,
        maxSelections: settings.maxSelections,
        displayType: group.displayType,
        sortOrder: group.sortOrder,
        color: group.color,
        icon: group.icon,
        active: group.active,
        archived: group.archived,
      });

      if (
        settings.name.trim() === group.name_he &&
        settings.selectionType === group.selectionType &&
        settings.requirement === group.requirement &&
        settings.minSelections === group.minSelections &&
        settings.maxSelections === group.maxSelections
      ) {
        pendingGroupUpdates.current.delete(group.id);
      } else {
        pendingGroupUpdates.current.set(group.id, { id: group.id, data });
      }
      markDirty();
    },
    [markDirty]
  );

  const handlePendingOptionChange = useCallback(
    (
      option: ModifierOption,
      name: string,
      price: string,
      sortOrder?: number
    ) => {
      const previous = pendingOptionUpdates.current.get(option.id)?.data;
      const data = normalizeModifierOptionInput({
        groupId: option.groupId,
        nameHe: sortOrder === undefined ? name : previous?.nameHe ?? name,
        nameAr: previous?.nameAr ?? option.name_ar,
        nameEn: previous?.nameEn ?? option.name_en,
        priceDelta:
          sortOrder === undefined
            ? parseFloat(price) || 0
            : previous?.priceDelta ?? (parseFloat(price) || 0),
        cost: option.cost,
        sortOrder: sortOrder ?? previous?.sortOrder ?? option.sortOrder,
        color: option.color,
        icon: option.icon,
        imageUrl: option.image,
        kitchenNote: option.kitchenNote,
        active: previous?.active ?? option.active,
        archived: previous?.archived ?? option.archived,
      });

      if (
        data.nameHe === option.name_he &&
        data.priceDelta === option.priceDelta &&
        data.sortOrder === option.sortOrder &&
        data.active === option.active &&
        data.archived === option.archived
      ) {
        pendingOptionUpdates.current.delete(option.id);
      } else {
        pendingOptionUpdates.current.set(option.id, { id: option.id, data });
      }
      markDirty();
    },
    [markDirty]
  );

  const stageOption = useCallback(
    (
      groupId: string,
      key: string,
      name: string,
      price: string,
      sortOrder: number
    ) => {
      pendingOptionCreates.current.delete(`draft:${groupId}`);
      pendingOptionCreates.current.set(key, {
        key,
        data: normalizeModifierOptionInput({
          groupId,
          nameHe: name,
          priceDelta: parseFloat(price) || 0,
          sortOrder,
          active: true,
          archived: false,
        }),
      });
      markDirty();
    },
    [markDirty]
  );

  const updateOptionDraft = useCallback(
    (groupId: string, name: string, price: string, sortOrder: number) => {
      const key = `draft:${groupId}`;
      if (!name.trim()) {
        pendingOptionCreates.current.delete(key);
      } else {
        pendingOptionCreates.current.set(key, {
          key,
          data: normalizeModifierOptionInput({
            groupId,
            nameHe: name,
            priceDelta: parseFloat(price) || 0,
            sortOrder,
            active: true,
            archived: false,
          }),
        });
        markDirty();
      }
    },
    [markDirty]
  );

  const stageOptionDeletion = useCallback(
    (option: ModifierOption) => {
      pendingOptionUpdates.current.set(option.id, {
        id: option.id,
        data: normalizeModifierOptionInput({
          groupId: option.groupId,
          nameHe: option.name_he,
          nameAr: option.name_ar,
          nameEn: option.name_en,
          priceDelta: option.priceDelta,
          cost: option.cost,
          sortOrder: option.sortOrder,
          color: option.color,
          icon: option.icon,
          imageUrl: option.image,
          kitchenNote: option.kitchenNote,
          active: false,
          archived: true,
        }),
      });
      markDirty();
    },
    [markDirty]
  );

  const handleLinkOverride = useCallback(
    (override: PendingLinkOverride) => {
      const existing = existingLinks.find(
        (link) => link.groupId === override.groupId
      );
      const baselineActive = existing?.active ?? true;
      const baselineRequirement = existing?.requirement;
      const baselineSelectionType = existing?.selectionType;
      const unchanged =
        override.active === baselineActive &&
        (override.requirement ?? baselineRequirement) === baselineRequirement &&
        (override.selectionType ?? baselineSelectionType) ===
          baselineSelectionType;

      if (unchanged) {
        pendingLinkOverrides.current.delete(override.groupId);
      } else {
        pendingLinkOverrides.current.set(override.groupId, override);
      }
      setOverrideTick((value) => value + 1);
      markDirty();
    },
    [existingLinks, markDirty]
  );

  const handleOptionOverride = useCallback(
    (override: PendingOptionOverride) => {
      const existing = loadedOptionOverrides.find(
        (item) => item.optionId === override.optionId
      );
      const baselineActive = existing?.active ?? true;
      if (override.active === baselineActive) {
        pendingOptionOverrides.current.delete(override.optionId);
      } else {
        pendingOptionOverrides.current.set(override.optionId, override);
      }
      setOverrideTick((value) => value + 1);
      markDirty();
    },
    [loadedOptionOverrides, markDirty]
  );

  const linkGroup = (groupId: string) => {
    if (!linkedGroupIds.includes(groupId)) {
      onLinkedChange([...linkedGroupIds, groupId]);
      markDirty();
    }
  };

  const unlinkGroup = (groupId: string) => {
    onLinkedChange(linkedGroupIds.filter((id) => id !== groupId));
    pendingLinkOverrides.current.delete(groupId);
    setOverrideTick((value) => value + 1);
    markDirty();
  };

  const handleReorderGroups = (reordered: ModifierGroup[]) => {
    onLinkedChange(reordered.map((g) => g.id));
    markDirty();
  };

  const applyTemplate = (template: ModifierTemplate) => {
    newGroupDraftKey.current = `group:${Date.now()}`;
    setTemplateSeed(template);
    setShowNewGroup(true);
    markDirty();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h3 className="text-base font-semibold text-dark-brown dark:text-warm-white">
          {t("admin.productForm.modifiersTitle")}
        </h3>
        <p className="mt-1 text-sm text-coffee/50">{t("admin.productForm.modifiersSubtitle")}</p>
      </div>

      {!productId && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          {t("admin.productForm.modifiersAfterSave")}
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-medium text-coffee/50">{t("admin.productForm.commonTemplates")}</p>
        <div className="flex flex-wrap gap-2">
          {MODIFIER_TEMPLATES.map((tpl) => (
            <Button
              key={tpl.id}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-3 text-xs"
              onClick={() => applyTemplate(tpl)}
            >
              <Plus className="h-3 w-3" />
              {t(tpl.labelKey)}
            </Button>
          ))}
        </div>
      </div>

      {assignableGroups.length > 0 && (
        <div className="space-y-2 rounded-xl border border-beige-dark/15 p-3 dark:border-white/10">
          <p className="text-xs font-medium text-coffee/55">
            {t("admin.productForm.assignGroupsHeading")}
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {assignableGroups.map((group) => {
              const checked = linkedGroupIds.includes(group.id);
              return (
                <label
                  key={group.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-beige/20 px-2.5 py-2 text-sm dark:bg-white/5"
                  dir="rtl"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      if (event.target.checked) linkGroup(group.id);
                      else unlinkGroup(group.id);
                    }}
                    className="rounded accent-coffee"
                  />
                  <span className="truncate dark:text-warm-white">{group.name_he}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {!showNewGroup ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full rounded-xl border-dashed border-turquoise/40 text-base font-medium text-turquoise hover:bg-turquoise/5"
          onClick={() => {
            newGroupDraftKey.current = `group:${Date.now()}`;
            setTemplateSeed(null);
            setShowNewGroup(true);
          }}
        >
          <Plus className="h-5 w-5" />
          {t("admin.productForm.addModifierGroup")}
        </Button>
      ) : (
        <NewGroupCard
          key={`${newGroupDraftKey.current}:${templateSeed?.id ?? "custom"}`}
          draftKey={newGroupDraftKey.current}
          initialTemplate={templateSeed}
          onDraftChange={(draft) => {
            if (draft) {
              pendingGroupCreates.current.set(draft.key, draft);
              markDirty();
            } else {
              pendingGroupCreates.current.delete(newGroupDraftKey.current);
            }
          }}
          onReady={() => {
            setShowNewGroup(false);
            setTemplateSeed(null);
          }}
          onCancel={() => {
            setShowNewGroup(false);
            setTemplateSeed(null);
          }}
        />
      )}

      {linkedGroups.length > 0 && (
        <SortableList
          items={linkedGroups}
          onReorder={handleReorderGroups}
          className="space-y-3"
          renderItem={(group, dragHandle) => {
            const linkSettings = getLinkSettings(group);
            return (
              <ModifierGroupCard
                key={group.id}
                group={group}
                linkActive={linkSettings.active}
                linkRequirement={linkSettings.requirement}
                linkSelectionType={linkSettings.selectionType}
                optionActiveById={optionActiveById}
                dragHandle={dragHandle}
                onUnlink={() => unlinkGroup(group.id)}
                onGroupChange={markDirty}
                onPendingGroupChange={handlePendingGroupChange}
                onLinkOverride={handleLinkOverride}
                onOptionOverride={handleOptionOverride}
                onPendingOptionChange={handlePendingOptionChange}
                onStageOption={stageOption}
                onDraftOptionChange={updateOptionDraft}
                onDeleteOption={stageOptionDeletion}
                defaultFocusOptions={group.id === newGroupId}
                resetVersion={resetVersion}
              />
            );
          }}
        />
      )}

      {linkedGroups.length === 0 && !showNewGroup && (
        <p className="rounded-xl border border-dashed border-beige-dark/30 py-8 text-center text-sm text-coffee/45">
          {t("admin.productForm.noModifierGroupsHint")}
        </p>
      )}

      {unlinkedGroups.length > 0 && (
        <div className="rounded-xl border border-beige-dark/15 dark:border-white/10">
          <button
            type="button"
            onClick={() => setShowExisting((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-coffee/70"
          >
            {t("admin.productForm.otherGroups")} ({unlinkedGroups.length})
            <ChevronDown className={cn("h-4 w-4 transition-transform", showExisting && "rotate-180")} />
          </button>
          {showExisting && (
            <div className="space-y-2 border-t border-beige-dark/15 px-4 py-3">
              {unlinkedGroups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-beige/20 px-3 py-2 dark:bg-white/5"
                >
                  <span className="text-sm font-medium dark:text-warm-white" dir="rtl">
                    {group.name_he}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg text-xs"
                    onClick={() => linkGroup(group.id)}
                  >
                    <Plus className="h-3 w-3" />
                    {t("admin.productForm.linkGroup")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
