"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

interface ProductImageSectionProps {
  imageUrl: string;
  onChange: (url: string) => void;
  onUpload: (
    file: File,
    onProgress: (pct: number) => void
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  onDelete?: (url: string) => Promise<void | unknown>;
}

export function ProductImageSection({
  imageUrl,
  onChange,
  onUpload,
  onDelete,
}: ProductImageSectionProps) {
  const t = useT();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("admin.upload.selectImage"));
      return;
    }
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    setProgress(0);

    const result = await onUpload(file, setProgress);
    setUploading(false);

    if (result.success && result.data) {
      onChange(result.data);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2500);
    } else {
      setError(result.error ?? t("admin.upload.failed"));
    }
  };

  const handleRemove = async () => {
    if (!imageUrl) return;
    if (!confirm(t("admin.productForm.deleteImageConfirm"))) return;
    if (onDelete) await onDelete(imageUrl).catch(() => {});
    onChange("");
    setUploadSuccess(false);
    setError(null);
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-dark-brown dark:text-warm-white">
          {t("admin.productForm.productImageTitle")}
        </h3>
        <p className="mt-1 text-xs text-coffee/50">{t("admin.productForm.productImageHint")}</p>
      </div>

      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-beige/15 dark:bg-white/5",
          imageUrl ? "border-beige-dark/25" : "border-dashed border-beige-dark/40"
        )}
      >
        {imageUrl ? (
          <div className="relative aspect-square w-full">
            <Image src={imageUrl} alt="" fill className="object-cover" sizes="400px" priority />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-brown/40">
                <Loader2 className="h-10 w-10 animate-spin text-warm-white" />
              </div>
            )}
          </div>
        ) : (
          <label
            className={cn(
              "flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 p-6",
              uploading && "pointer-events-none opacity-70"
            )}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-beige/50 dark:bg-white/10">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
              ) : (
                <ImageIcon className="h-8 w-8 text-coffee/35" />
              )}
            </div>
            <span className="text-center text-sm text-coffee/55">
              {uploading ? t("admin.upload.uploading") : t("admin.productForm.noImagePlaceholder")}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-beige dark:bg-white/10">
            <div
              className="h-full rounded-full bg-turquoise transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-coffee/50">{t("admin.upload.uploading")} {progress}%</p>
        </div>
      )}

      {uploadSuccess && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {t("admin.productForm.imageUploadSuccess")}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <label className={cn(!imageUrl && "flex-1")}>
          <Button
            type="button"
            variant={imageUrl ? "outline" : "default"}
            className="h-11 w-full rounded-xl sm:w-auto"
            disabled={uploading}
            asChild
          >
            <span>
              <Upload className="h-4 w-4" />
              {imageUrl ? t("admin.upload.replace") : t("admin.productForm.uploadImage")}
            </span>
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>

        {imageUrl && (
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl text-red-600 hover:text-red-700"
            disabled={uploading}
            onClick={() => void handleRemove()}
          >
            <X className="h-4 w-4" />
            {t("admin.productForm.removeImage")}
          </Button>
        )}
      </div>
    </div>
  );
}
