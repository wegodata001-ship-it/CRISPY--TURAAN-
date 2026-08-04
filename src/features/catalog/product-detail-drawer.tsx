"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart, ShoppingBag, X, Minus, Plus, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatPrice, cn } from "@/lib/utils";
import { useCart } from "@/features/cart/cart-context";
import { useFavorites } from "@/hooks/useFavorites";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "./product-card";
import type { Product } from "@/types";

interface ProductDetailDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDrawer({ product, open, onOpenChange }: ProductDetailDrawerProps) {
  const { addItem, openCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { products } = useProducts({ active: true });
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [zoomed, setZoomed] = useState(false);

  if (!product) return null;

  const related = products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  const handleAdd = () => {
    if (!product.available) return;
    for (let i = 0; i < quantity; i++) addItem(product);
    openCart();
    onOpenChange(false);
    setQuantity(1);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name_ar, text: product.description, url: window.location.href });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader className="sr-only"><DrawerTitle>{product.name_ar}</DrawerTitle></DrawerHeader>
        <div className="overflow-y-auto pb-8">
          <div
            className={cn("relative w-full overflow-hidden transition-all", zoomed ? "aspect-square" : "aspect-[16/10]")}
            onClick={() => setZoomed(!zoomed)}
          >
            <Image src={product.image} alt={product.name_ar} fill className={cn("object-cover transition-transform", zoomed && "scale-110")} sizes="100vw" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-brown/60 via-transparent to-transparent" />
            <button onClick={() => onOpenChange(false)} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft"><X className="h-4 w-4" /></button>
            <div className="absolute top-4 left-4 flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft">
                <Heart className={cn("h-4 w-4", isFavorite(product.id) ? "fill-red-400 text-red-400" : "text-coffee/50")} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="flex h-9 w-9 items-center justify-center rounded-full bg-warm-white/90 shadow-soft">
                <Share2 className="h-4 w-4 text-coffee/50" />
              </button>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
              {product.isPopular && <Badge variant="popular">Popular</Badge>}
              {product.isNew && <Badge variant="new">New</Badge>}
            </div>
          </div>

          <div className="px-5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold" dir="rtl">{product.name_ar}</h2>
                <p className="text-sm text-coffee/60">{product.name_en}</p>
              </div>
              <p className="text-2xl font-bold text-turquoise">{formatPrice(product.price)}</p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-coffee/70" dir="rtl">{product.description}</p>

            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-coffee/50">Special notes</p>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="No onions, extra sauce..." />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <p className="text-sm font-medium">Quantity</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl border"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-lg font-bold">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center rounded-xl border"><Plus className="h-4 w-4" /></button>
              </div>
            </div>

            <Button variant="turquoise" size="lg" className="mt-6 w-full" onClick={handleAdd} disabled={!product.available}>
              <ShoppingBag className="h-4 w-4" />
              Add {quantity} to Cart · {formatPrice(product.price * quantity)}
            </Button>

            {related.length > 0 && (
              <div className="mt-8">
                <h3 className="mb-3 text-sm font-semibold" dir="rtl">מוצרים דומים</h3>
                <div className="grid grid-cols-2 gap-3">
                  {related.map((p) => (
                    <ProductCard key={p.id} product={p} compact onClick={() => {}} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
