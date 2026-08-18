"use client";

import type { PageTemplateId } from "@/types/pdf-menu";
import { getPageTemplate } from "@/lib/pdf-menu/page-templates";

export function TemplateThumbnail({ templateId }: { templateId: PageTemplateId }) {
  const def = getPageTemplate(templateId);
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-beige-dark/15"
      style={{ aspectRatio: "210 / 297", background: def.thumbnail.bg }}
    >
      <div className="absolute inset-1.5 flex flex-col gap-1">
        {def.thumbnail.pattern === "cover" && (
          <div className="flex h-full items-center justify-center">
            <div className="h-1.5 w-8 rounded-full" style={{ background: def.thumbnail.accent }} />
          </div>
        )}
        {def.thumbnail.pattern === "list" &&
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm bg-black/10" />
              <div className="h-1 flex-1 rounded-full bg-black/10" />
            </div>
          ))}
        {def.thumbnail.pattern === "cards" && (
          <div className="grid grid-cols-2 gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded bg-black/10" />
            ))}
          </div>
        )}
        {def.thumbnail.pattern === "elegant" &&
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1">
              <div className="h-1 w-6 rounded-full bg-black/20" />
              <div className="h-px flex-1 border-b border-dotted border-black/20" />
              <div className="h-1 w-3 rounded-full" style={{ background: def.thumbnail.accent }} />
            </div>
          ))}
        {def.thumbnail.pattern === "split" && (
          <div className="grid h-full grid-cols-2 gap-1">
            <div className="rounded" style={{ background: def.thumbnail.accent, opacity: 0.4 }} />
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-1 rounded-full bg-black/15" />
              ))}
            </div>
          </div>
        )}
        {def.thumbnail.pattern === "stack" && (
          <>
            <div className="flex-1 space-y-0.5 rounded border border-black/10 bg-white/50 p-1">
              <div className="h-1 w-8 rounded-full" style={{ background: def.thumbnail.accent }} />
              <div className="h-1 rounded-full bg-black/10" />
            </div>
            <div className="flex-1 space-y-0.5 rounded border border-black/10 bg-white/50 p-1">
              <div className="h-1 w-8 rounded-full" style={{ background: def.thumbnail.accent }} />
              <div className="h-1 rounded-full bg-black/10" />
            </div>
          </>
        )}
        {def.thumbnail.pattern === "overlay" && (
          <div className="flex h-full flex-col justify-end gap-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-1 rounded-full bg-white/40" />
            ))}
          </div>
        )}
        {def.thumbnail.pattern === "promo" && (
          <div className="grid grid-cols-2 gap-1">
            {[1, 2].map((i) => (
              <div key={i} className="rounded bg-white/70 p-1">
                <div className="mb-1 aspect-square rounded" style={{ background: def.thumbnail.accent, opacity: 0.5 }} />
                <div className="h-2 w-6 rounded-full" style={{ background: def.thumbnail.accent }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
