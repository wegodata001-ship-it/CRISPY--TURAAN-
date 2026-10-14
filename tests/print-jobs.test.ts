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
import { classifyPrintFailure } from "@/lib/print-jobs/failure";
import { isAutoPrintHeld, STALE_AUTO_PRINT_MS, STALE_PRINT_JOB_IDS } from "@/lib/print-jobs/hold";
import {
  automaticPrintSkipReason,
  isAndroidPrintAgent,
  isBlockedPrinterHost,
  isExternalPrinter,
  kitchenClaimBlockReason,
} from "@/lib/printer/destination";

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

describe("external printer lock", () => {
  it("allows only the external printer and the Android agent", () => {
    expect(isExternalPrinter("192.168.1.80", 9100)).toBe(true);
    expect(isExternalPrinter("192.168.1.87", 9100)).toBe(false);
    expect(isExternalPrinter("192.168.1.80", 9101)).toBe(false);
    expect(isBlockedPrinterHost("192.168.1.87")).toBe(true);
    expect(kitchenClaimBlockReason({ printerIp: "192.168.1.87", printerPort: 9100, printerConnectionStatus: "connected" })).toBe("printer_not_allowed");
    expect(kitchenClaimBlockReason({ printerIp: "192.168.1.80", printerPort: 9100, printerConnectionStatus: "disconnected" })).toBe("printer_offline");
    expect(kitchenClaimBlockReason({ printerIp: "192.168.1.80", printerPort: 9100, printerConnectionStatus: "connected" })).toBeNull();
    expect(isAndroidPrintAgent("crispy-android-tablet")).toBe(true);
    expect(isAndroidPrintAgent("crispy-kitchen-pc")).toBe(false);
  });

  it("prints received cash orders and skips cancelled or failed payments", () => {
    expect(automaticPrintSkipReason({ status: "received", paymentStatus: "pending" })).toBeNull();
    expect(automaticPrintSkipReason({ status: "received", paymentStatus: "paid" })).toBeNull();
    expect(automaticPrintSkipReason({ status: "cancelled", paymentStatus: "pending" })).toBe(
      "order_cancelled"
    );
    expect(automaticPrintSkipReason({ status: "received", paymentStatus: "failed" })).toBe(
      "payment_not_collectable"
    );
    expect(automaticPrintSkipReason({ status: "received", paymentStatus: "refunded" })).toBe(
      "payment_not_collectable"
    );
  });
});

describe("print failure disposition", () => {
  it("keeps Android and Node connect failures in the queue", () => {
    expect(classifyPrintFailure("ECONNREFUSED")).toBe("retry_offline");
    expect(classifyPrintFailure("connect ETIMEDOUT 192.168.1.80:9100")).toBe("retry_offline");
    expect(classifyPrintFailure("Connect timed out")).toBe("retry_offline");
    expect(
      classifyPrintFailure("failed to connect to /192.168.1.80 (port 9100) after 8000ms")
    ).toBe("retry_offline");
    expect(classifyPrintFailure("Connection refused")).toBe("retry_offline");
  });

  it("does not auto-retry a ticket after the socket drops mid-send", () => {
    expect(classifyPrintFailure("Connection reset")).toBe("partial_send");
    expect(classifyPrintFailure("Broken pipe")).toBe("partial_send");
    expect(classifyPrintFailure("write EPIPE")).toBe("partial_send");
    expect(classifyPrintFailure("write ECONNRESET")).toBe("partial_send");
  });

  it("still limits unrelated printer errors", () => {
    expect(classifyPrintFailure("paper jam")).toBe("retry_limited");
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
    expect(receipt.orderType).toBe("pickup");
    expect(receipt.deliveryFee).toBeUndefined();
    expect(receipt.address).toBeUndefined();
    expect(receipt.items[0]?.unitPrice).toBe(14);
  });

  it("includes delivery address and fee only for delivery orders", () => {
    const receipt = buildReceiptModelFromOrder({
      ...sampleOrder,
      orderType: "delivery",
      deliveryAddress: "شارع يافا 10",
      delivery: 12,
      total: 56,
    });
    expect(receipt.orderType).toBe("delivery");
    expect(receipt.fulfillmentLabel).toBe("توصيل");
    expect(receipt.address).toMatch(/يافا/);
    expect(receipt.deliveryFee).toBe(12);
    expect(receipt.total).toBe(56);
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

describe("stale print jobs stay out of the automatic queue", () => {
  const now = Date.parse("2026-10-13T19:00:00Z");

  it("holds the 8 Oct jobs until an admin approves them", () => {
    for (const id of STALE_PRINT_JOB_IDS) {
      expect(isAutoPrintHeld({ id, status: "PENDING", createdAtMs: Date.parse("2026-10-08T11:53:00Z"), now })).toBe(true);
      expect(isAutoPrintHeld({ id, status: "PENDING", adminApproved: true, createdAtMs: Date.parse("2026-10-08T11:53:00Z"), now })).toBe(false);
    }
    expect(STALE_PRINT_JOB_IDS).toEqual([
      "NEW_ORDER_RX7fosRqYO1pQUI6sGIQ",
      "NEW_ORDER_yaZ7ZMAN5hj34vQKIDGq",
    ]);
  });

  it("holds any pending job older than 18 hours and leaves a new order claimable", () => {
    expect(
      isAutoPrintHeld({
        id: "NEW_ORDER_fresh",
        status: "PENDING",
        createdAtMs: now - STALE_AUTO_PRINT_MS - 1,
        now,
      })
    ).toBe(true);
    expect(
      isAutoPrintHeld({
        id: "NEW_ORDER_fresh",
        status: "PENDING",
        createdAtMs: now - 60_000,
        now,
      })
    ).toBe(false);
    expect(isAutoPrintHeld({ id: "NEW_ORDER_fresh", status: "DISMISSED", createdAtMs: now - 60_000, now })).toBe(true);
  });

  it("dismiss keeps the print job and does not delete the order", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/print-jobs/jobs.ts"), "utf8");
    expect(src).toContain('status: "DISMISSED"');
    expect(src).toContain("isAutoPrintHeld");
    const dismiss = src.slice(src.indexOf("export async function dismissPrintJob"), src.indexOf("export async function approvePrintJob"));
    expect(dismiss).not.toMatch(/orders/);
    expect(dismiss).not.toMatch(/\.delete\(/);
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
      "src/app/api/admin/printer/reprint/route.ts",
      "src/app/api/orders/notify-new/route.ts",
      "src/services/orderService.ts",
    ];
    for (const file of files) {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(src).not.toMatch(/sendRawToPrinter|withPrinterSocket|PRINTER_IP/);
    }
  });

  it("admin printer page queues jobs instead of opening LAN TCP", () => {
    const src = readFileSync(resolve(process.cwd(), "src/features/admin/printer-admin.tsx"), "utf8");
    expect(src).toMatch(/\/api\/admin\/printer\/test-print/);
    expect(src).toMatch(/\/api\/admin\/printer\/reprint/);
    expect(src).not.toMatch(/\/api\/printer\/status/);
  });
});
