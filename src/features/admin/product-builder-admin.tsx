"use client";

import { useState, useMemo } from "react";
import { Plus, Trash2, Eye, Loader2 } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useModifierGroups, useProductBuilderConfig, useProductModifierGroups } from "@/hooks/useModifiers";
import {
  linkProductModifierGroup,
  unlinkProductModifierGroup,
  reorderProductModifierGroups,
  updateProductModifierGroup,
} from "@/services/modifierService";
import { ProductBuilderPreview } from "@/features/catalog/product-builder";
import { SortableList } from "@/components/admin/sortable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ModifierGroup, ProductModifierGroup } from "@/types/modifiers";

export function ProductBuilderAdmin() {
  const { products, loading: productsLoading } = useProducts();
  const { groups } = useModifierGroups();
  const [productId, setProductId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saving, setSaving] = useState(false);

  const { links, loading: linksLoading } = useProductModifierGroups(productId || null);
  const { config } = useProductBuilderConfig(productId || null);

  const product = products.find((p) => p.id === productId);
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name_he.includes(search) ||
        p.name_en.toLowerCase().includes(q) ||
        p.name_ar.includes(search)
    );
  }, [products, search]);

  const linkedGroupIds = new Set(links.map((l) => l.groupId));
  const availableGroups = groups.filter((g) => !linkedGroupIds.has(g.id));

  const sortableItems = links
    .map((link) => ({
      id: link.id,
      link,
      group: groups.find((g) => g.id === link.groupId),
    }))
    .filter((x) => x.group) as { id: string; link: ProductModifierGroup; group: ModifierGroup }[];

  const handleLink = async () => {
    if (!productId || !selectedGroupId) return;
    setSaving(true);
    await linkProductModifierGroup({
      productId,
      groupId: selectedGroupId,
      sortOrder: links.length + 1,
      active: true,
    });
    setSaving(false);
    setLinkOpen(false);
    setSelectedGroupId("");
  };

  const handleReorder = async (
    items: { id: string; link: ProductModifierGroup; group: ModifierGroup }[]
  ) => {
    if (!productId) return;
    await reorderProductModifierGroups(productId, items.map((i) => i.link.id));
  };

  if (productsLoading) return <p className="text-sm text-coffee/50">Loading products…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Product Builder</h1>
        <p className="text-sm text-coffee/55">
          Assign modifier groups to each product. No hardcoded options — everything is configured here.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-beige-dark/25 bg-warm-white p-4 shadow-soft">
          <Label>Select product</Label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="mt-2"
          />
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className={`w-full rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                  productId === p.id ? "bg-turquoise/15 font-semibold text-turquoise" : "hover:bg-beige/40"
                }`}
              >
                {p.name_he || p.name_en}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {!product ? (
            <div className="rounded-2xl border border-dashed border-beige-dark/30 p-12 text-center text-sm text-coffee/50">
              Select a product to configure its modifier groups
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{product.name_he || product.name_en}</h2>
                  <p className="text-sm text-coffee/50">{links.length} groups linked</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPreviewOpen(true)} disabled={!config}>
                    <Eye className="h-4 w-4" /> Preview
                  </Button>
                  <Button onClick={() => setLinkOpen(true)} disabled={availableGroups.length === 0}>
                    <Plus className="h-4 w-4" /> Add group
                  </Button>
                </div>
              </div>

              {linksLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-coffee/40" />
              ) : (
                <SortableList
                  items={sortableItems}
                  onReorder={handleReorder}
                  className="space-y-2"
                  renderItem={({ link, group }, handle) => (
                    <div className="flex items-center gap-2 rounded-xl border border-beige-dark/20 bg-warm-white p-3">
                      {handle}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{group.name_he || group.name_en}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="outline">{link.selectionType ?? group.selectionType}</Badge>
                          <Badge variant="outline">{link.requirement ?? group.requirement}</Badge>
                          <Badge variant="outline">{link.displayType ?? group.displayType}</Badge>
                        </div>
                      </div>
                      <select
                        className="rounded-lg border px-2 py-1 text-xs"
                        value={link.requirement ?? ""}
                        onChange={(e) =>
                          void updateProductModifierGroup(link.id, {
                            requirement: e.target.value as "required" | "optional" | undefined,
                          })
                        }
                      >
                        <option value="">Default ({group.requirement})</option>
                        <option value="required">Required</option>
                        <option value="optional">Optional</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void unlinkProductModifierGroup(link.id)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                />
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add modifier group</DialogTitle></DialogHeader>
          <select
            className="w-full rounded-xl border px-3 py-2"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            <option value="">Choose group…</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name_he || g.name_en}</option>
            ))}
          </select>
          <Button onClick={handleLink} disabled={!selectedGroupId || saving} className="mt-3 w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link group"}
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Customer preview</DialogTitle></DialogHeader>
          {product && config && <ProductBuilderPreview product={product} config={config} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
