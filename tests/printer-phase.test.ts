import { describe, expect, it } from "vitest";
import {
  buildArabicTextTestPayload,
  buildAsciiTestPayload,
  buildCutterTestPayload,
  buildHebrewTestPayload,
} from "@/lib/printer/test-payloads";
import { buildArabicRasterTestPayload } from "@/lib/printer/arabic-raster";
import { escCut, escInit } from "@/lib/printer/escpos";
import { toVisualOrder } from "@/lib/printer/text-rtl";

describe("printer phase payloads", () => {
  it("ASCII includes init, title, and one full cut", () => {
    const buf = buildAsciiTestPayload(new Date("2026-08-24T12:00:00Z"));
    expect(buf.includes(escInit())).toBe(true);
    expect(buf.includes(Buffer.from("MISHKAH PRINTER TEST", "ascii"))).toBe(true);
    expect(buf.includes(escCut("full"))).toBe(true);
  });

  it("cutter payload is minimal with a single cut command", () => {
    const full = buildCutterTestPayload("full");
    const partial = buildCutterTestPayload("partial");
    expect(full.includes(Buffer.from("CUTTER TEST", "ascii"))).toBe(true);
    expect(full.includes(escCut("full"))).toBe(true);
    expect(partial.includes(escCut("partial"))).toBe(true);
    const fullCuts = full.filter((_, i) => full[i] === 0x1d && full[i + 1] === 0x56).length;
    expect(fullCuts).toBe(1);
  });

  it("Hebrew uses BiDi visual order (not raw logical LTR)", () => {
    const logical = "בדיקת מדפסת";
    const visual = toVisualOrder(logical);
    expect(visual).not.toBe(logical);
    expect(visual).toBe([...logical].reverse().join(""));
    const buf = buildHebrewTestPayload();
    expect(buf.includes(escInit())).toBe(true);
    expect(buf.length).toBeGreaterThan(40);
  });

  it("Arabic text payload builds without throwing", () => {
    const buf = buildArabicTextTestPayload();
    expect(buf.includes(escInit())).toBe(true);
    expect(buf.includes(escCut("full"))).toBe(true);
  });

  it("Arabic raster builds 576px-wide ESC/POS image payload", async () => {
    const buf = await buildArabicRasterTestPayload();
    expect(buf.includes(escInit())).toBe(true);
    // GS v 0
    expect(buf.includes(Buffer.from([0x1d, 0x76, 0x30]))).toBe(true);
    expect(buf.length).toBeGreaterThan(500);
  }, 20_000);
});
