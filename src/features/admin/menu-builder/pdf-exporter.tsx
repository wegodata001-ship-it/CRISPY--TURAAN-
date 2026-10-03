"use client";

import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import type { MenuPage, PdfMenuTemplate } from "@/types/pdf-menu";
import { getPageExportOrder, peelLastProductFromPage, renumberPages } from "@/lib/pdf-menu/pagination-engine";
import { filterExportPages } from "@/lib/pdf-menu/page-content";
import { A4_HEIGHT_MM, A4_HEIGHT_PX, A4_WIDTH_MM, A4_WIDTH_PX } from "@/lib/pdf-menu/a4";
import { waitForFonts, waitForImages, waitTwoFrames } from "@/lib/pdf-menu/wait-for-export";
import { PDF_SAFE, preparePdfExportNode } from "@/lib/pdf-menu/pdf-safe-color";
import { collectPageImageUrls, hasMenuImageFailed, preloadExportImages } from "@/lib/pdf-menu/menu-image";
import { logPdfExportFailure, logPdfStage } from "@/lib/pdf-menu/export-log";
import { MenuPageRenderer } from "./menu-page-renderer";

export const PDF_EXPORT_USER_ERROR = "تعذر إنشاء ملف PDF، حاول مرة أخرى";
export const MIN_PDF_BYTES = 2500;

const EXPORT_HOST_CSS = `
.pdf-export-root {
  position: fixed;
  left: -100000px;
  top: 0;
  width: 210mm;
  background: white;
}
.pdf-export-page {
  width: 210mm !important;
  height: 297mm !important;
  min-width: 210mm !important;
  max-width: 210mm !important;
  min-height: 297mm !important;
  max-height: 297mm !important;
  transform: none !important;
  zoom: 1 !important;
  margin: 0 !important;
  padding: 0;
  overflow: hidden;
  direction: rtl;
  background: #fffaf6;
  box-shadow: none !important;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
`;

export function getPdfPageIds(pages: MenuPage[]): string[] {
  return getPageExportOrder(filterExportPages(pages));
}

export function menuPdfFilename(date = new Date()): string {
  return `crispy-menu-${date.toISOString().slice(0, 10)}.pdf`;
}

function PdfExportRoot({ page, template }: { page: MenuPage; template: PdfMenuTemplate }) {
  return (
    <div
      data-pdf-page={page.id}
      className="pdf-export-page"
      style={{
        width: "210mm",
        height: "297mm",
        minWidth: "210mm",
        maxWidth: "210mm",
        minHeight: "297mm",
        maxHeight: "297mm",
        transform: "none",
        margin: 0,
        padding: 0,
        overflow: "hidden",
        direction: "rtl",
        background: PDF_SAFE.background,
        boxShadow: "none",
      }}
    >
      <MenuPageRenderer page={page} menuTemplate={template} mode="export" />
    </div>
  );
}

function ensureExportStyles(): void {
  if (document.getElementById("pdf-export-host-styles")) return;
  const style = document.createElement("style");
  style.id = "pdf-export-host-styles";
  style.textContent = EXPORT_HOST_CSS;
  document.head.appendChild(style);
}

function createExportHost(): HTMLDivElement {
  ensureExportStyles();
  const host = document.createElement("div");
  host.setAttribute("data-pdf-export-host", "true");
  host.className = "pdf-export-root";
  host.setAttribute("aria-hidden", "true");
  document.body.appendChild(host);
  return host;
}

function cleanupExportRoot(root?: Root | null, host?: HTMLElement | null): void {
  try {
    root?.unmount();
  } catch {
    /* already unmounted */
  }
  host?.remove();
}

function stripClonedStylesheets(doc: Document): void {
  doc.documentElement.lang = "ar";
  doc.documentElement.dir = "rtl";
  doc.body.style.margin = "0";
  doc.body.style.background = PDF_SAFE.background;
  doc.querySelectorAll("style, link[rel='stylesheet']").forEach((node) => {
    if (node instanceof HTMLElement && node.id === "pdf-export-host-styles") return;
    const text = node.textContent ?? "";
    if (node.tagName === "STYLE" && text.includes("@font-face")) {
      const faces = text.match(/@font-face\s*{[\s\S]*?}/g);
      node.textContent = faces?.join("\n") ?? "";
      return;
    }
    node.parentNode?.removeChild(node);
  });
}

