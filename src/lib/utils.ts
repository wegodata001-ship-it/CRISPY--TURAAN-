import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return `${price.toFixed(2)} ₪`;
}

import type { Locale } from "@/lib/i18n/types";

const LOCALE_TAGS: Record<Locale, string> = {
  he: "he-IL",
  ar: "ar-IL",
  en: "en-IL",
};

export function formatDate(date: string, locale: Locale = "he"): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDateShort(date: string, locale: Locale = "he"): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    day: "numeric",
    month: "short",
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
