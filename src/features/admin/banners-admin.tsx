"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subscribeToBanners, createBanner, updateBanner, deleteBanner } from "@/services";
import { bannerSchema, type BannerInput } from "@/lib/validation/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BannerSlide } from "@/types";

export function BannersAdmin() {
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BannerSlide | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToBanners(
      (data) => { setBanners(data); setLoading(false); },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  const form = useForm({
    resolver: zodResolver(bannerSchema),
    defaultValues: { title: "", subtitle: "", imageUrl: "", cta: "", active: true, sortOrder: 0 },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ title: "", subtitle: "", imageUrl: "", cta: "", active: true, sortOrder: banners.length + 1 });
    setError(null);
    setOpen(true);
  };

  const openEdit = (banner: BannerSlide) => {
    setEditing(banner);
    form.reset({
      title: banner.title,
      subtitle: banner.subtitle,
      imageUrl: banner.image,
      cta: banner.cta ?? "",
      active: true,
      sortOrder: 0,
    });
    setError(null);
    setOpen(true);
  };

  const onSubmit = form.handleSubmit(async (data) => {
    setSaving(true);
    setError(null);
    const result = editing
      ? await updateBanner(editing.id, data)
      : await createBanner(data);
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown">Banners</h1>
          <p className="text-sm text-coffee/60">{banners.length} promotional banners</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Banner
        </Button>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {banners.map((banner, i) => (
            <motion.div
              key={banner.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="overflow-hidden rounded-2xl bg-warm-white shadow-soft"
            >
              <div className="relative h-32">
                <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="400px" />
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-dark-brown">{banner.title}</p>
                  <p className="text-xs text-coffee/50">{banner.subtitle}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(banner)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(banner.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
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
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" {...form.register("imageUrl")} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="cta">CTA Text</Label>
              <Input id="cta" {...form.register("cta")} className="mt-1" />
            </div>
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
