import { describe, expect, it } from "vitest";
import { buildTestReceiptModel } from "@/lib/print-jobs/test-receipt";
import { buildReceiptPrintPayload } from "@/lib/printer/receipt-raster";
import { escInit } from "@/lib/printer/escpos";

describe("kitchen receipt raster", () => {
  it("renders Arabic test receipt as ESC/POS raster", async () => {
    const buf = await buildReceiptPrintPayload(buildTestReceiptModel("ar"), "none");
    expect(buf.includes(escInit())).toBe(true);
    expect(buf.includes(Buffer.from([0x1d, 0x76, 0x30]))).toBe(true);
    expect(buf.length).toBeGreaterThan(800);
  }, 20_000);

  it("renders Hebrew test receipt as ESC/POS raster", async () => {
    const buf = await buildReceiptPrintPayload(buildTestReceiptModel("he"), "none");
    expect(buf.includes(Buffer.from([0x1d, 0x76, 0x30]))).toBe(true);
    expect(buf.length).toBeGreaterThan(800);
  }, 20_000);
});
