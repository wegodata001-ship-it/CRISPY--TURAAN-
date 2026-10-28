import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { roundMoney } from "@/lib/coupons/engine";
import { collectKitchenNotes } from "@/lib/product-builder/engine";
import type { SelectedModifier } from "@/types/modifiers";

export type CheckoutSelection = {
  groupId?: string;
  optionId?: string;
  quantity?: number;
};

export type CheckoutLineInput = {
  productId: string;
  quantity: number;
  notes?: string;
  selections?: CheckoutSelection[];
};

type PricedLine = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  basePrice: number;
  notes?: string;
  kitchenNotes?: string[];
  modifiers?: SelectedModifier[];
};

function nameFor(data: FirebaseFirestore.DocumentData, locale: "ar" | "he" | "en") {
  const he = data.nameHe || data.name_he;
  const ar = data.nameAr || data.name_ar;
  const en = data.nameEn || data.name_en;
  if (locale === "he") return String(he || ar || en || "");
  if (locale === "en") return String(en || he || ar || "");
  return String(ar || he || en || "");
}

export async function priceCheckoutItems(
  lines: CheckoutLineInput[],
  locale: "ar" | "he" | "en"
): Promise<{ ok: true; items: PricedLine[]; subtotal: number } | { ok: false; code: "PRICE_UNAVAILABLE" }> {
  if (!lines.length || lines.length > 40) return { ok: false, code: "PRICE_UNAVAILABLE" };
  const db = getAdminDb();
  const items: PricedLine[] = [];
  for (const line of lines) {
    const quantity = Math.floor(Number(line.quantity));
    if (!line.productId || quantity < 1 || quantity > 99) return { ok: false, code: "PRICE_UNAVAILABLE" };
    const productSnap = await db.collection(COLLECTIONS.products).doc(line.productId).get();
    if (!productSnap.exists) return { ok: false, code: "PRICE_UNAVAILABLE" };
    const product = productSnap.data() || {};
    if (product.active === false || product.available === false) return { ok: false, code: "PRICE_UNAVAILABLE" };
    const basePrice = roundMoney(Number(product.price));
    if (!Number.isFinite(basePrice) || basePrice < 0) return { ok: false, code: "PRICE_UNAVAILABLE" };
    const modifiers: SelectedModifier[] = [];
    let extras = 0;
    for (const selection of line.selections || []) {
      const optionId = String(selection.optionId || "");
      const optionQty = Math.floor(Number(selection.quantity || 1));
      if (!optionId || optionQty < 1 || optionQty > 20) return { ok: false, code: "PRICE_UNAVAILABLE" };
      const optionSnap = await db.collection(COLLECTIONS.modifierOptions).doc(optionId).get();
      if (!optionSnap.exists) return { ok: false, code: "PRICE_UNAVAILABLE" };
      const option = optionSnap.data() || {};
      if (option.active === false || option.archived === true) return { ok: false, code: "PRICE_UNAVAILABLE" };
      const overrideSnap = await db
        .collection(COLLECTIONS.productModifierOptions)
        .doc(`${line.productId}_${optionId}`)
        .get();
      const override = overrideSnap.exists ? overrideSnap.data()?.priceDeltaOverride : undefined;
      const priceDelta = roundMoney(override == null ? Number(option.priceDelta) || 0 : Number(override));
      extras += priceDelta * optionQty;
      const groupId = String(selection.groupId || option.groupId || "");
      const groupSnap = groupId ? await db.collection(COLLECTIONS.modifierGroups).doc(groupId).get() : null;
      const group = groupSnap?.exists ? groupSnap.data() || {} : {};
      modifiers.push({
        groupId,
        groupName: nameFor(group, locale),
        optionId,
        optionName: nameFor(option, locale),
        priceDelta,
        quantity: optionQty,
        kitchenNote: typeof option.kitchenNote === "string" ? option.kitchenNote : undefined,
      });
    }
    const unitPrice = roundMoney(basePrice + extras);
    const kitchenNotes = collectKitchenNotes(modifiers);
    items.push({
      productId: line.productId,
      productName: nameFor(product, locale) || line.productId,
      quantity,
      price: unitPrice,
      basePrice,
      notes: line.notes?.trim() || undefined,
      modifiers: modifiers.length ? modifiers : undefined,
      kitchenNotes: kitchenNotes.length ? kitchenNotes : undefined,
    });
  }
  const subtotal = roundMoney(items.reduce((sum, item) => sum + roundMoney(item.price * item.quantity), 0));
  return { ok: true, items, subtotal };
}
