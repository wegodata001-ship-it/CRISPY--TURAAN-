"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  Calendar,
  Copy,
  ImageIcon,
  Power,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subscribeToAllBanners, createBanner, updateBanner, deleteBanner, reorderBanners } from "@/services";
import { isBannerLive } from "@/lib/mappers";
import { bannerSchema, type BannerInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/features/admin/image-upload";
import { uploadBannerImage, deleteImageByUrl } from "@/services/storageService";
import { cn, formatDate } from "@/lib/utils";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminCard } from "./components/admin-card";
import { AdminEmptyState } from "./components/admin-empty-state";
import { adminCardHover } from "./components/admin-styles";
import type { BannerSlide } from "@/types";

export function BannersAdmin() {
  const t = useT();
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BannerSlide | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<BannerSlide | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllBanners(
      (data) => {
        setBanners(data);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const sorted = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );

  const form = useForm({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      imageUrl: "",
      mobileImageUrl: "",
      cta: "",
      ctaUrl: "",
      active: true,
      sortOrder: 0,
      startDate: "",
      endDate: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      title: "",
      subtitle: "",
      imageUrl: "",
      mobileImageUrl: "",
      cta: "",
      ctaUrl: "",
      active: true,
      sortOrder: banners.length + 1,
      startDate: "",
      endDate: "",
    });
    setError(null);
    setOpen(true);
  };

  const openEdit = (banner: BannerSlide) => {
    setEditing(banner);
    form.reset({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.image,
      mobileImageUrl: banner.mobileImage ?? "",
      cta: banner.cta ?? "",
      ctaUrl: banner.ctaUrl ?? "",
      active: banner.active,
      sortOrder: banner.sortOrder,
      startDate: banner.startDate ?? "",
      endDate: banner.endDate ?? "",
    });
    setError(null);
    setOpen(true);
  };

  const duplicateBanner = async (banner: BannerSlide) => {
    await createBanner({
      title: `${banner.title} (2)`,
      subtitle: banner.subtitle,
      imageUrl: banner.image,
      mobileImageUrl: banner.mobileImage,
      cta: banner.cta,
      ctaUrl: banner.ctaUrl,
      active: false,
      sortOrder: banners.length + 1,
      startDate: banner.startDate,
      endDate: banner.endDate,
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const payload = {
      ...data,
      mobileImageUrl: data.mobileImageUrl || undefined,
      startDate: data.startDate || undefined,
      endDate: data.endDate || undefined,
    };
    const result = editing
      ? await updateBanner(editing.id, payload)
      : await createBanner(payload);
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
  });

  const handleDelete = async (id: string) => {
    if (!confirm(t("admin.banners.deleteConfirm"))) return;
    await deleteBanner(id);
  };

  const toggleActive = async (banner: BannerSlide) => {
    await updateBanner(banner.id, { active: !banner.active });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.banners.title")}
        subtitle={t("admin.banners.subtitle")}
        actions={
          <Button onClick={openCreate} className="h-10 rounded-xl">
            <Plus className="h-4 w-4" />
            {t("admin.banners.add")}
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <AdminEmptyState
          icon={ImageIcon}
          title={t("admin.table.empty")}
          hint={t("admin.banners.dragHint")}
          action={
            <Button onClick={openCreate} className="rounded-xl">
              <Plus className="h-4 w-4" />
              {t("admin.banners.add")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((banner, i) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(adminCardHover, "overflow-hidden p-0", !banner.active && "opacity-75")}
            >
              <div className="relative aspect-[16/9] w-full bg-beige/30">
                <Image
                  src={banner.image}
                  alt={banner.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                <div className="absolute inset-x-0 bottom-0 flex gap-1.5 bg-gradient-to-t from-dark-brown/80 to-transparent p-3 pt-8">
                  <Badge variant="outline" className="border-white/30 bg-dark-brown/50 text-[10px] text-white">
                    {t("admin.banners.desktop")}
                  </Badge>
                  {banner.mobileImage && (
                    <Badge variant="outline" className="border-white/30 bg-dark-brown/50 text-[10px] text-white">
                      {t("admin.banners.mobile")}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-dark-brown dark:text-warm-white">{banner.title}</p>
                    {banner.subtitle && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-coffee/50">{banner.subtitle}</p>
                    )}
                  </div>
                  <Badge variant={isBannerLive(banner) ? "ready" : "cancelled"}>
                    {isBannerLive(banner) ? t("admin.status.live") : t("admin.status.inactive")}
                  </Badge>
                </div>

                {(banner.startDate || banner.endDate) && (
                  <div className="flex items-center gap-1.5 text-[11px] text-coffee/50">
                    <Calendar className="h-3 w-3 shrink-0" />
                    <span>
                      {banner.startDate ? formatDate(banner.startDate) : "—"} →{" "}
                      {banner.endDate ? formatDate(banner.endDate) : "—"}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 border-t border-beige-dark/15 pt-3 dark:border-white/10">
                  <Button variant="ghost" size="icon-sm" onClick={() => setPreview(banner)} title={t("admin.banners.preview")}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(banner)} title={t("admin.action.edit")}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => duplicateBanner(banner)} title={t("admin.action.duplicate")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(banner)} title={banner.active ? t("admin.action.disable") : t("admin.action.enable")}>
                    <Power className={cn("h-3.5 w-3.5", banner.active ? "text-emerald-600" : "text-gray-400")} />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(banner.id)} title={t("admin.action.delete")}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("admin.banners.preview")}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-4">
              <div className="relative aspect-video overflow-hidden rounded-xl">
                <Image src={preview.image} alt={preview.title} fill className="object-cover" sizes="800px" />
              </div>
              {preview.mobileImage && (
                <div className="relative mx-auto aspect-[9/16] max-h-64 overflow-hidden rounded-xl">
                  <Image src={preview.mobileImage} alt="" fill className="object-cover" sizes="300px" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("admin.banners.edit") : t("admin.banners.new")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">{t("admin.banners.titleField")}</Label>
              <Input id="title" {...form.register("title")} className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="subtitle">{t("admin.banners.subtitleField")}</Label>
              <Input id="subtitle" {...form.register("subtitle")} className="mt-1 rounded-xl" />
            </div>
            <ImageUpload
              label={t("admin.banners.desktopImage")}
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadBannerImage(file, `${editing?.id ?? `new-${Date.now()}`}-desktop`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <ImageUpload
              label={t("admin.banners.mobileImage")}
              value={form.watch("mobileImageUrl") ?? ""}
              onChange={(url) => form.setValue("mobileImageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadBannerImage(file, `${editing?.id ?? `new-${Date.now()}`}-mobile`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cta">{t("admin.banners.ctaText")}</Label>
                <Input id="cta" {...form.register("cta")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="ctaUrl">{t("admin.banners.ctaLink")}</Label>
                <Input id="ctaUrl" {...form.register("ctaUrl")} className="mt-1 rounded-xl" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">{t("admin.banners.startDate")}</Label>
                <Input id="startDate" type="datetime-local" {...form.register("startDate")} className="mt-1 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="endDate">{t("admin.banners.endDate")}</Label>
                <Input id="endDate" type="datetime-local" {...form.register("endDate")} className="mt-1 rounded-xl" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="rounded" />
              {t("admin.status.active")}
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="h-10 w-full rounded-xl" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editing ? (
                t("admin.action.save")
              ) : (
                t("admin.action.create")
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
