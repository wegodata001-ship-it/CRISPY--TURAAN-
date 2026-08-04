"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Search, Trash2, Copy, Loader2, ImageIcon } from "lucide-react";
import { listMediaFiles as fetchMedia, type MediaFile } from "@/services/mediaService";
import { deleteImage } from "@/services/storageService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaLibrary({
  onSelect,
  selectable = false,
}: {
  onSelect?: (url: string) => void;
  selectable?: boolean;
}) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const result = await fetchMedia();
    if (result.success) setFiles(result.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return files;
    const q = search.toLowerCase();
    return files.filter(
      (f) => f.name.toLowerCase().includes(q) || f.folder.toLowerCase().includes(q)
    );
  }, [files, search]);

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`Delete ${file.name}?`)) return;
    await deleteImage(file.path);
    load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown dark:text-warm-white">
            Media Library
          </h1>
          <p className="text-sm text-coffee/60">{files.length} files in Storage</p>
        </div>
        <div className="relative max-w-xs flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media..."
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12 flex flex-col items-center py-16 text-center">
          <ImageIcon className="h-12 w-12 text-coffee/30" />
          <p className="mt-4 text-sm text-coffee/50">No media files yet</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((file, i) => (
            <motion.div
              key={file.path}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className="group relative overflow-hidden rounded-xl border border-beige-dark/20 bg-warm-white shadow-soft dark:border-white/10 dark:bg-[#1a1412]"
            >
              <div className="relative aspect-square">
                <Image src={file.url} alt={file.name} fill className="object-cover" sizes="200px" />
                <div className="absolute inset-0 flex items-end justify-center gap-1 bg-gradient-to-t from-dark-brown/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => copyUrl(file.url)}
                    className="rounded-lg bg-warm-white/90 p-1.5"
                    title="Copy URL"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="rounded-lg bg-red-500/90 p-1.5 text-warm-white"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {selectable && onSelect && (
                    <Button size="sm" variant="turquoise" onClick={() => onSelect(file.url)}>
                      Use
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-2">
                <p className="truncate text-[10px] font-medium text-dark-brown dark:text-warm-white">
                  {file.name}
                </p>
                <p className="truncate text-[9px] text-coffee/40">{file.folder}</p>
              </div>
              {copied === file.url && (
                <span className="absolute top-2 left-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] text-white">
                  Copied!
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
