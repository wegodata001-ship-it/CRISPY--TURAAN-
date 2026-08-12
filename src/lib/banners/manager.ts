import type { BannerInput } from "@/lib/validation/schemas";
import type { BannerSlide } from "@/types";

export type BannerVisibility = "live" | "inactive" | "scheduled" | "ended";

export function emptyBannerDraft(sortOrder: number): BannerInput {
  return {
    title: "",
    subtitle: "",
    titleHe: "",
    titleAr: "",
    titleEn: "",
    subtitleHe: "",
    subtitleAr: "",
    subtitleEn: "",
    buttonHe: "",
    buttonAr: "",
    buttonEn: "",
    imageUrl: "",
    mobileImageUrl: "",
    cta: "",
    ctaUrl: "",
    ctaAction: "none",
    ctaTargetId: "",
    desktopPositionX: 50,
    desktopPositionY: 50,
    mobilePositionX: 50,
    mobilePositionY: 50,
    desktopZoom: 1,
    mobileZoom: 1,
    active: true,
    sortOrder,
    startDate: "",
    endDate: "",
  };
}

export function bannerToDraft(banner: BannerSlide): BannerInput {
  return {
    title: banner.title,
    subtitle: banner.subtitle,
    titleHe: banner.title_he || banner.title,
    titleAr: banner.title_ar || "",
    titleEn: banner.title_en || "",
    subtitleHe: banner.subtitle_he || banner.subtitle,
    subtitleAr: banner.subtitle_ar || "",
    subtitleEn: banner.subtitle_en || "",
    buttonHe: banner.button_he || banner.cta || "",
    buttonAr: banner.button_ar || "",
    buttonEn: banner.button_en || "",
    imageUrl: banner.image,
    mobileImageUrl: banner.mobileImage || "",
    cta: banner.cta || "",
    ctaUrl: banner.ctaUrl || "",
    ctaAction: banner.ctaAction || (banner.ctaUrl ? "link" : "none"),
    ctaTargetId: banner.ctaTargetId || "",
    desktopPositionX: banner.desktopPositionX ?? 50,
    desktopPositionY: banner.desktopPositionY ?? 50,
    mobilePositionX: banner.mobilePositionX ?? 50,
    mobilePositionY: banner.mobilePositionY ?? 50,
    desktopZoom: banner.desktopZoom ?? 1,
    mobileZoom: banner.mobileZoom ?? 1,
    active: banner.active,
    sortOrder: banner.sortOrder,
    startDate: banner.startDate || "",
    endDate: banner.endDate || "",
  };
}

export function draftToBanner(draft: BannerInput, id = "preview"): BannerSlide {
  return {
    id,
    title: draft.title,
    subtitle: draft.subtitle,
    title_he: draft.titleHe,
    title_ar: draft.titleAr,
    title_en: draft.titleEn,
    subtitle_he: draft.subtitleHe,
    subtitle_ar: draft.subtitleAr,
    subtitle_en: draft.subtitleEn,
    button_he: draft.buttonHe,
    button_ar: draft.buttonAr,
    button_en: draft.buttonEn,
    image: draft.imageUrl,
    mobileImage: draft.mobileImageUrl || undefined,
    cta: draft.cta,
    ctaUrl: draft.ctaUrl,
    ctaAction: draft.ctaAction,
    ctaTargetId: draft.ctaTargetId,
    desktopPositionX: draft.desktopPositionX,
    desktopPositionY: draft.desktopPositionY,
    mobilePositionX: draft.mobilePositionX,
    mobilePositionY: draft.mobilePositionY,
    desktopZoom: draft.desktopZoom,
    mobileZoom: draft.mobileZoom,
    active: draft.active,
    sortOrder: draft.sortOrder,
    startDate: draft.startDate || undefined,
    endDate: draft.endDate || undefined,
  };
}

export function pickChangedBannerFields(
  current: BannerInput,
  initial: BannerInput
): Partial<BannerInput> {
  const patch: Partial<BannerInput> = {};
  (Object.keys(current) as (keyof BannerInput)[]).forEach((key) => {
    if (current[key] !== initial[key]) {
      (patch as Record<keyof BannerInput, BannerInput[keyof BannerInput]>)[key] = current[key];
    }
  });
  return patch;
}

export function bannerVisibility(banner: BannerSlide, now = Date.now()): BannerVisibility {
  if (!banner.active) return "inactive";
  if (banner.startDate && new Date(banner.startDate).getTime() > now) return "scheduled";
  if (banner.endDate && new Date(banner.endDate).getTime() < now) return "ended";
  return "live";
}
