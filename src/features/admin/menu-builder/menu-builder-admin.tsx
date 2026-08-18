"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, Download, Eye, Loader2, Undo2, Redo2, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers/locale-provider";
import { useAllProducts, useAllCategories } from "@/hooks/useProducts";
import { getLocalizedName } from "@/lib/i18n/localized-content";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  getCategorySettings,
  saveCategorySettings,
  getProductSettings,
  getMenuPages,
  saveMenuPages,
} from "@/services/pdfMenuService";
import {
  addPage,
  autoArrangeWithLocks,
  changePageTemplate,
  deletePage,
  duplicatePage,
  getCategoryCapacity,
  hydratePagesFromRecords,
  moveCategoryToPage,
  movePage,
  reorderPages,
  serializePages,
  updatePageSettings,
} from "@/lib/pdf-menu/pagination-engine";
import { CategoriesPanel } from "./categories-panel";
import { PagePreview } from "./page-preview";
import { CategorySettingsPanel } from "./category-settings-panel";
import { CoverSettingsPanel } from "./cover-settings-panel";
import { PreviewModal } from "./preview-modal";
import { TemplateManager } from "./template-manager";
import { TemplatePickerModal } from "./template-picker-modal";
import { PageOrganizer } from "./page-organizer";
import { AddPageModal } from "./add-page-modal";
import { DuplicatePageModal } from "./duplicate-page-modal";
import { PageDesignPanel } from "./page-design-panel";
import type {
  ArrangeMode,
  MenuPage,
  PageCustomSettings,
  PageKind,
  PageTemplateId,
  PdfMenuCategorySetting,
  PdfMenuCategoryWithProducts,
  PdfMenuProductSetting,
  PdfMenuProductView,
  PdfMenuTemplate,
} from "@/types/pdf-menu";
import { DEFAULT_CATEGORY_SETTING } from "@/types/pdf-menu";
import { cn } from "@/lib/utils";
import { AdminModal, AdminModalHeader, AdminModalTitle, AdminModalBody, AdminModalFooter } from "@/features/admin/components/admin-modal";

type HistoryEntry = { pages: MenuPage[]; categorySettings: PdfMenuCategorySetting[]; arrangeMode: ArrangeMode };

