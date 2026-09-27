import type { PrintLocale } from "./types";

export function formatMoney(amount: number): string {
  return `${amount.toFixed(2)} ₪`;
}

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
