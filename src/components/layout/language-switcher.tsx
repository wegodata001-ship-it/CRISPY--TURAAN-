"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "@/lib/i18n/types";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  compact?: boolean;
  variant?: "inline" | "dropdown";
}

export function LanguageSwitcher({
  className,
  compact,
  variant = "inline",
}: LanguageSwitcherProps) {
  if (variant === "dropdown") {
    return <LanguageDropdown className={className} />;
  }

  return <LanguageInline className={className} compact={compact} />;
}

function LanguageInline({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
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
        <Globe
          className="ms-1.5 hidden h-3.5 w-3.5 shrink-0 text-coffee/45 sm:block"
          strokeWidth={1.75}
          aria-hidden
        />
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

function LanguageDropdown({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentMeta = LOCALE_META[locale];

  const handleSelect = useCallback(
    (code: Locale) => {
      setLocale(code);
      setOpen(false);
    },
    [setLocale]
  );

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-full text-dark-brown sm:h-10 sm:w-auto sm:gap-1.5 sm:rounded-xl sm:border sm:border-beige-dark/25 sm:bg-warm-white/80 sm:px-2.5 sm:text-sm sm:font-medium sm:text-coffee/80"
        aria-label={t("lang.switch")}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="h-5 w-5 shrink-0 sm:h-4 sm:w-4 sm:text-coffee/50" strokeWidth={1.75} />
        <span className="hidden max-w-[72px] truncate sm:inline">{currentMeta.nativeLabel}</span>
        <ChevronDown
          className={cn(
            "hidden h-3.5 w-3.5 shrink-0 text-coffee/40 transition-transform duration-200 sm:block",
            open && "rotate-180"
          )}
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          className="absolute end-0 top-full z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-beige-dark/20 bg-warm-white py-1 shadow-elevated dark:border-white/10 dark:bg-[#1a1412]"
          role="listbox"
          aria-label={t("lang.switch")}
        >
          {LOCALES.map((code) => {
            const meta = LOCALE_META[code as Locale];
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                dir={meta.dir}
                onClick={() => handleSelect(code as Locale)}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-turquoise/10 text-turquoise"
                    : "text-coffee/75 hover:bg-beige/50 dark:text-warm-white/70 dark:hover:bg-white/5"
                )}
              >
                {active && <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
                {!active && <span className="h-4 w-4 shrink-0" />}
                <span>{meta.nativeLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
