"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/components/providers/locale-provider";
import { compressProductImage } from "@/lib/images/compress-image";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";
import { cn } from "@/lib/utils";
import type { UploadImageOptions } from "@/services/storageService";

interface ProductImageSectionProps {
  imageUrl: string;
  onChange: (url: string) => void;
  onUpload: (
    file: File,
    onProgress: (pct: number) => void,
    options?: UploadImageOptions
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  onDelete?: (url: string) => Promise<void | unknown>;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ProductImageSection({
  imageUrl,
  onChange,
  onUpload,
  onDelete,
  onUploadingChange,
}: ProductImageSectionProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayUrl = previewUrl || imageUrl;
  const hasDisplayImage = Boolean(displayUrl && (previewUrl || isAllowedProductImageUrl(displayUrl)));

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const setLocalPreview = (file: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreviewUrl(url);
  };

  const clearLocalPreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreviewUrl(null);
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("admin.upload.selectImage"));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLastFile(file);
    setLocalPreview(file);
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    setProgress(0);

    try {
      const compressed = await compressProductImage(file);
      if (controller.signal.aborted) return;
      const result = await onUpload(compressed, setProgress, { signal: controller.signal });
      if (controller.signal.aborted) return;

      setUploading(false);
      if (result.success && result.data) {
        onChange(result.data);
        setProgress(100);
        setUploadSuccess(true);
        clearLocalPreview();
      } else if (result.error === "storage/canceled") {
        setError(null);
      } else if (result.error?.includes("not enabled") || result.error?.includes("Get Started")) {
        setError(t("admin.upload.storageNotReady"));
      } else {
        setError(result.error ?? t("admin.upload.stalled"));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setUploading(false);
      const message = err instanceof Error ? err.message : t("admin.upload.failed");
      console.error("[ProductImage] upload error", err);
      setError(message);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setProgress(0);
    setError(null);
    if (!imageUrl) clearLocalPreview();
  };

  const handleRemove = async () => {
    if (uploading) handleCancel();
    if (imageUrl && onDelete) await onDelete(imageUrl).catch(() => {});
    onChange("");
    clearLocalPreview();
    setUploadSuccess(false);
    setError(null);
    setLastFile(null);
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
          hasDisplayImage ? "border-beige-dark/25" : "border-dashed border-beige-dark/40",
          dragging && "border-turquoise bg-turquoise/10"
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
      >
        {hasDisplayImage ? (
          <div className="relative aspect-square w-full">
            <Image
              src={displayUrl}
              alt=""
              fill
              unoptimized
              className="object-cover"
              sizes="400px"
              priority
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square w-full flex-col items-center justify-center gap-3 p-6"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-beige/50 dark:bg-white/10">
              <ImageIcon className="h-8 w-8 text-coffee/35" />
            </div>
            <span className="text-center text-sm font-medium text-dark-brown dark:text-warm-white">
              {t("admin.upload.dragHere")}
            </span>
            <span className="text-center text-xs text-coffee/55">{t("admin.upload.orChoose")}</span>
          </button>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-beige dark:bg-white/10">
            <div
              className="h-full rounded-full bg-turquoise transition-all duration-300"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
          <p className="text-xs text-coffee/60">
            {t("admin.upload.uploading")} {progress}%
          </p>
        </div>
      )}

      {uploadSuccess && !uploading && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          {t("admin.upload.success")}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {!hasDisplayImage && !uploading && (
          <Button
            type="button"
            className="h-11 rounded-xl"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {t("admin.upload.chooseImage")}
          </Button>
        )}

        {uploading && (
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={handleCancel}>
            {t("admin.action.cancel")}
          </Button>
        )}

        {!uploading && error && lastFile && (
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => void handleFile(lastFile)}>
            {t("admin.upload.retry")}
          </Button>
        )}

        {!uploading && hasDisplayImage && (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={() => inputRef.current?.click()}
            >
              {t("admin.upload.changeImage")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl text-red-600 hover:text-red-700"
              onClick={() => void handleRemove()}
            >
              <X className="h-4 w-4" />
              {t("admin.upload.remove")}
            </Button>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
