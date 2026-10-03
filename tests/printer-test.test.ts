import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildAsciiTestPayload, buildCutterTestPayload } from "@/lib/printer/test-payloads";
import { escCut, escInit } from "@/lib/printer/escpos";

describe("printer test isolation", () => {
  it("builds ESC/POS ASCII payload with init and cut", () => {
    const buf = buildAsciiTestPayload(new Date("2026-08-22T12:00:00Z"));
    expect(buf.includes(escInit())).toBe(true);
    expect(buf.includes(Buffer.from("CRISPY PRINTER TEST", "ascii"))).toBe(true);
    expect(buf.includes(escCut("full"))).toBe(true);
  });

  it("builds a cutter-only payload", () => {
    const buf = buildCutterTestPayload();
    expect(buf.includes(Buffer.from("CUTTER TEST", "ascii"))).toBe(true);
    expect(buf.includes(escCut("full"))).toBe(true);
  });

  it("does not wire printer routes into order services", () => {
    const orderSvc = readFileSync(resolve(process.cwd(), "src/services/orderService.ts"), "utf8");
    expect(orderSvc).not.toMatch(/sendRawToPrinter|escpos|PRINTER_IP/);
  });

  it("guards printer APIs for production", () => {
    const status = readFileSync(
      resolve(process.cwd(), "src/app/api/printer/status/route.ts"),
      "utf8"
    );
    expect(status).toMatch(/export const runtime = "nodejs"/);
    expect(status).toMatch(/isPrinterTestAllowed/);
    expect(status).toMatch(/requireAdmin/);
  });
});