function absolutizeImages(root: HTMLElement): void {
  root.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src") || img.src;
    if (!src || src.startsWith("data:")) return;
    if (src.startsWith("blob:")) {
      img.remove();
      return;
    }
    try {
      img.src = new URL(src, window.location.origin).href;
    } catch {
      img.remove();
    }
  });
}

function hideRemoteImages(root: HTMLElement): void {
  root.querySelectorAll("img").forEach((img) => {
    try {
      const url = new URL(img.src, window.location.origin);
      if (url.origin !== window.location.origin) img.remove();
    } catch {
      img.remove();
    }
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function canvasToJpeg(canvas: HTMLCanvasElement): Promise<string> {
  try {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (!dataUrl.startsWith("data:image/jpeg")) {
      throw new Error("CANVAS_TODATAURL_FAILED");
    }
    return dataUrl;
  } catch (error) {
    throw new Error(
      `CANVAS_TAINTED_OR_EMPTY:${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function captureElement(el: HTMLElement, pageNumber: number): Promise<HTMLCanvasElement> {
  logPdfStage("cloning renderer", { pageNumber });
  const html2canvas = (await import("html2canvas-pro")).default;
  preparePdfExportNode(el);
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: PDF_SAFE.background,
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
    windowWidth: A4_WIDTH_PX,
    windowHeight: A4_HEIGHT_PX,
    logging: false,
    imageTimeout: 2000,
    foreignObjectRendering: false,
    ignoreElements: (node) =>
      node instanceof HTMLImageElement && (!node.complete || node.naturalWidth === 0),
    onclone: (clonedDoc, clonedEl) => {
      clonedEl.querySelectorAll("img").forEach((img) => {
        if (!img.getAttribute("src") || (img.complete && img.naturalWidth === 0)) {
          img.remove();
        }
      });
      preparePdfExportNode(clonedEl);
      stripClonedStylesheets(clonedDoc);
    },
  });
  console.info("[PDF_EXPORT] canvas", {
    pageNumber,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });
  if (!canvas.width || !canvas.height) {
    throw new Error("EMPTY_CANVAS");
  }
  if (canvas.width < 400 || canvas.height < 400) {
    throw new Error(`CANVAS_TOO_NARROW:${canvas.width}x${canvas.height}`);
  }
  return canvas;
}

function bringHostOnscreen(host: HTMLElement): void {
  host.style.left = "0";
  host.style.top = "0";
  host.style.opacity = "0.01";
  host.style.zIndex = "-1";
  host.style.pointerEvents = "none";
}

function measurePdfPageOverflow(pageEl: HTMLElement, tolerance = 8): number {
  const nodes = [pageEl, ...Array.from(pageEl.querySelectorAll<HTMLElement>("[data-pdf-unconstrain]"))];
  const previous = nodes.map((node) => ({
    node,
    height: node.style.height,
    maxHeight: node.style.maxHeight,
    overflow: node.style.overflow,
    flex: node.style.flex,
    minHeight: node.style.minHeight,
  }));
  nodes.forEach((node) => {
    node.style.height = "auto";
    node.style.maxHeight = "none";
    node.style.overflow = "visible";
    node.style.minHeight = "0";
    node.style.flex = "0 0 auto";
  });
  const contentH = pageEl.scrollHeight;
  previous.forEach(({ node, height, maxHeight, overflow, flex, minHeight }) => {
    node.style.height = height;
    node.style.maxHeight = maxHeight;
    node.style.overflow = overflow;
    node.style.flex = flex;
    node.style.minHeight = minHeight;
  });
  return contentH - A4_HEIGHT_PX - tolerance;
}

async function renderPageToCanvas(
  page: MenuPage,
  template: PdfMenuTemplate,
  pageNumber: number,
  total: number
): Promise<{ canvas: HTMLCanvasElement; overflowPx: number }> {
  logPdfStage(`rendering page ${pageNumber}`, { pageNumber, total, id: page.id });
  const host = createExportHost();
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(<PdfExportRoot page={page} template={template} />);
    });
    await waitTwoFrames();

    const el = host.querySelector("[data-pdf-page]") as HTMLElement | null;
    if (!el) throw new Error("EXPORT_ROOT_MISSING_PAGE");

    logPdfStage("waiting fonts", { pageNumber });
    await waitForFonts(document);

    logPdfStage("waiting images", { pageNumber });
    const originals = collectPageImageUrls(page, template);
    await preloadExportImages(originals, 4000);
    absolutizeImages(el);
    await waitForImages(el, 4000);
    el.querySelectorAll("img").forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) img.remove();
    });
    bringHostOnscreen(host);
    await waitTwoFrames();

    const pageNode = el.querySelector(".menu-pdf-page") as HTMLElement | null;
    const overflowPx = pageNode ? measurePdfPageOverflow(pageNode) : 0;

    try {
      const canvas = await captureElement(el, pageNumber);
      return { canvas, overflowPx };
    } catch (firstError) {
      console.warn("[PDF_EXPORT] capture retry", firstError);
      hideRemoteImages(el);
      await waitTwoFrames();
      const canvas = await captureElement(el, pageNumber);
      return { canvas, overflowPx };
    }
  } finally {
    cleanupExportRoot(root, host);
  }
}

export async function buildMenuPdfBlob(
  pages: MenuPage[],
  template: PdfMenuTemplate
): Promise<{
  blob: Blob;
  filename: string;
  pageCount: number;
  failedImages: number;
  reflowedPages: number;
  overflowPages: number;
}> {
  logPdfStage("preparing pages");
  const working = renumberPages(filterExportPages(pages));
  if (working.length === 0) {
    throw new Error("لا توجد صفحات للتصدير");
  }

  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const filename = menuPdfFilename();
  const attempted = new Set<string>();
  let reflowedPages = 0;
  let overflowPages = 0;
  const canvases: HTMLCanvasElement[] = [];

  let i = 0;
  while (i < working.length) {
    const page = working[i];
    if (!page) {
      i += 1;
      continue;
    }
    collectPageImageUrls(page, template).forEach((url) => attempted.add(url));
    const pageNumber = i + 1;
    let attempts = 0;
    let current = page;
    let captured: { canvas: HTMLCanvasElement; overflowPx: number } | null = null;

    while (attempts < 20) {
      const result = await renderPageToCanvas(current, template, pageNumber, working.length);
      if (result.overflowPx > 0 && current.pageKind !== "cover") {
        const peeled = peelLastProductFromPage(current);
        if (peeled) {
          logPdfStage("reflow overflow", {
            pageNumber,
            overflowPx: result.overflowPx,
            attempt: attempts + 1,
          });
          current = peeled.page;
          working[i] = peeled.page;
          working.splice(i + 1, 0, peeled.continuation);
          reflowedPages += 1;
          attempts += 1;
          continue;
        }
        overflowPages += 1;
        logPdfStage("overflow unreflowable", { pageNumber, overflowPx: result.overflowPx });
      }
      captured = result;
      working[i] = current;
      break;
    }

    if (!captured) {
      throw new Error("EXPORT_CAPTURE_FAILED");
    }
    canvases.push(captured.canvas);
    i += 1;
  }

  for (let n = 0; n < canvases.length; n++) {
    const canvas = canvases[n]!;
    const dataUrl = await canvasToJpeg(canvas);
    if (n > 0) pdf.addPage();
    pdf.addImage(dataUrl, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, "FAST");
  }

  logPdfStage("generating pdf");
  const blob = pdf.output("blob");
  if (!(blob instanceof Blob) || blob.size < MIN_PDF_BYTES) {
    throw new Error(`PDF_FILE_TOO_SMALL:${blob?.size ?? 0}`);
  }
  if (blob.type && blob.type !== "application/pdf") {
    throw new Error(`PDF_BAD_MIME:${blob.type}`);
  }
  const failedImages = [...attempted].filter((url) => hasMenuImageFailed(url)).length;
  return {
    blob,
    filename,
    pageCount: canvases.length,
    failedImages,
    reflowedPages,
    overflowPages,
  };
}

export async function exportMenuPdf(
  pages: MenuPage[],
  template: PdfMenuTemplate,
  _options?: { debug?: boolean }
): Promise<{
  filename: string;
  bytes: number;
  pageCount: number;
  failedImages: number;
  reflowedPages: number;
  overflowPages: number;
}> {
  try {
    const { blob, filename, pageCount, failedImages, reflowedPages, overflowPages } = await buildMenuPdfBlob(
      pages,
      template
    );
    logPdfStage("saving file", {
      filename,
      bytes: blob.size,
      mime: blob.type || "application/pdf",
      pageCount,
      failedImages,
      reflowedPages,
      overflowPages,
    });
    downloadBlob(blob, filename);
    return { filename, bytes: blob.size, pageCount, failedImages, reflowedPages, overflowPages };
  } catch (error) {
    logPdfExportFailure(error);
    throw error;
  }
}
