"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useAllCategories, useAllProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PDF_DRAFT,
  type ArrangeMode,
  type PdfMenuDraft,
  type WizardStep,
} from "@/types/pdf-menu";
import { loadPdfDraft, savePdfDraft } from "@/lib/pdf-menu/draft-storage";
import {
  buildWizardPages,
  selectedCategoriesWithProducts,
  syncPageOrder,
} from "@/lib/pdf-menu/build-wizard-pages";
import { makeQrDataUrl } from "@/lib/pdf-menu/qr";
import { getPublicOrderUrl } from "@/lib/site-url";
import type { AppSettings } from "@/services/settingsService";
import { exportMenuPdf, PDF_EXPORT_USER_ERROR } from "../pdf-exporter";
import { A4Stage } from "../a4-stage";
import { MenuPageRenderer } from "../menu-page-renderer";
import { StepCategories } from "./step-categories";
import { StepProducts } from "./step-products";
import { StepLayout } from "./step-layout";
import { StepDesign } from "./step-design";
import { StepPreview } from "./step-preview";

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "الفئات" },
  { id: 2, label: "المنتجات" },
  { id: 3, label: "الترتيب" },
  { id: 4, label: "التصميم" },
  { id: 5, label: "المعاينة" },
];

const FALLBACK_SETTINGS: AppSettings = {
  storeName: BRAND.name,
  logoUrl: BRAND.logo,
  storeImageUrl: BRAND.store,
  showProductThumbnails: true,
  phone: "",
  address: "",
  hours: "",
  currency: "ILS",
  theme: { primary: "#3D2B24", accent: "#007A80", background: "#F8F3ED" },
  seo: { title: BRAND.name, description: BRAND.taglineAlt },
  social: { instagram: "", facebook: "", whatsapp: "" },
  mapsUrl: "",
  faviconUrl: BRAND.logo,
};

