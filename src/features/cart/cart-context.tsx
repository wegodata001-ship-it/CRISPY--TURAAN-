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

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
  deliveryFee: number;
  orderType: "pickup" | "delivery";
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
  | { type: "SET_COUPON"; code: string; discount: number }
  | { type: "SET_DELIVERY"; fee: number }
  | { type: "SET_ORDER_TYPE"; orderType: "pickup" | "delivery" };

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
  deliveryFee: number;
  total: number;
  couponCode: string;
  orderType: "pickup" | "delivery";
  addItem: (product: Product, options?: AddItemOptions) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  updateConfiguredItem: (
    lineId: string,
    options: Required<Pick<AddItemOptions, "selections" | "unitPrice" | "quantity">> &
      Pick<AddItemOptions, "notes">
  ) => void;
  applyCoupon: (code: string) => boolean;
  setOrderType: (type: "pickup" | "delivery") => void;
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
        ...action.state,
        isOpen: false,
      };
    case "CLEAR_CART":
      return { ...state, items: [] };
    case "OPEN_CART":
      return { ...state, isOpen: true };
    case "CLOSE_CART":
      return { ...state, isOpen: false };
    case "TOGGLE_CART":
      return { ...state, isOpen: !state.isOpen };
    case "SET_COUPON":
      return { ...state, couponCode: action.code, couponDiscount: action.discount };
    case "SET_DELIVERY":
      return { ...state, deliveryFee: action.fee };
    case "SET_ORDER_TYPE":
      return {
        ...state,
        orderType: action.orderType,
        deliveryFee: action.orderType === "delivery" ? 15 : 0,
      };
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    isOpen: false,
    couponCode: "",
    couponDiscount: 0,
    deliveryFee: 0,
    orderType: "pickup",
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
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
        deliveryFee: state.deliveryFee,
        orderType: state.orderType,
      })
    );
  }, [
    hydrated,
    state.couponCode,
    state.couponDiscount,
    state.deliveryFee,
    state.items,
    state.orderType,
  ]);

  const addItem = useCallback((product: Product, options?: AddItemOptions) => {
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
  const openCart = useCallback(() => dispatch({ type: "OPEN_CART" }), []);
  const closeCart = useCallback(() => dispatch({ type: "CLOSE_CART" }), []);
  const toggleCart = useCallback(() => dispatch({ type: "TOGGLE_CART" }), []);

  const applyCoupon = useCallback((code: string) => {
    const normalized = code.trim().toUpperCase();
    if (normalized === "MISHKAT10") {
      dispatch({ type: "SET_COUPON", code: normalized, discount: 0.1 });
      return true;
    }
    if (normalized === "WELCOME15") {
      dispatch({ type: "SET_COUPON", code: normalized, discount: 0.15 });
      return true;
    }
    return false;
  }, []);

  const setOrderType = useCallback((orderType: "pickup" | "delivery") => {
    dispatch({ type: "SET_ORDER_TYPE", orderType });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, item) =>
      sum + calculateLineTotal(item.unitPrice, item.quantity),
    0
  );
  const discount = subtotal * state.couponDiscount;
  const total = subtotal - discount + state.deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        itemCount,
        subtotal,
        discount,
        deliveryFee: state.deliveryFee,
        total,
        couponCode: state.couponCode,
        orderType: state.orderType,
        addItem,
        removeItem,
        updateQuantity,
        updateConfiguredItem,
        applyCoupon,
        setOrderType,
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
