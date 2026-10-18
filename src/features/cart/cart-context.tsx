"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product, CartItem } from "@/types";
import type { SelectedModifier } from "@/types/modifiers";
import {
  calculateUnitPrice,
  calculateLineTotal,
  selectionsFingerprint,
} from "@/lib/product-builder/engine";
import { NEW_ORDER_FULFILLMENT } from "@/lib/orders/fulfillment";
import { isViewOnlyMenuSurface } from "@/lib/domains/host-routing";
import { quoteDiscount, type CouponDiscountType } from "@/lib/coupons/engine";

export type AppliedCoupon = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: number;
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  coupon: AppliedCoupon | null;
}

type CartAction =
  | {
      type: "ADD_CONFIGURED_ITEM";
      product: Product;
      selections: SelectedModifier[];
      unitPrice: number;
      quantity: number;
      notes?: string;
      configurable?: boolean;
    }
  | { type: "REMOVE_ITEM"; lineId: string }
  | { type: "UPDATE_QUANTITY"; lineId: string; quantity: number }
  | {
      type: "UPDATE_CONFIGURED_ITEM";
      lineId: string;
      selections: SelectedModifier[];
      unitPrice: number;
      quantity: number;
      notes?: string;
    }
  | { type: "HYDRATE"; state: Partial<CartState> }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "SET_COUPON"; coupon: AppliedCoupon | null };

interface AddItemOptions {
  selections?: SelectedModifier[];
  unitPrice?: number;
  notes?: string;
  quantity?: number;
  configurable?: boolean;
}

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  discount: number;
  /** Always 0 — business is pickup-only. Kept for UI compatibility. */
  deliveryFee: number;
  total: number;
  coupon: AppliedCoupon | null;
  /** Always pickup — business does not offer delivery. */
  orderType: typeof NEW_ORDER_FULFILLMENT;
  addItem: (product: Product, options?: AddItemOptions) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateConfiguredItem: (
    lineId: string,
    options: Required<Pick<AddItemOptions, "selections" | "unitPrice" | "quantity">> &
      Pick<AddItemOptions, "notes">
  ) => void;
  applyCoupon: (
    code: string,
    locale: "ar" | "he" | "en"
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  removeCoupon: () => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const CART_STORAGE_KEY = "mishkat-cart-v2";

function newLineId(
  product: Product,
  selections: SelectedModifier[],
  notes?: string
): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return selectionsFingerprint(product.id, selections, notes) + Date.now();
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_CONFIGURED_ITEM": {
      const fingerprint = selectionsFingerprint(
        action.product.id,
        action.selections,
        action.notes
      );
      const existing = state.items.find(
        (i) =>
          selectionsFingerprint(i.product.id, i.selections, i.notes) === fingerprint
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.lineId === existing.lineId
              ? { ...i, quantity: i.quantity + action.quantity }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            lineId: newLineId(action.product, action.selections, action.notes),
            product: action.product,
            quantity: action.quantity,
            selections: action.selections,
            unitPrice: action.unitPrice,
            notes: action.notes,
            configurable: action.configurable,
          },
        ],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.lineId !== action.lineId),
      };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.lineId !== action.lineId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.lineId === action.lineId ? { ...i, quantity: action.quantity } : i
        ),
      };
    }
    case "UPDATE_CONFIGURED_ITEM":
      return {
        ...state,
        items: state.items.map((item) =>
          item.lineId === action.lineId
            ? {
                ...item,
                selections: action.selections,
                unitPrice: action.unitPrice,
                quantity: action.quantity,
                notes: action.notes,
              }
            : item
        ),
      };
    case "HYDRATE":
      return {
        ...state,
        items: Array.isArray(action.state.items) ? action.state.items : state.items,
        coupon: action.state.coupon?.code ? action.state.coupon : null,
        isOpen: false,
      };
    case "CLEAR_CART":
      return { ...state, items: [], coupon: null };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    case "TOGGLE_CART":
      return { ...state, isOpen: !state.isOpen };
    case "SET_COUPON":
      return { ...state, coupon: action.coupon };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    coupon: null,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CartState>;
        if (Array.isArray(saved.items)) {
          dispatch({ type: "HYDRATE", state: saved });
        }
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: state.items,
        coupon: state.coupon,
      })
    );
  }, [hydrated, state.coupon, state.items]);

  const addItem = useCallback((product: Product, options?: AddItemOptions) => {
    if (
      typeof window !== "undefined" &&
      isViewOnlyMenuSurface(window.location.hostname, window.location.pathname)
    ) {
      return;
    }
    const selections = options?.selections ?? [];
    const unitPrice =
      options?.unitPrice ?? calculateUnitPrice(product.price, selections);
    dispatch({
      type: "ADD_CONFIGURED_ITEM",
      product,
      selections,
      unitPrice,
      quantity: options?.quantity ?? 1,
      notes: options?.notes,
      configurable: options?.configurable,
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    dispatch({ type: "REMOVE_ITEM", lineId });
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    dispatch({ type: "UPDATE_QUANTITY", lineId, quantity });
  }, []);

  const updateConfiguredItem = useCallback(
    (
      lineId: string,
      options: Required<
        Pick<AddItemOptions, "selections" | "unitPrice" | "quantity">
      > &
        Pick<AddItemOptions, "notes">
    ) => {
      dispatch({
        type: "UPDATE_CONFIGURED_ITEM",
        lineId,
        selections: options.selections,
        unitPrice: options.unitPrice,
        quantity: options.quantity,
        notes: options.notes,
      });
    },
    []
  );

  const clearCart = useCallback(() => dispatch({ type: "CLEAR_CART" }), []);
  const openCart = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      isViewOnlyMenuSurface(window.location.hostname, window.location.pathname)
    ) {
      return;
    }
    dispatch({ type: "OPEN_CART" });
  }, []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE_CART" }), []);
  const toggleCart = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      isViewOnlyMenuSurface(window.location.hostname, window.location.pathname)
    ) {
      return;
    }
    dispatch({ type: "TOGGLE_CART" });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) =>
      sum + calculateLineTotal(item.unitPrice, item.quantity),
    0
  );
  const priced = state.coupon
    ? quoteDiscount(subtotal, state.coupon.discountType, state.coupon.discountValue)
    : { discountAmount: 0, total: subtotal };
  const discount = priced.discountAmount;
  const deliveryFee = 0;
  const total = priced.total;

  const applyCoupon = useCallback(async (code: string, locale: "ar" | "he" | "en") => {
    const response = await fetch("/api/coupons/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, subtotal, locale }),
    });
    const payload = (await response.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      quote?: { code: string; discountType: CouponDiscountType; discountValue: number };
    } | null;
    if (!response.ok || !payload?.ok || !payload.quote) {
      return { ok: false as const, message: payload?.message || "الكوبون غير صالح" };
    }
    dispatch({
      type: "SET_COUPON",
      coupon: {
        code: payload.quote.code,
        discountType: payload.quote.discountType,
        discountValue: payload.quote.discountValue,
      },
    });
    return { ok: true as const };
  }, [subtotal]);

  const removeCoupon = useCallback(() => {
    dispatch({ type: "SET_COUPON", coupon: null });
  }, []);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        itemCount,
        subtotal,
        discount,
        deliveryFee,
        total,
        coupon: state.coupon,
        orderType: NEW_ORDER_FULFILLMENT,
        addItem,
        removeItem,
        updateQuantity,
        updateConfiguredItem,
        applyCoupon,
        removeCoupon,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