export function PdfMenuWizard() {
  const { locale } = useLocale();
  const { categories } = useAllCategories();
  const { products } = useAllProducts();
  const { settings } = useSettings();
  const appSettings = settings ?? FALLBACK_SETTINGS;

  const [draft, setDraft] = useState<PdfMenuDraft>(DEFAULT_PDF_DRAFT);
  const [ready, setReady] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportWarning, setExportWarning] = useState("");

  useEffect(() => {
    setDraft(loadPdfDraft());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    savePdfDraft(draft);
    setSavedFlash(true);
    const t = window.setTimeout(() => setSavedFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [draft, ready]);

  const orderUrl = getPublicOrderUrl();

  useEffect(() => {
    if (!draft.showQr) {
      setQrDataUrl("");
      return;
    }
    let cancelled = false;
    makeQrDataUrl(orderUrl).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [draft.showQr, orderUrl]);

  const patch = useCallback((partial: Partial<PdfMenuDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      if (partial.templateId && next.layoutMode === "auto") {
        next.pageOrder = [];
      }
      return next;
    });
  }, []);

  const liveCategories = useMemo(
    () => categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const productCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (!p.available || !p.active) continue;
      counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const packedCats = useMemo(
    () => selectedCategoriesWithProducts(draft, liveCategories, products, locale),
    [draft, liveCategories, products, locale]
  );

  const built = useMemo(
    () => buildWizardPages(draft, packedCats, appSettings, qrDataUrl, orderUrl),
    [draft, packedCats, appSettings, qrDataUrl, orderUrl]
  );

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of liveCategories) map[c.id] = getLocalizedName(c, locale);
    for (const c of packedCats) map[c.setting.categoryId] = c.category.name;
    return map;
  }, [liveCategories, locale, packedCats]);

  const selectedProductCount = useMemo(() => {
    const excluded = new Set(draft.excludedProductIds);
    return products.filter(
      (p) =>
        draft.selectedCategoryIds.includes(p.categoryId) &&
        p.available &&
        p.active &&
        !excluded.has(p.id)
    ).length;
  }, [products, draft.selectedCategoryIds, draft.excludedProductIds]);

  const canContinue =
    draft.currentStep === 1
      ? draft.selectedCategoryIds.length > 0
      : draft.currentStep === 2
        ? selectedProductCount > 0
        : draft.currentStep === 3
          ? packedCats.length > 0
          : draft.currentStep === 5
            ? built.pages.length > 0
            : true;

  const goTo = (step: WizardStep) => {
    let next = { ...draft, currentStep: step };
    if (step >= 3) {
      next = { ...next, pageOrder: syncPageOrder(next, packedCats) };
    }
    setDraft(next);
  };

  const nextStep = () => {
    if (!canContinue || draft.currentStep >= 5) return;
    goTo((draft.currentStep + 1) as WizardStep);
  };

  const prevStep = () => {
    if (draft.currentStep <= 1) return;
    patch({ currentStep: (draft.currentStep - 1) as WizardStep });
  };

  const setLayoutMode = (mode: ArrangeMode) => {
    const next = { ...draft, layoutMode: mode };
    setDraft({ ...next, pageOrder: syncPageOrder({ ...next, layoutMode: mode }, packedCats) });
  };

  const movePage = (index: number, dir: -1 | 1) => {
    const to = index + dir;
    if (to < 0 || to >= draft.pageOrder.length) return;
    const next = [...draft.pageOrder];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(to, 0, item);
    patch({ layoutMode: "manual", pageOrder: next });
  };

  const moveCategory = (fromPage: number, categoryId: string, toPage: number) => {
    if (fromPage === toPage) return;
    const next = draft.pageOrder.map((slot) => ({ ...slot, categoryIds: [...slot.categoryIds] }));
    const source = next[fromPage];
    const dest = next[toPage];
    if (!source || !dest) return;
    source.categoryIds = source.categoryIds.filter((id) => id !== categoryId);
    dest.categoryIds = [...dest.categoryIds, categoryId];
    patch({
      layoutMode: "manual",
      pageOrder: next.filter((slot) => slot.categoryIds.length > 0),
    });
  };

  const handleExport = async () => {
    if (exporting) return;
    setExportError("");
    setExportSuccess(false);
    setExportWarning("");
    setExporting(true);
    try {
      let pages = built.pages;
      let template = built.menuTemplate;
      if (draft.showQr) {
        const qr = qrDataUrl || (await makeQrDataUrl(orderUrl));
        if (!qrDataUrl && qr) {
          const rebuilt = buildWizardPages(draft, packedCats, appSettings, qr, orderUrl);
          pages = rebuilt.pages;
          template = rebuilt.menuTemplate;
        }
      }
      const result = await exportMenuPdf(pages, template);
      setExportSuccess(true);
      if (result.overflowPages > 0) {
        setExportWarning("بعض الصفحات ما زالت تفيض. تم نقل المنتجات إلى صفحات جديدة حيث أمكن.");
      } else if (result.reflowedPages > 0) {
        setExportWarning("تم نقل منتجات إلى الصفحة التالية حتى يظهر الوصف كاملاً");
      } else if (result.failedImages > 0) {
        setExportWarning(`تعذر تحميل ${result.failedImages} صور وتم استخدام التصميم البديل`);
      }
      window.setTimeout(() => setExportSuccess(false), 3500);
    } catch (error) {
      setExportError(PDF_EXPORT_USER_ERROR);
    } finally {
      setExporting(false);
    }
  };

  if (!ready) {
    return <div className="p-8 text-sm text-coffee/50">جاري التحميل...</div>;
  }

  const showSidePreview = draft.currentStep >= 3 && built.pages.length > 0;
  const previewPage = built.pages[draft.showCover ? 1 : 0] ?? built.pages[0];

  return (
    <div className="-mx-4 -my-6 flex min-h-[calc(100vh-8rem)] flex-col bg-[#FFF8F3] md:-mx-6 md:-my-8" dir="rtl">
      <header className="border-b border-beige-dark/15 bg-white/80 px-4 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#E07A5F]">قائمة PDF</p>
            <h1 className="text-xl font-bold text-dark-brown">أنشئ قائمتك في خطوات بسيطة</h1>
          </div>
          <span className={cn("text-xs font-medium text-coffee/45 transition-opacity", savedFlash ? "opacity-100" : "opacity-0")}>
            تم الحفظ تلقائيًا
          </span>
        </div>
        <ol className="mt-4 flex items-center gap-1 overflow-x-auto">
          {STEPS.map((step, i) => {
            const active = draft.currentStep === step.id;
            const done = draft.currentStep > step.id;
            return (
              <li key={step.id} className="flex min-w-0 flex-1 items-center gap-1">
                <button
                  type="button"
                  onClick={() => (done || active ? goTo(step.id) : undefined)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-full px-2 py-1.5 text-xs font-semibold sm:px-3",
                    active ? "bg-[#E8A87C] text-white" : done ? "bg-[#FFF0E8] text-[#9B4B5A]" : "bg-beige/40 text-coffee/40"
                  )}
                >
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px]", active ? "bg-white/20" : "bg-white/70")}>
                    {done ? <Check className="h-3.5 w-3.5" /> : step.id}
                  </span>
                  <span className="truncate">{step.label}</span>
                </button>
                {i < STEPS.length - 1 && <span className="hidden h-px w-3 shrink-0 bg-beige-dark/30 sm:block" />}
              </li>
            );
          })}
        </ol>
      </header>

      <div className={cn("mx-auto flex w-full flex-1 gap-6 px-4 py-6 sm:px-6", showSidePreview && draft.currentStep !== 5 ? "max-w-6xl lg:grid lg:grid-cols-[minmax(0,1fr)_280px]" : "max-w-5xl")}>
        <div className="min-w-0 pb-24 lg:pb-8">
          {draft.currentStep === 1 && (
            <StepCategories
              categories={liveCategories}
              productCounts={productCounts}
              selectedIds={draft.selectedCategoryIds}
              locale={locale}
              onChange={(ids) => {
                const next = { ...draft, selectedCategoryIds: ids };
                setDraft({
                  ...next,
                  pageOrder:
                    next.layoutMode === "auto"
                      ? syncPageOrder(next, selectedCategoriesWithProducts(next, liveCategories, products, locale))
                      : next.pageOrder
                          .map((slot) => ({ ...slot, categoryIds: slot.categoryIds.filter((id) => ids.includes(id)) }))
                          .filter((slot) => slot.categoryIds.length > 0),
                });
              }}
            />
          )}
          {draft.currentStep === 2 && (
            <StepProducts
              categories={liveCategories}
              products={products}
              selectedCategoryIds={draft.selectedCategoryIds}
              excludedProductIds={draft.excludedProductIds}
              locale={locale}
              onChangeExcluded={(ids) => {
                const next = { ...draft, excludedProductIds: ids };
                setDraft({
                  ...next,
                  pageOrder:
                    next.layoutMode === "auto"
                      ? syncPageOrder(next, selectedCategoriesWithProducts(next, liveCategories, products, locale))
                      : next.pageOrder,
                });
              }}
            />
          )}
          {draft.currentStep === 3 && (
            <StepLayout
              layoutMode={draft.layoutMode}
              onLayoutMode={setLayoutMode}
              pageOrder={draft.pageOrder}
              categoryNames={categoryNames}
              categoryCount={packedCats.length}
              categorySizes={draft.categorySizes}
              onCategorySize={(id, size) => {
                const next = { ...draft, categorySizes: { ...draft.categorySizes, [id]: size } };
                setDraft({ ...next, pageOrder: syncPageOrder(next, selectedCategoriesWithProducts(next, liveCategories, products, locale)) });
              }}
              onMovePage={movePage}
              onMoveCategory={moveCategory}
            />
          )}
          {draft.currentStep === 4 && (
            <StepDesign
              draft={draft}
              logoUrl={draft.logoOverrideUrl || appSettings.logoUrl}
              hasOrderUrl={Boolean(orderUrl)}
              categoryNames={categoryNames}
              onChange={patch}
            />
          )}
          {draft.currentStep === 5 && (
            <StepPreview
              pages={built.pages}
              menuTemplate={built.menuTemplate}
              onJump={goTo}
              onExport={handleExport}
              exporting={exporting}
            />
          )}
          {exportError && <p className="mt-3 text-sm text-red-600">{exportError}</p>}
          {exportSuccess && <p className="mt-3 text-sm text-emerald-700">تم إنشاء ملف PDF بنجاح</p>}
          {exportWarning && <p className="mt-3 text-sm text-amber-700">{exportWarning}</p>}
        </div>

        {showSidePreview && previewPage && draft.currentStep !== 5 && (
          <aside className="hidden lg:block">
            <div className="sticky top-4 overflow-hidden rounded-2xl border border-beige-dark/15 bg-white p-3 shadow-sm">
              <p className="mb-2 text-center text-xs font-semibold text-coffee/50">معاينة مباشرة</p>
              <A4Stage>
                <MenuPageRenderer page={previewPage} menuTemplate={built.menuTemplate} mode="preview" />
              </A4Stage>
            </div>
          </aside>
        )}
      </div>

      <div className="sticky bottom-0 z-20 border-t border-beige-dark/15 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={draft.currentStep === 1}
            className="h-11 rounded-2xl px-4 text-sm font-semibold text-coffee disabled:opacity-30"
          >
            السابق
          </button>
          {draft.currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canContinue}
              className="h-11 min-w-[140px] rounded-2xl bg-[#E8A87C] px-6 text-sm font-bold text-white shadow-sm hover:bg-[#de9a6c] disabled:opacity-40"
            >
              متابعة
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || built.pages.length === 0}
              className="h-11 min-w-[140px] rounded-2xl bg-[#E8A87C] px-6 text-sm font-bold text-white shadow-sm hover:bg-[#de9a6c] disabled:opacity-40"
            >
              {exporting ? "جارٍ إنشاء ملف PDF..." : "تصدير PDF"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
