import { DEFAULT_PDF_DRAFT, type PdfMenuDraft } from "@/types/pdf-menu";

const KEY = "mishkat-pdf-menu-draft";

export function loadPdfDraft(): PdfMenuDraft {
  if (typeof window === "undefined") return { ...DEFAULT_PDF_DRAFT };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PDF_DRAFT };
    const parsed = JSON.parse(raw) as Partial<PdfMenuDraft>;
    return { ...DEFAULT_PDF_DRAFT, ...parsed, customColors: { ...DEFAULT_PDF_DRAFT.customColors, ...parsed.customColors }, pageTemplateOverrides: { ...parsed.pageTemplateOverrides } };
  } catch {
    return { ...DEFAULT_PDF_DRAFT };
  }
}

export function savePdfDraft(draft: PdfMenuDraft): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(draft));
}
