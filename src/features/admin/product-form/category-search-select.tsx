"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

interface CategorySearchSelectProps {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}

export function CategorySearchSelect({
  categories,
  value,
  onChange,
  placeholder,
  emptyLabel,
}: CategorySearchSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.toLowerCase();
    return categories.filter(
      (c) =>
        c.name_he.includes(query) ||
        c.name_ar.includes(query) ||
        c.name_en.toLowerCase().includes(q)
    );
  }, [categories, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-10 rounded-xl ps-9"
        />
      </div>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-beige-dark/20 dark:border-white/10">
        {filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-coffee/50">{emptyLabel}</p>
        ) : (
          filtered.map((cat) => {
            const selected = cat.id === value;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b border-beige-dark/10 px-4 py-3 text-start text-sm transition-colors last:border-0 hover:bg-beige/30 dark:border-white/5 dark:hover:bg-white/5",
                  selected && "bg-turquoise/10"
                )}
              >
                <span dir="rtl" className="font-medium dark:text-warm-white">
                  {cat.name_he || cat.name_ar}
                </span>
                <span className="truncate text-xs text-coffee/50">{cat.name_en}</span>
                {selected && <Check className="h-4 w-4 shrink-0 text-turquoise" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
