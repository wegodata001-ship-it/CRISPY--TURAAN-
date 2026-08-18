"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, GripVertical, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PdfMenuCategoryWithProducts,
  PdfMenuCategorySetting,
  PdfPageSize,
  MenuPage,
} from "@/types/pdf-menu";

const SIZE_LABELS: Record<PdfPageSize, string> = {
  AUTO: "تلقائي",
  QUARTER: "¼",
  HALF: "½",
  THREE_QUARTERS: "¾",
  FULL: "كاملة",
};

const SIZE_OPTIONS: PdfPageSize[] = ["AUTO", "QUARTER", "HALF", "THREE_QUARTERS", "FULL"];

interface CategoriesPanelProps {
  categories: PdfMenuCategoryWithProducts[];
  pages: MenuPage[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (categoryId: string, updates: Partial<PdfMenuCategorySetting>) => void;
  onReorder: (settings: PdfMenuCategorySetting[]) => void;
}

export function CategoriesPanel({
  categories,
  pages,
  selectedId,
  onSelect,
  onUpdate,
  onReorder,
}: CategoriesPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const findPageForCategory = (categoryId: string): number | null => {
    for (const page of pages) {
      if (page.categories.some((c) => c.setting.categoryId === categoryId)) {
        return page.pageNumber;
      }
    }
    return null;
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    const categoryId = categories[index]?.setting.categoryId;
    if (categoryId) {
      e.dataTransfer.setData("application/x-mishkat-category", categoryId);
    }
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setDropIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dropIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const items = [...categories.map((c) => c.setting)];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(dropIndex, 0, moved);
    onReorder(items);
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  return (
    <div className="rounded-2xl border border-beige-dark/15 bg-white shadow-sm">
      <div className="border-b border-beige-dark/10 px-4 py-3">
        <h2 className="text-sm font-bold text-dark-brown">الفئات</h2>
        <p className="mt-0.5 text-[11px] text-coffee/50">
          {categories.filter((c) => c.setting.visible).length} / {categories.length} مفعّلة
        </p>
      </div>

      <div className="max-h-[calc(100vh-280px)] divide-y divide-beige-dark/8 overflow-y-auto" onDrop={handleDrop}>
        {categories.map((cat, index) => {
          const pageNum = findPageForCategory(cat.setting.categoryId);
          const isSelected = selectedId === cat.setting.categoryId;
          const visibleProducts = cat.products.filter((p) => p.visible).length;
          const isDragging = dragIndex === index;
          const isDropTarget = dropIndex === index;

          return (
            <div
              key={cat.setting.categoryId}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDragOver={(e) => handleDragOver(index, e)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(isSelected ? null : cat.setting.categoryId)}
              className={cn(
                "cursor-pointer px-3 py-3 transition-colors hover:bg-beige/30",
                isSelected && "bg-turquoise/5 ring-1 ring-inset ring-turquoise/20",
                isDragging && "opacity-40",
                isDropTarget && "border-t-2 border-turquoise"
              )}
            >
              <div className="flex items-start gap-2">
                <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-coffee/25" />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "truncate text-sm font-semibold",
                      cat.setting.visible ? "text-dark-brown" : "text-coffee/35 line-through"
                    )}>
                      {cat.category.name}
                    </span>
                    {cat.setting.locked && <Lock className="h-3 w-3 text-amber-500" />}
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-coffee/50">
                    <span>{visibleProducts} منتج</span>
                    <span>·</span>
                    <span>{SIZE_LABELS[cat.setting.pageSize]}</span>
                    {pageNum && (
                      <>
                        <span>·</span>
                        <span>ص {pageNum}</span>
                      </>
                    )}
                  </div>

                  {/* Page size selector */}
                  {isSelected && (
                    <div className="mt-2.5 flex gap-1">
                      {SIZE_OPTIONS.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdate(cat.setting.categoryId, { pageSize: size });
                          }}
                          className={cn(
                            "rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors",
                            cat.setting.pageSize === size
                              ? "bg-turquoise text-white"
                              : "bg-beige/60 text-coffee/60 hover:bg-beige"
                          )}
                        >
                          {SIZE_LABELS[size]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(cat.setting.categoryId, { visible: !cat.setting.visible });
                  }}
                  className={cn(
                    "rounded-lg p-1.5 transition-colors",
                    cat.setting.visible ? "text-turquoise hover:bg-turquoise/10" : "text-coffee/30 hover:bg-red-50"
                  )}
                >
                  {cat.setting.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
