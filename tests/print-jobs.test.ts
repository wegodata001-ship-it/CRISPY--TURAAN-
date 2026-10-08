import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { newOrderPrintJobId, parsePrintLocale, printJobUniqueKey } from "@/lib/print-jobs/ids";
import { isAutoPrintNewOrdersEnabled } from "@/lib/print-jobs/config";
import {
  MAX_PRINT_ATTEMPTS,
  PRINT_RETRY_DELAYS_MS,
} from "@/lib/print-jobs/types";
import {
  buildReceiptModelFromOrder,
  paymentMethodLabel,
  pickupLabel,
} from "@/lib/print-jobs/receipt-model";
import { buildTestReceiptModel } from "@/lib/print-jobs/test-receipt";
import { wrapRasterReceipt } from "@/lib/printer/raster";
import { escCut } from "@/lib/printer/escpos";

const sampleOrder = {
  orderNumber: "MC-2026-1234",
  customerName: "أحمد خليل",
  customerPhone: "052-1234567",
  notes: "بدون سكر\nاستلام ذاتي من المحل",
  total: 44,
  subtotal: 44,
  discount: 0,
  delivery: 12,
  paymentMethod: "cash",
  locale: "ar" as const,
  createdAt: "2026-09-20T12:35:00+03:00",
  items: [
    {
      productId: "c1",
      productName: "كابتشينو",
      quantity: 2,
      price: 14,
      modifiers: [
        {
          groupId: "size",
          groupName: "الحجم",
          optionId: "large",
          optionName: "كبير",
          priceDelta: 2,
          quantity: 1,
        },
        {
          groupId: "milk",
          groupName: "الحليب",
          optionId: "soy",
          optionName: "حليب صويا",
          priceDelta: 0,
          quantity: 1,
        },
      ],
    },
    {
      productId: "cr1",
      productName: "كرواسون",
      quantity: 1,
      price: 16,
      notes: "بدون زبدة",
    },
  ],
};

describe("print job uniqueness", () => {
  it("uses a stable NEW_ORDER document id per order", () => {
    expect(newOrderPrintJobId("abc")).toBe("NEW_ORDER_abc");
    expect(printJobUniqueKey("abc", "NEW_ORDER")).toBe("abc:NEW_ORDER");
    expect(printJobUniqueKey("abc", "REPRINT")).not.toBe(printJobUniqueKey("abc", "NEW_ORDER"));
  });
});

describe("print auto-gate and retry", () => {
  it("gates automatic new-order printing on PRINT_AUTO_NEW_ORDERS", () => {
    expect(isAutoPrintNewOrdersEnabled()).toBe(process.env.PRINT_AUTO_NEW_ORDERS === "true");
  });

  it("retries twice then fails", () => {
    expect(MAX_PRINT_ATTEMPTS).toBe(3);
    expect(PRINT_RETRY_DELAYS_MS[1]).toBe(10_000);
    expect(PRINT_RETRY_DELAYS_MS[2]).toBe(30_000);
  });
});

describe("receipt model", () => {
  it("prints pickup only, modifiers, qty, and stored total", () => {
    const receipt = buildReceiptModelFromOrder(sampleOrder);
    expect(receipt.locale).toBe("ar");
    expect(receipt.pickupLabel).toBe("استلام ذاتي");
    expect(receipt.paymentLabel).toBe("نقداً");
    expect(receipt.total).toBe(44);
    expect(receipt.items).toHaveLength(2);
    expect(receipt.items[0]?.quantity).toBe(2);
    expect(receipt.items[0]?.lineTotal).toBe(28);
    expect(receipt.items[0]?.modifiers.map((m) => m.label).join(" ")).toMatch(/كبير/);
    expect(receipt.items[0]?.modifiers.map((m) => m.label).join(" ")).toMatch(/صويا/);
    expect(receipt.items[1]?.notes).toMatch(/زبدة/);
    expect(JSON.stringify(receipt)).not.toMatch(/delivery|משלוח|توصيل|shipping/i);
    expect(receipt.notes).toBe("بدون سكر");
    expect(receipt.orderNumber).toBe("#MC-2026-1234");
  });

  it("uses Hebrew / English pickup and payment labels", () => {
    expect(pickupLabel("he")).toBe("איסוף עצמי");
    expect(pickupLabel("en")).toBe("Pickup");
    expect(paymentMethodLabel("card", "he")).toBe("כרטיס");
    expect(paymentMethodLabel("card", "en")).toBe("Card");
    expect(paymentMethodLabel("card", "ar")).toBe("بطاقة");
  });

  it("builds localized test payloads with modifiers", () => {
    const ar = buildTestReceiptModel("ar");
    const he = buildTestReceiptModel("he");
    const en = buildTestReceiptModel("en");
    expect(ar.headline).toBe("طلب جديد");
    expect(he.headline).toBe("הזמנה חדשה");
    expect(en.headline).toBe("NEW ORDER");
    expect(ar.items[0]?.modifiers.length).toBeGreaterThan(0);
    expect(ar.total).toBe(62);
    expect(he.pickupLabel).toBe("איסוף עצמי");
    expect(en.pickupLabel).toBe("Pickup");
  });

  it("parses locale with Arabic default", () => {
    expect(parsePrintLocale("he")).toBe("he");
    expect(parsePrintLocale("nope")).toBe("ar");
  });
});

describe("raster cut option", () => {
  it("omits cutter bytes when cut is none", () => {
    const raster = Buffer.from([0x1d, 0x76, 0x30, 0x00]);
    const withCut = wrapRasterReceipt(raster, "full");
    const noCut = wrapRasterReceipt(raster, "none");
    expect(withCut.includes(escCut("full"))).toBe(true);
    expect(noCut.includes(escCut("full"))).toBe(false);
  });
});

describe("cloud print APIs stay off the LAN printer", () => {
  it("does not import TCP printer from job/admin print routes", () => {
    const files = [
      "src/app/api/print-jobs/enqueue-new/route.ts",
      "src/app/api/print-agent/jobs/claim/route.ts",
      "src/app/api/admin/printer/status/route.ts",
      "src/app/api/admin/printer/test-print/route.ts",
      "src/app/api/orders/notify-new/route.ts",
      "src/services/orderService.ts",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src).not.toMatch(/sendRawToPrinter|withPrinterSocket|PRINTER_IP/);
    }
  });
});
