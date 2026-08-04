"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import type { Product, CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string;
  couponDiscount: number;
  deliveryFee: number;
  orderType: "pickup" | "delivery";
}

type CartAction =
  | { type: "ADD_ITEM"; product: Product }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "CLEAR_CART" }
  | { type: "OPEN_CART" }
  | { type: "CLOSE_CART" }
  | { type: "TOGGLE_CART" }
  | { type: "SET_COUPON"; code: string; discount: number }
  | { type: "SET_DELIVERY"; fee: number }
  | { type: "SET_ORDER_TYPE"; orderType: "pickup" | "delivery" };

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
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  applyCoupon: (code: string) => boolean;
  setOrderType: (type: "pickup" | "delivery") => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find(
        (i) => i.product.id === action.product.id
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { product: action.product, quantity: 1 }],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((i) => i.product.id !== action.productId),
      };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.product.id !== action.productId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.product.id === action.productId
            ? { ...i, quantity: action.quantity }
            : i
        ),
      };
    }
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

  const addItem = useCallback((product: Product) => {
    dispatch({ type: "ADD_ITEM", product });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", productId });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
    },
    []
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const openCart = useCallback(() => {
    dispatch({ type: "OPEN_CART" });
  }, []);

  const closeCart = useCallback(() => {
    dispatch({ type: "CLOSE_CART" });
  }, []);

  const toggleCart = useCallback(() => {
    dispatch({ type: "TOGGLE_CART" });
  }, []);

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
  const subtotal = state.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
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
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
