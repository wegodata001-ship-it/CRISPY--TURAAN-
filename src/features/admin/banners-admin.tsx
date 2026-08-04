"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, Calendar } from "lucide-react";
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
import { SortableList } from "@/components/admin/sortable-list";
import { uploadBannerImage, deleteImageByUrl } from "@/services/storageService";
import { cn } from "@/lib/utils";
import type { BannerSlide } from "@/types";

export function BannersAdmin() {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BannerSlide | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordered, setOrdered] = useState<BannerSlide[]>([]);

  useEffect(() => {
    const unsub = subscribeToAllBanners(
      (data) => { setBanners(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const sorted = useMemo(
    () => [...banners].sort((a, b) => a.sortOrder - b.sortOrder),
    [banners]
  );
  const displayList = ordered.length ? ordered : sorted;

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
    if (!confirm("Delete this banner?")) return;
    await deleteBanner(id);
  };

  const toggleActive = async (banner: BannerSlide) => {
    await updateBanner(banner.id, { active: !banner.active });
  };

  const handleReorder = async (items: BannerSlide[]) => {
    setOrdered(items);
    await reorderBanners(items.map((b) => b.id));
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown dark:text-warm-white">Banners</h1>
          <p className="text-sm text-coffee/60">Drag to reorder · schedule campaigns</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <SortableList
          className="mt-6 space-y-4"
          items={displayList}
          onReorder={handleReorder}
          renderItem={(banner, dragHandle) => (
            <motion.div
              layout
              className={cn(
                "overflow-hidden rounded-2xl bg-warm-white shadow-soft dark:bg-white/5",
                !banner.active && "opacity-60"
              )}
            >
              <div className="grid md:grid-cols-2">
                <div className="relative h-36">
                  <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="400px" />
                  <span className="absolute left-2 top-2 rounded bg-dark-brown/70 px-2 py-0.5 text-[10px] text-white">Desktop</span>
                </div>
                {banner.mobileImage && (
                  <div className="relative hidden h-36 md:block">
                    <Image src={banner.mobileImage} alt="" fill className="object-cover" sizes="400px" />
                    <span className="absolute left-2 top-2 rounded bg-dark-brown/70 px-2 py-0.5 text-[10px] text-white">Mobile</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 p-4">
                {dragHandle}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-dark-brown dark:text-warm-white">{banner.title}</p>
                    <Badge variant={isBannerLive(banner) ? "ready" : "cancelled"}>
                      {isBannerLive(banner) ? "Live" : "Inactive"}
                    </Badge>
                    {(banner.startDate || banner.endDate) && (
                      <Badge variant="outline" className="gap-1">
                        <Calendar className="h-3 w-3" />
                        {banner.startDate?.slice(0, 10) ?? "—"} → {banner.endDate?.slice(0, 10) ?? "—"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-coffee/50">{banner.subtitle}</p>
                  {banner.cta && (
                    <p className="mt-1 text-xs text-turquoise">{banner.cta}{banner.ctaUrl ? ` → ${banner.ctaUrl}` : ""}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => toggleActive(banner)}>
                    {banner.active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(banner)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(banner.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Banner" : "New Banner"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input id="subtitle" {...form.register("subtitle")} className="mt-1" />
            </div>
            <ImageUpload
              label="Desktop Banner"
              value={form.watch("imageUrl")}
              onChange={(url) => form.setValue("imageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadBannerImage(file, `${editing?.id ?? `new-${Date.now()}`}-desktop`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <ImageUpload
              label="Mobile Banner (optional)"
              value={form.watch("mobileImageUrl") ?? ""}
              onChange={(url) => form.setValue("mobileImageUrl", url)}
              onUpload={(file, onProgress) =>
                uploadBannerImage(file, `${editing?.id ?? `new-${Date.now()}`}-mobile`, onProgress)
              }
              onDelete={deleteImageByUrl}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cta">CTA Button Text</Label>
                <Input id="cta" {...form.register("cta")} className="mt-1" placeholder="Order Now" />
              </div>
              <div>
                <Label htmlFor="ctaUrl">CTA Link</Label>
                <Input id="ctaUrl" {...form.register("ctaUrl")} className="mt-1" placeholder="#menu" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="datetime-local" {...form.register("startDate")} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="datetime-local" {...form.register("endDate")} className="mt-1" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("active")} className="rounded" />
              Active
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
