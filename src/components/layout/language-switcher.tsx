"use client";

import { Globe } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/types";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function LanguageSwitcher({ className, compact }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("lang.switch")}
    >
      {!compact && (
        <Globe className="hidden h-4 w-4 text-coffee/50 sm:block" aria-hidden />
      )}
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code as Locale)}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
            locale === code
              ? "bg-turquoise text-warm-white shadow-sm"
              : "text-coffee/60 hover:bg-beige/60 hover:text-coffee"
          )}
          aria-pressed={locale === code}
          title={LOCALE_META[code as Locale].nativeLabel}
        >
          {LOCALE_META[code as Locale].flag}
        </button>
      ))}
    </div>
  );
}
