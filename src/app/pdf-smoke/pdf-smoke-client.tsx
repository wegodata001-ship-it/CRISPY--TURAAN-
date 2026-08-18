"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMenuPdfBlob } from "@/features/admin/menu-builder/pdf-exporter";
import { logPdfExportFailure } from "@/lib/pdf-menu/export-log";
import { createSmokeMenuExport } from "@/lib/pdf-menu/smoke-pages";
import { makeQrDataUrl } from "@/lib/pdf-menu/qr";
import { getPublicOrderUrl } from "@/lib/site-url";
import { MenuPageRenderer } from "@/features/admin/menu-builder/menu-page-renderer";
import type { PdfMenuTemplate } from "@/types/pdf-menu";

declare global {
  interface Window {
    __PDF_EXPORT_RESULT?: {
      ok: boolean;
      filename?: string;
      size?: number;
      mime?: string;
      pageCount?: number;
      failedImages?: number;
      secondRunOk?: boolean;
      b64?: string;
      message?: string;
      stack?: string;
    };
  }
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function PdfSmokeClient() {
  const base = useMemo(() => createSmokeMenuExport(), []);
  const [template, setTemplate] = useState<PdfMenuTemplate>(base.template);
  const [status, setStatus] = useState("starting");
  const pages = base.pages;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qrUrl = await makeQrDataUrl(getPublicOrderUrl());
        if (cancelled) return;
        const nextTemplate: PdfMenuTemplate = {
          ...base.template,
          coverSettings: { ...base.template.coverSettings, qrUrl, showQr: true },
        };
        setTemplate(nextTemplate);
        const first = await buildMenuPdfBlob(pages, nextTemplate);
        const second = await buildMenuPdfBlob(pages, nextTemplate);
        if (cancelled) return;
        window.__PDF_EXPORT_RESULT = {
          ok: true,
          filename: first.filename,
          size: first.blob.size,
          mime: first.blob.type || "application/pdf",
          pageCount: first.pageCount,
          failedImages: first.failedImages,
          secondRunOk: second.blob.size >= first.blob.size * 0.5,
          b64: await blobToBase64(first.blob),
        };
        setStatus(`ok ${first.filename} ${first.blob.size} bytes ${first.pageCount} pages`);
      } catch (error) {
        logPdfExportFailure(error);
        const err = error instanceof Error ? error : new Error(String(error));
        window.__PDF_EXPORT_RESULT = {
          ok: false,
          message: err.message,
          stack: err.stack,
        };
        setStatus(`fail ${err.message}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base.template, pages]);

  return (
    <main dir="rtl" style={{ padding: 24, fontFamily: "Tahoma, sans-serif", background: "#eee" }}>
      <h1>PDF export smoke</h1>
      <p data-testid="pdf-smoke-status">{status}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {pages.map((page) => (
          <div key={page.id} data-testid={`smoke-page-${page.id}`} style={{ width: 794 }}>
            <MenuPageRenderer page={page} menuTemplate={template} mode="preview" />
          </div>
        ))}
      </div>
    </main>
  );
}
