"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { ImageUpload } from "@/features/admin/image-upload";
import { BannerHero } from "@/features/catalog/banner-hero";
import { uploadBannerImage } from "@/services/storageService";
import { draftToBanner, emptyBannerDraft, bannerToDraft } from "@/lib/banners/manager";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";
import type { BannerInput } from "@/lib/validation/schemas";
import type { BannerSlide, Category, Product } from "@/types";

const STEPS = ["images", "content", "preview", "publish"] as const;
const LANGUAGES = ["he", "ar", "en"] as const;

function RangeField({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1 text-xs text-coffee/60">
      <span className="flex justify-between">
        {label}
        <span>{value.toFixed(step < 1 ? 1 : 0)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-turquoise"
      />
    </label>
  );
}

export function BannerWizard({
  open,
  editing,
  nextSortOrder,
  products,
  categories,
  saving,
  error,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  editing: BannerSlide | null;
  nextSortOrder: number;
  products: Product[];
  categories: Category[];
  saving: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (draft: BannerInput, initial: BannerInput) => void;
}) {
  const t = useT();
  const { dir } = useLocale();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("he");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [publishMode, setPublishMode] = useState<"now" | "inactive" | "scheduled">("now");
  const [draft, setDraft] = useState<BannerInput>(() => emptyBannerDraft(nextSortOrder));
  const initialRef = useRef<BannerInput>(emptyBannerDraft(nextSortOrder));
  const uploadId = useRef(`banner-${Date.now()}`);

  useEffect(() => {
    if (!open) return;
    const next = editing ? bannerToDraft(editing) : emptyBannerDraft(nextSortOrder);
    setDraft(next);
    initialRef.current = next;
    setStep(0);
    setLanguage("he");
    setPreviewDevice("desktop");
    setPublishMode(
      !next.active ? "inactive" : next.startDate || next.endDate ? "scheduled" : "now"
    );
    uploadId.current = editing?.id ?? `new-${Date.now()}`;
  }, [editing, nextSortOrder, open]);

  const set = <K extends keyof BannerInput>(key: K, value: BannerInput[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const localizedKeys = useMemo(() => {
    if (language === "ar") {
      return { title: "titleAr", subtitle: "subtitleAr", button: "buttonAr" } as const;
    }
    if (language === "en") {
      return { title: "titleEn", subtitle: "subtitleEn", button: "buttonEn" } as const;
    }
    return { title: "titleHe", subtitle: "subtitleHe", button: "buttonHe" } as const;
  }, [language]);

  const canContinue =
    step === 0
      ? Boolean(draft.imageUrl)
      : step === 1
        ? Boolean(
            (draft.titleHe || draft.title).trim() &&
              (draft.subtitleHe || draft.subtitle).trim() &&
              (draft.ctaAction === "none" ||
                (draft.buttonHe || draft.cta || "").trim()) &&
              (draft.ctaAction !== "link" || draft.ctaUrl?.trim()) &&
              (!["product", "category"].includes(draft.ctaAction || "") ||
                draft.ctaTargetId)
          )
        : true;

  const normalizedDraft = (): BannerInput => {
    const title = (draft.titleHe || draft.title).trim();
    const subtitle = (draft.subtitleHe || draft.subtitle).trim();
    const cta = (draft.buttonHe || draft.cta || "").trim();
    return {
      ...draft,
      title,
      subtitle,
      cta,
      active: publishMode !== "inactive",
      startDate: publishMode === "scheduled" ? draft.startDate : "",
      endDate: publishMode === "scheduled" ? draft.endDate : "",
      mobileImageUrl: draft.mobileImageUrl || "",
    };
  };

  return (
    <AdminModal open={open} onOpenChange={(next) => !saving && onOpenChange(next)} size="product">
        <AdminModalHeader onClose={() => onOpenChange(false)}>
          <AdminModalTitle>
            {editing ? t("admin.banners.edit") : t("admin.banners.createTitle")}
          </AdminModalTitle>
          <div className="mt-3 grid grid-cols-4 gap-1">
            {STEPS.map((name, index) => (
              <button
                key={name}
                type="button"
                onClick={() => index <= step && setStep(index)}
                className={cn(
                  "rounded-lg px-1 py-2 text-[11px] font-medium sm:text-xs",
                  index === step
                    ? "bg-turquoise text-white"
                    : index < step
                      ? "bg-turquoise/10 text-turquoise"
                      : "bg-beige/30 text-coffee/40"
                )}
              >
                {index + 1}. {t(`admin.banners.step.${name}`)}
              </button>
            ))}
          </div>
        </AdminModalHeader>

        <AdminModalBody>
          {step === 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <ImageUpload
                  label={t("admin.banners.desktopUpload")}
                  value={draft.imageUrl}
                  onChange={(url) => set("imageUrl", url)}
                  onUpload={(file, onProgress) =>
                    uploadBannerImage(file, `${uploadId.current}-desktop`, onProgress)
                  }
                />
                {draft.imageUrl && (
                  <div className="grid gap-3 rounded-xl bg-beige/20 p-3 sm:grid-cols-3">
                    <RangeField
                      label={t("admin.banners.positionX")}
                      value={draft.desktopPositionX ?? 50}
                      onChange={(value) => set("desktopPositionX", value)}
                    />
                    <RangeField
                      label={t("admin.banners.positionY")}
                      value={draft.desktopPositionY ?? 50}
                      onChange={(value) => set("desktopPositionY", value)}
                    />
                    <RangeField
                      label={t("admin.banners.zoom")}
                      value={draft.desktopZoom ?? 1}
                      min={1}
                      max={2}
                      step={0.05}
                      onChange={(value) => set("desktopZoom", value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{t("admin.banners.mobileUpload")}</h3>
                  <p className="text-sm text-coffee/50">{t("admin.banners.mobileHint")}</p>
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-beige-dark/20 px-3">
                  <input
                    type="checkbox"
                    checked={!draft.mobileImageUrl}
                    onChange={(event) => {
                      if (event.target.checked) set("mobileImageUrl", "");
                    }}
                  />
                  {t("admin.banners.useDesktopImage")}
                </label>
                <ImageUpload
                  label={t("admin.banners.customMobileImage")}
                  value={draft.mobileImageUrl || ""}
                  onChange={(url) => set("mobileImageUrl", url)}
                  onUpload={(file, onProgress) =>
                    uploadBannerImage(file, `${uploadId.current}-mobile`, onProgress)
                  }
                />
                {(draft.mobileImageUrl || draft.imageUrl) && (
                  <div className="grid gap-3 rounded-xl bg-beige/20 p-3 sm:grid-cols-3">
                    <RangeField
                      label={t("admin.banners.positionX")}
                      value={draft.mobilePositionX ?? 50}
                      onChange={(value) => set("mobilePositionX", value)}
                    />
                    <RangeField
                      label={t("admin.banners.positionY")}
                      value={draft.mobilePositionY ?? 50}
                      onChange={(value) => set("mobilePositionY", value)}
                    />
                    <RangeField
                      label={t("admin.banners.zoom")}
                      value={draft.mobileZoom ?? 1}
                      min={1}
                      max={2}
                      step={0.05}
                      onChange={(value) => set("mobileZoom", value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-2xl space-y-5">
              <div className="flex gap-2 rounded-xl bg-beige/25 p-1">
                {LANGUAGES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLanguage(value)}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-sm",
                      language === value && "bg-warm-white font-semibold text-turquoise shadow-sm"
                    )}
                  >
                    {value === "he" ? "עברית" : value === "ar" ? "العربية" : "English"}
                  </button>
                ))}
              </div>
              <div>
                <Label>{t("admin.banners.titleField")}</Label>
                <Input
                  dir={language === "en" ? "ltr" : "rtl"}
                  value={(draft[localizedKeys.title] as string | undefined) ?? ""}
                  onChange={(event) => set(localizedKeys.title, event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("admin.banners.subtitleField")}</Label>
                <Input
                  dir={language === "en" ? "ltr" : "rtl"}
                  value={(draft[localizedKeys.subtitle] as string | undefined) ?? ""}
                  onChange={(event) => set(localizedKeys.subtitle, event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("admin.banners.ctaText")}</Label>
                <Input
                  dir={language === "en" ? "ltr" : "rtl"}
                  value={(draft[localizedKeys.button] as string | undefined) ?? ""}
                  onChange={(event) => set(localizedKeys.button, event.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t("admin.banners.buttonAction")}</Label>
                <select
                  value={draft.ctaAction ?? "none"}
                  onChange={(event) => set("ctaAction", event.target.value as BannerInput["ctaAction"])}
                  className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3"
                >
                  {(["none", "link", "product", "category"] as const).map((action) => (
                    <option key={action} value={action}>
                      {t(`admin.banners.action.${action}`)}
                    </option>
                  ))}
                </select>
              </div>
              {draft.ctaAction === "link" && (
                <div>
                  <Label>{t("admin.banners.ctaLink")}</Label>
                  <Input value={draft.ctaUrl || ""} onChange={(event) => set("ctaUrl", event.target.value)} className="mt-1" />
                </div>
              )}
              {draft.ctaAction === "product" && (
                <div>
                  <Label>{t("admin.banners.chooseProduct")}</Label>
                  <select
                    value={draft.ctaTargetId || ""}
                    onChange={(event) => set("ctaTargetId", event.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3"
                  >
                    <option value="">{t("admin.banners.chooseProduct")}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.name_he || product.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
              {draft.ctaAction === "category" && (
                <div>
                  <Label>{t("admin.banners.chooseCategory")}</Label>
                  <select
                    value={draft.ctaTargetId || ""}
                    onChange={(event) => set("ctaTargetId", event.target.value)}
                    className="mt-1 h-10 w-full rounded-xl border border-beige-dark/30 bg-warm-white px-3"
                  >
                    <option value="">{t("admin.banners.chooseCategory")}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name_he || category.name_en}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {step === 2 && draft.imageUrl && (
            <div className="space-y-4">
              <div className="mx-auto flex max-w-sm gap-2 rounded-xl bg-beige/25 p-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2", previewDevice === "desktop" && "bg-warm-white shadow-sm")}
                >
                  <Monitor className="h-4 w-4" /> {t("admin.banners.desktop")}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={cn("flex flex-1 items-center justify-center gap-2 rounded-lg py-2", previewDevice === "mobile" && "bg-warm-white shadow-sm")}
                >
                  <Smartphone className="h-4 w-4" /> {t("admin.banners.mobile")}
                </button>
              </div>
              <div className={cn("mx-auto", previewDevice === "mobile" ? "max-w-[360px]" : "max-w-5xl")}>
                <BannerHero banner={draftToBanner(normalizedDraft())} device={previewDevice} interactive={false} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="mx-auto max-w-xl space-y-4">
              {(["now", "inactive", "scheduled"] as const).map((mode) => (
                <label key={mode} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-beige-dark/20 px-4">
                  <input type="radio" name="publish-mode" checked={publishMode === mode} onChange={() => setPublishMode(mode)} />
                  <span>{t(`admin.banners.publish.${mode}`)}</span>
                </label>
              ))}
              {publishMode === "scheduled" && (
                <div className="grid gap-4 rounded-xl bg-beige/20 p-4 sm:grid-cols-2">
                  <div>
                    <Label>{t("admin.banners.startDate")}</Label>
                    <Input type="datetime-local" value={draft.startDate || ""} onChange={(event) => set("startDate", event.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>{t("admin.banners.endDate")}</Label>
                    <Input type="datetime-local" value={draft.endDate || ""} onChange={(event) => set("endDate", event.target.value)} className="mt-1" />
                  </div>
                </div>
              )}
              {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            </div>
          )}
        </AdminModalBody>

        <AdminModalFooter className="justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => (step === 0 ? onOpenChange(false) : setStep((current) => current - 1))}
          >
            {step === 0 ? t("admin.action.cancel") : t("common.back")}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
              {t("common.continue")}
              {dir === "rtl" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button type="button" disabled={saving || (publishMode === "scheduled" && !draft.startDate)} onClick={() => onSave(normalizedDraft(), initialRef.current)}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? t("admin.action.save") : t("admin.banners.publishBanner")}
            </Button>
          )}
        </AdminModalFooter>
    </AdminModal>
  );
}
