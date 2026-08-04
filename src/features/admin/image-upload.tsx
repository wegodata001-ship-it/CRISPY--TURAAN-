"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (
    file: File,
    onProgress: (pct: number) => void
  ) => Promise<{ success: boolean; data?: string; error?: string }>;
  onDelete?: (url: string) => Promise<void | unknown>;
  label?: string;
  className?: string;
}

export function ImageUpload({
  value,
  onChange,
  onUpload,
  onDelete,
  label = "Image",
  className,
}: ImageUploadProps) {
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);

    if (value && onDelete) {
      await onDelete(value).catch(() => {});
    }

    const result = await onUpload(file, setProgress);
    setUploading(false);

    if (result.success && result.data) {
      onChange(result.data);
      setProgress(100);
    } else {
      setError(result.error ?? "Upload failed");
    }
  };

  const handleRemove = async () => {
    if (value && onDelete) await onDelete(value);
    onChange("");
    setProgress(0);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-dark-brown">{label}</p>

      {value ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-beige-dark/30">
          <Image src={value} alt="Preview" fill className="object-cover" sizes="400px" />
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-dark-brown/70 text-warm-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-beige-dark/50 bg-beige/20 transition-colors hover:border-turquoise/50 hover:bg-beige/40"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-turquoise" />
          ) : (
            <Upload className="h-8 w-8 text-coffee/40" />
          )}
          <span className="text-sm text-coffee/60">
            {uploading ? "Uploading..." : "Click to upload"}
          </span>
        </button>
      )}

      {uploading && (
        <div className="h-2 overflow-hidden rounded-full bg-beige">
          <div
            className="h-full rounded-full bg-turquoise transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value && !uploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          Replace image
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
