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
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-beige-dark/25 bg-warm-white/80 p-0.5 shadow-soft backdrop-blur-sm",
        className
      )}
      role="group"
      aria-label={t("lang.switch")}
    >
      {!compact && (
        <Globe className="ms-1.5 hidden h-3.5 w-3.5 shrink-0 text-coffee/45 sm:block" strokeWidth={1.75} aria-hidden />
      )}
      {LOCALES.map((code) => {
        const meta = LOCALE_META[code as Locale];
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code as Locale)}
            dir={meta.dir}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-200",
              compact ? "px-2 py-1" : "px-3 py-1.5 sm:text-sm",
              active
                ? "bg-turquoise text-warm-white shadow-sm"
                : "text-coffee/65 hover:bg-beige/70 hover:text-dark-brown"
            )}
            aria-pressed={active}
            aria-label={meta.nativeLabel}
          >
            {meta.nativeLabel}
          </button>
        );
      })}
    </div>
  );
}
