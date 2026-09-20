import { calculateLineTotal } from "@/lib/product-builder/engine";
import type { PrintLocale, ReceiptItemLine, ReceiptModel } from "@/lib/print-jobs/types";
import { parsePrintLocale } from "@/lib/print-jobs/ids";
import type { FirestoreOrder, FirestoreOrderItem } from "@/types/firestore";
import type { Order, OrderItem } from "@/types";

const COPY: Record<
  PrintLocale,
  {
    brand: string;
    brandSecondary: string;
    headline: string;
    cash: string;
    card: string;
    pickup: string;
    paymentUnknown: string;
  }
> = {
  ar: {
    brand: "مشكا",
    brandSecondary: "MISHKAH CAFE",
    headline: "طلب جديد",
    cash: "نقداً",
    card: "بطاقة",
    pickup: "استلام ذاتي",
    paymentUnknown: "غير محدد",
  },
  he: {
    brand: "MISHKAH CAFE",
    brandSecondary: "משכא",
    headline: "הזמנה חדשה",
    cash: "מזומן",
    card: "כרטיס",
    pickup: "איסוף עצמי",
    paymentUnknown: "לא צוין",
  },
  en: {
    brand: "MISHKAH CAFE",
    brandSecondary: "مشكا",
    headline: "NEW ORDER",
    cash: "Cash",
    card: "Card",
    pickup: "Pickup",
    paymentUnknown: "Unspecified",
  },
};

const NOTE_NOISE =
  /^(איסוף עצמי|استلام ذاتي|pickup from the store|pickup only|الطلبات للاستلام)/i;
const PHONE_NOISE = /^(טלפון|الهاتف|phone)\s*:/i;

function localeTags(locale: PrintLocale): string {
  if (locale === "he") return "he-IL";
  if (locale === "en") return "en-GB";
  return "ar-IL";
}

export function paymentMethodLabel(method: string | undefined, locale: PrintLocale): string {
  const copy = COPY[locale];
  const key = (method || "").trim().toLowerCase();
  if (key === "cash" || key === "מזומן" || key === "نقداً") return copy.cash;
  if (key === "card" || key === "כרטיס" || key === "بطاقة") return copy.card;
  return method?.trim() || copy.paymentUnknown;
}

export function pickupLabel(locale: PrintLocale): string {
  return COPY[locale].pickup;
}

export function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} ₪`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatReceiptDateParts(
  iso: string,
  locale: PrintLocale
): { date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { date: iso, time: "" };
  }
  try {
    const date = new Intl.DateTimeFormat(localeTags(locale), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(d);
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return { date, time };
  } catch {
    return {
      date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    };
  }
}

function displayOrderNumber(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function customerNotes(raw: string | undefined, phone?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !NOTE_NOISE.test(line))
    .filter((line) => !PHONE_NOISE.test(line))
    .filter((line) => !phone || !line.includes(phone));
  return lines.length ? lines.join("\n") : undefined;
}

function mapItem(item: OrderItem | FirestoreOrderItem): ReceiptItemLine {
  const modifiers = (item.modifiers ?? []).map((mod) => {
    const qty = mod.quantity > 1 ? `${mod.quantity} × ` : "";
    const group = mod.groupName?.trim();
    const name = mod.optionName?.trim() || "";
    const label = group && name && !name.includes(group) ? `${group}: ${qty}${name}` : `${qty}${name}`;
    return { label: label.trim() };
  });

  const extras = [
    item.notes?.trim(),
    ...(item.kitchenNotes ?? []).map((n) => n.trim()).filter(Boolean),
  ].filter((value): value is string => Boolean(value));

  return {
    quantity: item.quantity,
    name: item.productName,
    lineTotal: calculateLineTotal(item.price, item.quantity),
    modifiers,
    notes: extras.length ? extras.join(" · ") : undefined,
  };
}

type OrderLike = {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  items: Array<OrderItem | FirestoreOrderItem>;
  notes?: string;
  total: number;
  subtotal?: number;
  discount?: number;
  paymentMethod?: string;
  locale?: string;
  createdAt: string;
};

export function buildReceiptModelFromOrder(
  order: OrderLike,
  localeOverride?: PrintLocale
): ReceiptModel {
  const locale = localeOverride ?? parsePrintLocale(order.locale);
  const copy = COPY[locale];
  const { date, time } = formatReceiptDateParts(order.createdAt, locale);
  const discount = order.discount && order.discount > 0 ? order.discount : undefined;
  const subtotal = discount && order.subtotal && order.subtotal > 0 ? order.subtotal : undefined;

  return {
    locale,
    brand: copy.brand,
    brandSecondary: copy.brandSecondary,
    headline: copy.headline,
    orderNumber: displayOrderNumber(order.orderNumber),
    date,
    time,
    customerName: order.customerName,
    customerPhone: order.customerPhone?.trim() || undefined,
    items: (order.items ?? []).map(mapItem),
    notes: customerNotes(order.notes, order.customerPhone),
    subtotal,
    discount,
    total: order.total,
    paymentLabel: paymentMethodLabel(order.paymentMethod, locale),
    pickupLabel: copy.pickup,
    createdTime: time,
  };
}

export function buildReceiptModelFromFirestoreOrder(
  data: FirestoreOrder,
  createdAtIso: string,
  localeOverride?: PrintLocale
): ReceiptModel {
  return buildReceiptModelFromOrder(
    {
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      items: data.items,
      notes: data.notes,
      total: data.total,
      subtotal: data.subtotal,
      discount: data.discount,
      paymentMethod: data.paymentMethod,
      locale: data.locale,
      createdAt: createdAtIso,
    },
    localeOverride
  );
}

export function buildReceiptModelFromDomainOrder(
  order: Order,
  localeOverride?: PrintLocale
): ReceiptModel {
  return buildReceiptModelFromOrder(order, localeOverride);
}

export function receiptCopy(locale: PrintLocale) {
  return COPY[locale];
}

/** Labels used by the raster renderer (not product data). */
export function receiptUiLabels(locale: PrintLocale) {
  if (locale === "he") {
    return {
      customer: "לקוח",
      phone: "טלפון",
      items: "פריטים",
      notes: "הערות",
      total: "סה״כ",
      payment: "תשלום",
      createdAt: "נוצר בשעה",
      date: "תאריך",
      time: "שעה",
      testBanner: "הדפסת בדיקה",
      discount: "הנחה",
      subtotal: "ביניים",
    };
  }
  if (locale === "en") {
    return {
      customer: "Customer",
      phone: "Phone",
      items: "ITEMS",
      notes: "Notes",
      total: "TOTAL",
      payment: "Payment",
      createdAt: "Order created at",
      date: "Date",
      time: "Time",
      testBanner: "TEST PRINT",
      discount: "Discount",
      subtotal: "Subtotal",
    };
  }
  return {
    customer: "الزبون",
    phone: "الهاتف",
    items: "الأصناف",
    notes: "ملاحظات",
    total: "المجموع",
    payment: "طريقة الدفع",
    createdAt: "وقت الطلب",
    date: "التاريخ",
    time: "الوقت",
    testBanner: "طباعة تجريبية",
    discount: "خصم",
    subtotal: "المجموع الفرعي",
  };
}