export function MenuBuilderAdmin() {
  const { locale } = useLocale();
  const { products } = useAllProducts();
  const { categories } = useAllCategories();

  const [template, setTemplate] = useState<PdfMenuTemplate | null>(null);
  const [templates, setTemplates] = useState<PdfMenuTemplate[]>([]);
  const [categorySettings, setCategorySettings] = useState<PdfMenuCategorySetting[]>([]);
  const [productSettings, setProductSettings] = useState<PdfMenuProductSetting[]>([]);
  const [pages, setPages] = useState<MenuPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"categories" | "design" | "preview">("preview");
  const [centerMode, setCenterMode] = useState<"preview" | "organizer">("preview");
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showAddPage, setShowAddPage] = useState(false);
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [showAutoConfirm, setShowAutoConfirm] = useState(false);
  const [overflowMessage, setOverflowMessage] = useState<string | null>(null);
  const [layoutDebug, setLayoutDebug] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRecordsRef = useRef<Awaited<ReturnType<typeof getMenuPages>>>([]);
  const hydratedForRef = useRef<string | null>(null);

  const arrangeMode = template?.arrangeMode ?? "auto";

  const loadData = async () => {
    setLoading(true);
    try {
      const allTemplates = await getTemplates();
      setTemplates(allTemplates);
      let tmpl = allTemplates[0];
      if (!tmpl) {
        tmpl = await createTemplate("القائمة الرئيسية");
        setTemplates([tmpl]);
      }
      setTemplate(tmpl);
      const [catSettings, prodSettings, pageRecords] = await Promise.all([
        getCategorySettings(tmpl.id),
        getProductSettings(tmpl.id),
        getMenuPages(tmpl.id),
      ]);
      setCategorySettings(catSettings);
      setProductSettings(prodSettings);
      pendingRecordsRef.current = pageRecords;
      hydratedForRef.current = null;
    } catch (err) {
      console.warn("[MenuBuilder] Failed to load:", err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSelectMenuTemplate = async (tmpl: PdfMenuTemplate) => {
    setTemplate(tmpl);
    hydratedForRef.current = null;
    const [catSettings, prodSettings, pageRecords] = await Promise.all([
      getCategorySettings(tmpl.id),
      getProductSettings(tmpl.id),
      getMenuPages(tmpl.id),
    ]);
    setCategorySettings(catSettings);
    setProductSettings(prodSettings);
    pendingRecordsRef.current = pageRecords;
  };

  const mergedCategorySettings = useMemo(() => {
    if (!template) return [];
    const settingsMap = new Map(categorySettings.map((s) => [s.categoryId, s]));
    return categories
      .filter((c) => c.active)
      .map((cat, index) => {
        const existing = settingsMap.get(cat.id);
        if (existing) return existing;
        return {
          ...DEFAULT_CATEGORY_SETTING,
          id: "",
          templateId: template.id,
          categoryId: cat.id,
          sortOrder: index,
        } as PdfMenuCategorySetting;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, categorySettings, template]);

  const categoriesWithProducts = useMemo((): PdfMenuCategoryWithProducts[] => {
    return mergedCategorySettings.map((setting) => {
      const cat = categories.find((c) => c.id === setting.categoryId);
      const catProducts = products
        .filter((p) => p.categoryId === setting.categoryId && p.available && p.active)
        .map((p): PdfMenuProductView => {
          const prodSetting = productSettings.find((ps) => ps.productId === p.id);
          return {
            id: p.id,
            name: getLocalizedName(p, locale),
            description: locale === "ar" ? p.description_ar : locale === "he" ? p.description_he : p.description_en,
            price: p.price,
            image: p.image,
            visible: prodSetting?.visible ?? true,
            sortOrder: prodSetting?.sortOrder ?? p.sortOrder,
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);

      return {
        setting,
        category: {
          id: setting.categoryId,
          name: cat ? getLocalizedName(cat, locale) : setting.categoryId,
          image: cat?.image ?? "",
        },
        products: catProducts,
        computedSize: getCategoryCapacity(setting, catProducts.filter((p) => p.visible).length),
      };
    });
  }, [mergedCategorySettings, products, categories, productSettings, locale]);

  useEffect(() => {
    if (loading || !template) return;
    if (hydratedForRef.current === template.id) return;
    if (pendingRecordsRef.current.length === 0 && categoriesWithProducts.length === 0) return;
    const records = pendingRecordsRef.current;
    pendingRecordsRef.current = [];
    hydratedForRef.current = template.id;
    const next = hydratePagesFromRecords(records, categoriesWithProducts, template.arrangeMode ?? "auto", {
      includeCover: template.coverSettings.enabled,
      cover: template.coverSettings,
    });
    setPages(next);
    if (next[0]) setSelectedPageId(next[0].id);
  }, [loading, template, categoriesWithProducts]);

  const livePages = useMemo(() => overlayLiveCategories(pages, categoriesWithProducts), [pages, categoriesWithProducts]);

  const currentPage = livePages[currentIndex] ?? livePages.find((p) => p.id === selectedPageId) ?? null;

  const pushHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(JSON.parse(JSON.stringify(entry)) as HistoryEntry);
      return next.slice(-30);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [historyIndex]);

  const schedulePersist = useCallback((nextPages: MenuPage[], nextCats: PdfMenuCategorySetting[], mode: ArrangeMode) => {
    if (!template) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void (async () => {
        setSaving(true);
        try {
          await Promise.all([
            saveMenuPages(serializePages(nextPages, template.id)),
            saveCategorySettings(nextCats.filter((s) => s.id || s.pageSize !== "AUTO" || !s.visible)),
            updateTemplate(template.id, { arrangeMode: mode }),
          ]);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } catch (err) {
          console.error("[MenuBuilder] Save failed:", err);
        } finally {
          setSaving(false);
        }
      })();
    }, 800);
  }, [template]);

  const commitPages = useCallback((next: MenuPage[], mode: ArrangeMode = "manual") => {
    pushHistory({ pages: livePages, categorySettings, arrangeMode });
    setPages(next);
    if (template && mode !== arrangeMode) {
      setTemplate({ ...template, arrangeMode: mode });
    }
    schedulePersist(next, categorySettings, mode);
    setSaved(false);
  }, [livePages, categorySettings, arrangeMode, template, pushHistory, schedulePersist]);

  const undo = () => {
    if (historyIndex <= 0) return;
    const prev = history[historyIndex - 1];
    if (!prev) return;
    setPages(prev.pages);
    setCategorySettings(prev.categorySettings);
    if (template) setTemplate({ ...template, arrangeMode: prev.arrangeMode });
    setHistoryIndex((i) => i - 1);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    if (!next) return;
    setPages(next.pages);
    setCategorySettings(next.categorySettings);
    if (template) setTemplate({ ...template, arrangeMode: next.arrangeMode });
    setHistoryIndex((i) => i + 1);
  };

  const updateCategorySetting = useCallback((categoryId: string, updates: Partial<PdfMenuCategorySetting>) => {
    setCategorySettings((prev) => {
      const exists = prev.some((s) => s.categoryId === categoryId);
      const next = exists
        ? prev.map((s) => (s.categoryId === categoryId ? { ...s, ...updates } : s))
        : [...prev, { ...DEFAULT_CATEGORY_SETTING, id: "", templateId: template?.id ?? "", categoryId, sortOrder: prev.length, ...updates } as PdfMenuCategorySetting];
      schedulePersist(livePages, next, arrangeMode);
      return next;
    });
    setSaved(false);
  }, [template, livePages, arrangeMode, schedulePersist]);

  const reorderCategories = (newOrder: PdfMenuCategorySetting[]) => {
    const reordered = newOrder.map((s, i) => ({ ...s, sortOrder: i }));
    pushHistory({ pages: livePages, categorySettings, arrangeMode });
    setCategorySettings(reordered);
    if (arrangeMode === "auto") {
      const rebuilt = autoArrangeWithLocks(
        overlaySettings(categoriesWithProducts, reordered),
        livePages,
        { includeCover: template?.coverSettings.enabled, cover: template?.coverSettings }
      );
      setPages(rebuilt);
      schedulePersist(rebuilt, reordered, "auto");
    } else {
      schedulePersist(livePages, reordered, "manual");
    }
  };

  const handleDropCategory = (pageId: string, categoryId: string) => {
    const result = moveCategoryToPage(livePages, categoryId, pageId);
    if (!result.ok) {
      setOverflowMessage(
        result.reason === "overflow"
          ? "لا توجد مساحة كافية في هذه الصفحة"
          : result.reason === "cover"
            ? "لا يمكن إسقاط فئة على صفحة الغلاف"
            : "تعذر نقل الفئة"
      );
      return;
    }
    commitPages(result.pages, "manual");
  };

  const handleChangeDesign = (pageId: string) => {
    setSelectedPageId(pageId);
    const idx = livePages.findIndex((p) => p.id === pageId);
    if (idx >= 0) setCurrentIndex(idx);
    setShowTemplatePicker(true);
  };

  const handleSelectTemplate = (id: PageTemplateId) => {
    if (!selectedPageId) return;
    commitPages(changePageTemplate(livePages, selectedPageId, id), "manual");
  };

  const handleAddPage = (kind: PageKind, pageTemplateId?: string) => {
    commitPages(addPage(livePages, kind, { pageTemplateId: pageTemplateId as PageTemplateId | undefined }), "manual");
  };

  const handleAutoArrange = () => {
    const next = autoArrangeWithLocks(categoriesWithProducts, livePages, {
      includeCover: template?.coverSettings.enabled,
      cover: template?.coverSettings,
    });
    commitPages(next, "auto");
    setShowAutoConfirm(false);
  };

  const handleExportPdf = async () => {
    const { exportMenuPdf, PDF_EXPORT_USER_ERROR } = await import("./pdf-exporter");
    try {
      if (template) await exportMenuPdf(livePages, template, { debug: layoutDebug });
    } catch {
      window.alert(PDF_EXPORT_USER_ERROR);
    }
  };

  const handleUpdateCover = (updates: Record<string, unknown>) => {
    if (!template) return;
    const next = { ...template, coverSettings: { ...template.coverSettings, ...updates } as PdfMenuTemplate["coverSettings"] };
    setTemplate(next);
    void updateTemplate(template.id, { coverSettings: next.coverSettings });
  };
  const handleUpdateFooter = (updates: Record<string, unknown>) => {
    if (!template) return;
    const next = { ...template, footerSettings: { ...template.footerSettings, ...updates } as PdfMenuTemplate["footerSettings"] };
    setTemplate(next);
    void updateTemplate(template.id, { footerSettings: next.footerSettings });
  };
  const handleUpdateQr = (updates: Record<string, unknown>) => {
    if (!template) return;
    const next = { ...template, qrSettings: { ...template.qrSettings, ...updates } as PdfMenuTemplate["qrSettings"] };
    setTemplate(next);
    void updateTemplate(template.id, { qrSettings: next.qrSettings });
  };

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-turquoise" />
          <p className="mt-3 text-sm text-coffee/60">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const selectedCategory = categoriesWithProducts.find((c) => c.setting.categoryId === selectedCategoryId);
  const designPage = livePages.find((p) => p.id === selectedPageId) ?? currentPage;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-turquoise" />
          <div>
            <h1 className="text-xl font-bold text-dark-brown">{template?.name || "قائمة PDF"}</h1>
            <p className="text-xs text-coffee/50">
              {livePages.length} صفحات · {arrangeMode === "manual" ? "ترتيب يدوي" : "ترتيب تلقائي"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={historyIndex <= 0} className="h-9 w-9 p-0">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1} className="h-9 w-9 p-0">
            <Redo2 className="h-4 w-4" />
          </Button>
          <span className="text-xs text-coffee/50">{saving ? "جاري الحفظ..." : saved ? "✓ تم الحفظ" : ""}</span>
          {process.env.NODE_ENV !== "production" && (
            <Button
              variant={layoutDebug ? "turquoise" : "outline"}
              size="sm"
              onClick={() => setLayoutDebug((v) => !v)}
            >
              PDF Layout Debug
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowAutoConfirm(true)}>ترتيب تلقائي</Button>
          <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline ms-1.5">معاينة</span>
          </Button>
          <Button variant="turquoise" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline ms-1.5">تصدير PDF</span>
          </Button>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl bg-beige/40 p-1 lg:hidden">
        {(["categories", "design", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn("flex-1 rounded-lg py-2 text-xs font-semibold", activeTab === tab ? "bg-white text-dark-brown shadow-sm" : "text-coffee/60")}
          >
            {tab === "categories" ? "الفئات" : tab === "design" ? "التصميم" : "المعاينة"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr_300px]">
        <div className={cn("space-y-3", activeTab !== "categories" && "hidden lg:block")}>
          <TemplateManager
            templates={templates}
            activeTemplate={template}
            onSelect={handleSelectMenuTemplate}
            onRefresh={loadData}
          />
          <CategoriesPanel
            categories={categoriesWithProducts}
            pages={livePages}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onUpdate={updateCategorySetting}
            onReorder={reorderCategories}
          />
        </div>

        <div className={cn("min-w-0", activeTab !== "preview" && "hidden lg:block")}>
          <div className="mb-3 flex gap-1 rounded-xl bg-beige/40 p-1">
            <button
              type="button"
              onClick={() => setCenterMode("preview")}
              className={cn("flex-1 rounded-lg py-1.5 text-xs font-semibold", centerMode === "preview" ? "bg-white shadow-sm" : "text-coffee/60")}
            >
              المعاينة
            </button>
            <button
              type="button"
              onClick={() => setCenterMode("organizer")}
              className={cn("flex-1 rounded-lg py-1.5 text-xs font-semibold", centerMode === "organizer" ? "bg-white shadow-sm" : "text-coffee/60")}
            >
              <span className="inline-flex items-center gap-1"><LayoutGrid className="h-3 w-3" /> ترتيب الصفحات</span>
            </button>
          </div>

          {centerMode === "organizer" ? (
            <PageOrganizer
              pages={livePages}
              menuTemplate={template}
              selectedPageId={selectedPageId}
              onSelectPage={(id) => {
                setSelectedPageId(id);
                const idx = livePages.findIndex((p) => p.id === id);
                if (idx >= 0) setCurrentIndex(idx);
              }}
              onReorder={(from, to) => commitPages(reorderPages(livePages, from, to))}
              onMove={(id, dir) => commitPages(movePage(livePages, id, dir))}
              onChangeDesign={handleChangeDesign}
              onLock={(id) => {
                const page = livePages.find((p) => p.id === id);
                if (page) commitPages(updatePageSettings(livePages, id, { locked: !page.locked }));
              }}
              onDuplicate={(id) => { setDuplicateTargetId(id); setShowDuplicate(true); }}
              onDelete={(id) => commitPages(deletePage(livePages, id))}
            />
          ) : (
            <PagePreview
              pages={livePages}
              locale={locale}
              template={template}
              currentIndex={Math.min(currentIndex, Math.max(0, livePages.length - 1))}
              onCurrentIndexChange={(i) => {
                setCurrentIndex(i);
                if (livePages[i]) setSelectedPageId(livePages[i]!.id);
              }}
              onReorderPages={(from, to) => commitPages(reorderPages(livePages, from, to))}
              onMovePage={(id, dir) => commitPages(movePage(livePages, id, dir))}
              onChangeDesign={handleChangeDesign}
              onToggleLock={(id) => {
                const page = livePages.find((p) => p.id === id);
                if (page) commitPages(updatePageSettings(livePages, id, { locked: !page.locked }));
              }}
              onDuplicate={(id) => { setDuplicateTargetId(id); setShowDuplicate(true); }}
              onDelete={(id) => commitPages(deletePage(livePages, id))}
              onAddPage={() => setShowAddPage(true)}
              onDropCategory={handleDropCategory}
              debug={layoutDebug}
            />
          )}
        </div>

        <div className={cn("space-y-3", activeTab !== "design" && "hidden lg:block")}>
          {selectedCategory ? (
            <CategorySettingsPanel
              category={selectedCategory}
              onUpdate={(updates) => updateCategorySetting(selectedCategory.setting.categoryId, updates)}
            />
          ) : designPage ? (
            <PageDesignPanel
              page={designPage}
              onChange={(updates: Partial<PageCustomSettings>) =>
                commitPages(updatePageSettings(livePages, designPage.id, {
                  customSettings: { ...designPage.customSettings, ...updates },
                }))
              }
            />
          ) : template ? (
            <CoverSettingsPanel
              cover={template.coverSettings}
              footer={template.footerSettings}
              qr={template.qrSettings}
              onUpdateCover={handleUpdateCover}
              onUpdateFooter={handleUpdateFooter}
              onUpdateQr={handleUpdateQr}
            />
          ) : null}
        </div>
      </div>

      <PreviewModal open={showPreview} onClose={() => setShowPreview(false)} pages={livePages} template={template} onExport={handleExportPdf} debug={layoutDebug} />
      <TemplatePickerModal
        open={showTemplatePicker}
        onOpenChange={setShowTemplatePicker}
        selectedId={designPage?.pageTemplateId ?? "minimal"}
        recommendedId={designPage?.recommendedTemplateId}
        onSelect={handleSelectTemplate}
      />
      <AddPageModal open={showAddPage} onOpenChange={setShowAddPage} onAdd={handleAddPage} />
      <DuplicatePageModal
        open={showDuplicate}
        onOpenChange={setShowDuplicate}
        onConfirm={(mode) => {
          if (duplicateTargetId) commitPages(duplicatePage(livePages, duplicateTargetId, mode));
        }}
      />

      <AdminModal open={showAutoConfirm} onOpenChange={setShowAutoConfirm} size="sm">
        <AdminModalHeader onClose={() => setShowAutoConfirm(false)}>
          <AdminModalTitle>ترتيب تلقائي</AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody>
          <p className="text-sm text-coffee/70">سيتم إعادة ترتيب الصفحات تلقائيًا. الصفحات المقفلة لن تتغير. هل تريد المتابعة؟</p>
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="outline" size="sm" onClick={() => setShowAutoConfirm(false)}>إلغاء</Button>
          <Button variant="turquoise" size="sm" onClick={handleAutoArrange}>متابعة</Button>
        </AdminModalFooter>
      </AdminModal>

      <AdminModal open={Boolean(overflowMessage)} onOpenChange={() => setOverflowMessage(null)} size="sm">
        <AdminModalHeader onClose={() => setOverflowMessage(null)}>
          <AdminModalTitle>لا توجد مساحة</AdminModalTitle>
        </AdminModalHeader>
        <AdminModalBody>
          <p className="text-sm text-coffee/70">{overflowMessage}</p>
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="outline" size="sm" onClick={() => setOverflowMessage(null)}>إلغاء</Button>
          <Button variant="turquoise" size="sm" onClick={() => { setOverflowMessage(null); setShowAddPage(true); }}>فتح صفحة جديدة</Button>
        </AdminModalFooter>
      </AdminModal>
    </div>
  );
}

function overlayLiveCategories(pages: MenuPage[], live: PdfMenuCategoryWithProducts[]): MenuPage[] {
  const byId = new Map(live.map((c) => [c.setting.categoryId, c]));
  return pages.map((page) => {
    const cats = page.categories
      .map((c) => byId.get(c.setting.categoryId))
      .filter((c): c is PdfMenuCategoryWithProducts => Boolean(c));
    return {
      ...page,
      categories: cats,
      usedCapacity: cats.reduce((sum, c) => sum + c.computedSize, 0),
    };
  });
}

function overlaySettings(
  cats: PdfMenuCategoryWithProducts[],
  settings: PdfMenuCategorySetting[]
): PdfMenuCategoryWithProducts[] {
  const map = new Map(settings.map((s) => [s.categoryId, s]));
  return cats.map((c) => ({
    ...c,
    setting: map.get(c.setting.categoryId) ?? c.setting,
  }));
}
