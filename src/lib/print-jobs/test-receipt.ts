import type { PrintLocale, ReceiptModel } from "@/lib/print-jobs/types";
import { formatReceiptDateParts, receiptCopy } from "@/lib/print-jobs/receipt-model";

const TEST_CREATED_AT = "2026-09-20T12:35:00+03:00";

export function buildTestReceiptModel(locale: PrintLocale = "ar"): ReceiptModel {
  const copy = receiptCopy(locale);
  const { date, time } = formatReceiptDateParts(TEST_CREATED_AT, locale);

  const names =
    locale === "he"
      ? {
          customer: "אחמד חליל",
          cappuccino: "קפוצ׳ינו",
          croissant: "קרואסון",
          ice: "קפה קר",
          large: "גדול",
          soy: "חלב סויה",
          noSugar: "בלי סוכר",
          withIce: "עם קרח",
          notes: "בלי סוכר\nקרח נוסף",
        }
      : locale === "en"
        ? {
            customer: "Ahmad Khalil",
            cappuccino: "Cappuccino",
            croissant: "Croissant",
            ice: "Ice Coffee",
            large: "Large",
            soy: "Soy milk",
            noSugar: "No sugar",
            withIce: "With ice",
            notes: "No sugar\nExtra ice",
          }
        : {
            customer: "أحمد خليل",
            cappuccino: "كابتشينو",
            croissant: "كرواسون",
            ice: "قهوة مثلجة",
            large: "كبير",
            soy: "حليب صويا",
            noSugar: "بدون سكر",
            withIce: "مع ثلج",
            notes: "بدون سكر\nثلج إضافي",
          };

  return {
    locale,
    brand: copy.brand,
    brandSecondary: copy.brandSecondary,
    headline: copy.headline,
    orderNumber: "#TEST-001",
    date,
    time,
    customerName: names.customer,
    customerPhone: "052-1234567",
    items: [
      {
        quantity: 2,
        name: names.cappuccino,
        lineTotal: 28,
        modifiers: [{ label: names.large }, { label: names.soy }, { label: names.noSugar }],
      },
      {
        quantity: 1,
        name: names.croissant,
        lineTotal: 16,
        modifiers: [],
      },
      {
        quantity: 1,
        name: names.ice,
        lineTotal: 18,
        modifiers: [{ label: names.withIce }],
      },
    ],
    notes: names.notes,
    total: 62,
    paymentLabel: copy.cash,
    pickupLabel: copy.pickup,
    createdTime: time,
    isTest: true,
  };
}
