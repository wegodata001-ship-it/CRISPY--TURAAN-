"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Calendar, Copy, Eye, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { subscribeToAllBanners, createBanner, updateBanner, deleteBanner, reorderBanners } from "@/services";
import { useAllCategories, useAllProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import { AdminToastStack, createToast, type AdminToast } from "@/features/admin/components/admin-toast";
import { BannerWizard } from "@/features/admin/banners/banner-wizard";
import { BannerHero } from "@/features/catalog/banner-hero";
import { SortableList } from "@/components/admin/sortable-list";
import {
  bannerToDraft,
  bannerVisibility,
  draftToBanner,
  pickChangedBannerFields,
} from "@/lib/banners/manager";
import { formatDate, cn } from "@/lib/utils";
import { isAllowedProductImageUrl } from "@/lib/menu/placeholders";
import { uploadErrorMessage } from "@/lib/storage/errors";
import { useT } from "@/components/providers/locale-provider";
import { AdminPageHeader } from "./components/admin-page-header";
import { AdminEmptyState } from "./components/admin-empty-state";
import type { BannerInput } from "@/lib/validation/schemas";
import type { BannerSlide } from "@/types";

export function BannersAdmin() {
  const t = useT();
  const { products } = useAllProducts();
  const { categories } = useAllCategories();
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [ordered, setOrdered] = useState<BannerSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BannerSlide | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preview, setPreview] = useState<BannerSlide | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [deleteTarget, setDeleteTarget] = useState<BannerSlide | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticActive, setOptimisticActive] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const updatesInFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    return subscribeToAllBanners(
      (data) => {
        setBanners(data);
        setOrdered(data);
        setLoading(false);
        setOptimisticActive((current) => {
          const next = { ...current };
          data.forEach((banner) => {
            if (next[banner.id] === banner.active) delete next[banner.id];
          });
          return next;
        });
      },
      () => setLoading(false)
    );
  }, []);

  const sorted = useMemo(
    () =>
      [...banners]
        .map((banner) => ({
          ...banner,
          active: optimisticActive[banner.id] ?? banner.active,
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [banners, optimisticActive]
  );

  const pushToast = (message: string, type: "success" | "error" = "success") =>
    setToasts((current) => [...current, createToast(message, type)]);

  const openCreate = () => {
    setEditing(null);
    setError(null);
    setWizardOpen(true);
  };

  const openEdit = (banner: BannerSlide) => {
    setEditing(banner);
    setError(null);
    setWizardOpen(true);
  };

  const saveBanner = async (draft: BannerInput, initial: BannerInput) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const patch = editing ? pickChangedBannerFields(draft, initial) : null;
    if (editing && patch && Object.keys(patch).length === 0) {
      setSaving(false);
      setWizardOpen(false);
      return;
    }
    const result = editing ? await updateBanner(editing.id, patch!) : await createBanner(draft);
    setSaving(false);
    if (!result.success) {
      setError(uploadErrorMessage(result.error, t) || t("admin.banners.saveFailed"));
      return;
    }
    pushToast(t("admin.banners.saveSuccess"));
    setWizardOpen(false);
  };

  const toggleActive = async (banner: BannerSlide) => {
    if (updatesInFlight.current.has(banner.id)) return;
    updatesInFlight.current.add(banner.id);
    const nextActive = !banner.active;
    setOptimisticActive((current) => ({ ...current, [banner.id]: nextActive }));
    const result = await updateBanner(banner.id, { active: nextActive });
    if (!result.success) {
      setOptimisticActive((current) => ({ ...current, [banner.id]: banner.active }));
      pushToast(t("admin.banners.toggleError"), "error");
    }
    updatesInFlight.current.delete(banner.id);
  };

  const duplicateBanner = async (banner: BannerSlide) => {
    const draft = bannerToDraft(banner);
    const result = await createBanner({
      ...draft,
      title: `${draft.title} (${t("admin.action.copy")})`,
      titleHe: `${draft.titleHe || draft.title} (${t("admin.action.copy")})`,
      active: false,
      sortOrder: banners.length + 1,
      startDate: "",
      endDate: "",
    });
    pushToast(
      result.success ? t("admin.banners.duplicateSuccess") : result.error,
      result.success ? "success" : "error"
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget || saving) return;
    setSaving(true);
    const result = await deleteBanner(deleteTarget.id);
    setSaving(false);
    if (!result.success) {
      pushToast(result.error, "error");
      return;
    }
    pushToast(t("admin.banners.deleteSuccess"));
    setDeleteTarget(null);
  };

  const handleReorder = async (items: BannerSlide[]) => {
    setOrdered(items);
    const result = await reorderBanners(items.map((item) => item.id));
    if (!result.success) pushToast(result.error, "error");
  };

  const visibilityLabel = (banner: BannerSlide) => {
    const status = bannerVisibility(banner);
    return t(`admin.banners.visibility.${status}`);
  };

  const renderCard = (banner: BannerSlide, dragHandle?: React.ReactNode) => (
    <article className={cn("overflow-hidden rounded-2xl border border-beige-dark/15 bg-warm-white shadow-soft", !banner.active && "opacity-80")}>
      <div className="relative aspect-[16/9] bg-beige/30">
        {banner.image && isAllowedProductImageUrl(banner.image) ? (
          <Image src={banner.image} alt={banner.title} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-coffee/15 via-beige/40 to-turquoise/10" aria-hidden />
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge
            variant="outline"
            className={cn(
              "bg-warm-white/95",
              bannerVisibility(banner) === "live" && "border-emerald-300 text-emerald-700",
              bannerVisibility(banner) === "scheduled" && "border-sky-300 text-sky-700",
              bannerVisibility(banner) === "ended" && "border-stone-300 text-stone-600"
            )}
          >
            {visibilityLabel(banner)}
          </Badge>
          {dragHandle}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate font-semibold text-dark-brown dark:text-warm-white">{banner.title}</h3>
          <p className="mt-0.5 line-clamp-2 text-sm text-coffee/55">{banner.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-coffee/55">
          <span>{t("admin.banners.desktop")} ✓</span>
          <span>{t("admin.banners.mobile")} {banner.mobileImage ? "✓" : `— ${t("admin.banners.fallback")}`}</span>
        </div>
        {(banner.startDate || banner.endDate) && (
          <p className="flex items-center gap-1.5 text-xs text-coffee/50">
            <Calendar className="h-3.5 w-3.5" />
            {banner.startDate ? formatDate(banner.startDate) : "—"} → {banner.endDate ? formatDate(banner.endDate) : "—"}
          </p>
        )}

        <div className="flex items-center gap-2 border-t border-beige-dark/15 pt-3">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openEdit(banner)}>
            <Pencil className="h-3.5 w-3.5" /> {t("admin.action.edit")}
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setPreview(banner)}>
            <Eye className="h-3.5 w-3.5" /> {t("admin.banners.preview")}
          </Button>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl px-2 text-xs">
            <span>{banner.active ? t("admin.status.active") : t("admin.status.inactive")}</span>
            <input type="checkbox" role="switch" checked={banner.active} onChange={() => void toggleActive(banner)} className="h-4 w-8 accent-turquoise" />
          </label>
          <details className="relative">
            <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl hover:bg-beige/40">
              <MoreHorizontal className="h-4 w-4" />
            </summary>
            <div className="absolute end-0 top-10 z-20 w-44 space-y-1 rounded-xl border border-beige-dark/20 bg-warm-white p-2 shadow-elevated">
              <button type="button" onClick={() => void duplicateBanner(banner)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-beige/40">
                <Copy className="h-4 w-4" /> {t("admin.action.duplicate")}
              </button>
              <button type="button" onClick={() => setReorderMode(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-beige/40">
                <GripVertical className="h-4 w-4" /> {t("admin.action.reorder")}
              </button>
              <button type="button" onClick={() => setDeleteTarget(banner)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> {t("admin.action.delete")}
              </button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title={t("admin.banners.title")}
        subtitle={t("admin.banners.managerSubtitle")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setReorderMode((value) => !value)}>
              <GripVertical className="h-4 w-4" />
              {t("admin.action.reorder")}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("admin.banners.add")}
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-warm-white px-3 py-1.5 shadow-sm">{banners.length} {t("admin.banners.count")}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">{sorted.filter((banner) => banner.active).length} {t("admin.banners.activeCount")}</span>
        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-stone-600">{sorted.filter((banner) => !banner.active).length} {t("admin.banners.inactiveCount")}</span>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-80 rounded-2xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <AdminEmptyState
          icon={Plus}
          title={t("admin.banners.emptyTitle")}
          hint={t("admin.banners.emptyHint")}
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" />{t("admin.banners.add")}</Button>}
        />
      ) : reorderMode ? (
        <SortableList
          items={ordered}
          onReorder={handleReorder}
          className="space-y-3"
          renderItem={(banner, dragHandle) => (
            <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3 rounded-2xl border border-beige-dark/15 bg-warm-white p-3 shadow-soft">
              <div className="relative aspect-video overflow-hidden rounded-xl bg-beige/30">
                {banner.image && isAllowedProductImageUrl(banner.image) ? (
                  <Image src={banner.image} alt="" fill className="object-cover" sizes="140px" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-coffee/15 via-beige/40 to-turquoise/10" aria-hidden />
                )}
              </div>
              <div className="min-w-0"><p className="truncate font-semibold">{banner.title}</p><p className="text-xs text-coffee/50">{visibilityLabel(banner)}</p></div>
              {dragHandle}
            </div>
          )}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{sorted.map((banner) => <div key={banner.id}>{renderCard(banner)}</div>)}</div>
      )}

      <BannerWizard
        open={wizardOpen}
        editing={editing}
        nextSortOrder={banners.length + 1}
        products={products}
        categories={categories}
        saving={saving}
        error={error}
        onOpenChange={setWizardOpen}
        onSave={(draft, initial) => void saveBanner(draft, initial)}
      />

      <AdminModal open={preview != null} onOpenChange={(open) => !open && setPreview(null)} size="product">
          <AdminModalHeader onClose={() => setPreview(null)}>
            <AdminModalTitle>{t("admin.banners.preview")}</AdminModalTitle>
            <div className="mt-2 flex max-w-xs gap-2">
              {(["desktop", "mobile"] as const).map((device) => (
                <button key={device} onClick={() => setPreviewDevice(device)} className={cn("flex-1 rounded-lg px-3 py-2 text-sm", previewDevice === device ? "bg-turquoise text-white" : "bg-beige/30")}>
                  {t(`admin.banners.${device}`)}
                </button>
              ))}
            </div>
          </AdminModalHeader>
          <AdminModalBody>
            {preview && <div className={cn("mx-auto", previewDevice === "mobile" ? "max-w-[360px]" : "max-w-5xl")}><BannerHero banner={preview} device={previewDevice} interactive={false} /></div>}
          </AdminModalBody>
      </AdminModal>

      <AdminModal open={deleteTarget != null} onOpenChange={(open) => !saving && !open && setDeleteTarget(null)} size="sm">
          <AdminModalHeader onClose={() => setDeleteTarget(null)}><AdminModalTitle>{t("admin.banners.deleteTitle")}</AdminModalTitle></AdminModalHeader>
          <AdminModalBody>
            <p>{t("admin.banners.deleteQuestion").replace("{title}", deleteTarget?.title ?? "")}</p>
            <p className="mt-2 text-sm text-coffee/55">{t("admin.banners.deleteHint")}</p>
          </AdminModalBody>
          <AdminModalFooter>
            <Button variant="outline" disabled={saving} onClick={() => setDeleteTarget(null)}>{t("admin.action.cancel")}</Button>
            <Button variant="destructive" disabled={saving} onClick={() => void handleDelete()}>{t("admin.action.delete")}</Button>
          </AdminModalFooter>
      </AdminModal>

      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
