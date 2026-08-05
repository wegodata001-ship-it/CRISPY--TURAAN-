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
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminEmptyState } from "./components/admin-empty-state";
import { adminInput } from "./components/admin-styles";

export function MediaLibrary({
  onSelect,
  selectable = false,
}: {
  onSelect?: (url: string) => void;
  selectable?: boolean;
}) {
  const t = useT();
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
    if (!confirm(t("admin.media.deleteConfirm").replace("{name}", file.name))) return;
    await deleteImage(file.path);
    load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.media.title")}
        subtitle={t("admin.media.filesCount").replace("{count}", String(files.length))}
        actions={
          <div className="relative w-full max-w-xs sm:w-56">
            <Search className="absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-coffee/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.media.search")}
              className={`${adminInput} ps-9`}
            />
          </div>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <AdminEmptyState icon={ImageIcon} title={t("admin.media.noFiles")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                    title={t("admin.media.copyUrl")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="rounded-lg bg-red-500/90 p-1.5 text-warm-white"
                    title={t("admin.action.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {selectable && onSelect && (
                    <Button size="sm" variant="turquoise" className="rounded-lg" onClick={() => onSelect(file.url)}>
                      {t("admin.media.use")}
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
                <span className="absolute top-2 start-2 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] text-white">
                  {t("admin.media.copied")}
                </span>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
