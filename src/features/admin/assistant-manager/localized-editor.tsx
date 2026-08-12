"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { LocalizedText } from "@/lib/assistant/types";
import type { Locale } from "@/lib/i18n/types";

export function LocalizedEditor({
  value,
  onChange,
  multiline = false,
  rows = 4,
  requiredHe = false,
}: {
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  multiline?: boolean;
  rows?: number;
  requiredHe?: boolean;
}) {
  const [locale, setLocale] = useState<Locale>("he");

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-xl bg-beige/25 p-1">
        {(["he", "ar", "en"] as Locale[]).map((valueLocale) => (
          <button
            key={valueLocale}
            type="button"
            onClick={() => setLocale(valueLocale)}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-3 text-sm",
              locale === valueLocale && "bg-warm-white font-semibold text-turquoise shadow-sm"
            )}
          >
            {valueLocale === "he" ? "עברית" : valueLocale === "ar" ? "العربية" : "English"}
            {requiredHe && valueLocale === "he" ? " *" : ""}
          </button>
        ))}
      </div>
      {multiline ? (
        <Textarea
          dir={locale === "en" ? "ltr" : "rtl"}
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
          rows={rows}
          className="min-h-[120px] resize-y"
        />
      ) : (
        <Input
          dir={locale === "en" ? "ltr" : "rtl"}
          value={value[locale]}
          onChange={(event) => onChange({ ...value, [locale]: event.target.value })}
          className="h-11"
        />
      )}
    </div>
  );
}
