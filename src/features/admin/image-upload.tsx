"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { compressProductImage } from "@/lib/images/compress-image";
import type { UploadImageOptions } from "@/services/storageService";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (
    file: File,
    onProgress: (pct: number) => void,
    options?: UploadImageOptions
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  onDelete?: (url: string) => Promise<void | unknown>;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  label,
  className,
  compact = false,
}: ImageUploadProps) {
  const t = useT();
  const resolvedLabel = label ?? t("admin.upload.image");
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const displayUrl = previewUrl || value;

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
        clearLocalPreview();
      } else if (result.error === "storage/canceled") {
        setError(null);
      } else if (result.error?.includes("not enabled") || result.error?.includes("Get Started")) {
        setError(t("admin.upload.storageNotReady"));
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setUploading(false);
      setError(err instanceof Error ? err.message : t("admin.upload.failed"));
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUploading(false);
    setProgress(0);
    if (!value) clearLocalPreview();
  };

  const handleRemove = async () => {
    if (uploading) handleCancel();
    if (value && onDelete) await onDelete(value);
    onChange("");
    clearLocalPreview();
    setProgress(0);
    setLastFile(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-dark-brown dark:text-warm-white">{resolvedLabel}</p>

      <div
        className={cn(
          "relative w-full overflow-hidden rounded-xl border bg-beige/15 dark:bg-white/5",
          displayUrl ? "border-beige-dark/30" : "border-dashed border-beige-dark/50",
          compact ? "h-28" : "aspect-video",
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
        {displayUrl ? (
          <Image src={displayUrl} alt={t("admin.upload.preview")} fill unoptimized className="object-cover" sizes="400px" />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-full w-full flex-col items-center justify-center gap-2"
          >
            {uploading ? (
              <Upload className={cn("text-turquoise", compact ? "h-5 w-5" : "h-8 w-8")} />
            ) : (
              <ImageIcon className={cn("text-coffee/40", compact ? "h-5 w-5" : "h-8 w-8")} />
            )}
            <span className="text-sm text-coffee/60 dark:text-warm-white/60">
              {uploading ? t("admin.upload.uploading") : t("admin.upload.dragHere")}
            </span>
          </button>
        )}
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-beige dark:bg-white/10">
            <div className="h-full rounded-full bg-turquoise transition-all duration-300" style={{ width: `${Math.max(progress, 2)}%` }} />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-coffee/50">
              {t("admin.upload.uploading")} {progress}%
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
              {t("admin.action.cancel")}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-red-600">{error}</p>
          {lastFile && (
            <Button type="button" variant="outline" size="sm" onClick={() => void handleFile(lastFile)}>
              {t("admin.upload.retry")}
            </Button>
          )}
        </div>
      )}

      {value && !uploading && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => inputRef.current?.click()}>
            {t("admin.upload.changeImage")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => void handleRemove()}>
            <X className="h-4 w-4" />
            {t("admin.upload.remove")}
          </Button>
        </div>
      )}

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
