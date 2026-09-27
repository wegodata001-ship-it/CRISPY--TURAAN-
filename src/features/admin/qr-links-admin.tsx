"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download, ExternalLink, QrCode } from "lucide-react";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/features/admin/components/admin-page-header";
import { AdminCard } from "@/features/admin/components/admin-card";
import {
  ADMIN_QR_DOWNLOAD_PX,
  ADMIN_QR_PREVIEW_PX,
  getAdminQrLinks,
  type AdminQrLink,
} from "@/lib/admin-qr-links";
import { createQrPngDataUrl } from "@/lib/admin-qr-image";

function QrLinkCard({ link, index }: { link: AdminQrLink; index: number }) {
  const t = useT();
  const [preview, setPreview] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPreview("");
    void createQrPngDataUrl(link.url, ADMIN_QR_PREVIEW_PX).then((dataUrl) => {
      if (!cancelled) setPreview(dataUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [link.url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const downloadPng = async () => {
    setDownloading(true);
    try {
      const dataUrl = await createQrPngDataUrl(link.url, ADMIN_QR_DOWNLOAD_PX);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = link.filename;
      a.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <AdminCard title={t(link.nameKey)} icon={<QrCode className="h-4 w-4 text-turquoise" />} delay={0.08 * index}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex w-full max-w-[320px] items-center justify-center rounded-2xl border border-beige-dark/20 bg-white p-4 dark:border-white/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={t(link.nameKey)}
              className="h-auto w-full min-h-[240px]"
            />
          ) : (
            <div className="flex aspect-square w-full min-h-[240px] items-center justify-center text-sm text-coffee/50">
              {t("admin.qr.generating")}
            </div>
          )}
        </div>

        <p className="w-full break-all text-center text-sm text-coffee/80 dark:text-warm-white/70" dir="ltr">
          {link.url}
        </p>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => void copyLink()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("admin.qr.copied") : t("admin.qr.copy")}
          </Button>
          <Button
            type="button"
            variant="turquoise"
            className="h-10 rounded-xl"
            disabled={downloading}
            onClick={() => void downloadPng()}
          >
            <Download className="h-4 w-4" />
            {t("admin.qr.download")}
          </Button>
          <Button type="button" variant="secondary" className="h-10 rounded-xl" asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              {t("admin.qr.open")}
            </a>
          </Button>
        </div>
      </div>
    </AdminCard>
  );
}

export function QrLinksGrid() {
  const links = getAdminQrLinks();
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {links.map((link, index) => (
        <QrLinkCard key={link.id} link={link} index={index} />
      ))}
    </div>
  );
}

export function QrLinksAdmin() {
  const t = useT();

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("admin.qr.title")} subtitle={t("admin.qr.subtitle")} />
      <QrLinksGrid />
    </div>
  );
}
