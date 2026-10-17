import { describe, expect, it } from "vitest";
import { FINANCE_COUNT_FROM_ISO, countsTowardFinance, financeTotal } from "@/lib/finance/books";

describe("finance books reset", () => {
  it("starts sales counting at the reset instant", () => {
    expect(countsTowardFinance(FINANCE_COUNT_FROM_ISO)).toBe(true);
    expect(countsTowardFinance("2026-10-16T08:35:59.999Z")).toBe(false);
  });

  it("sums only orders from the new count", () => {
    expect(
      financeTotal([
        { createdAt: "2026-10-14T12:00:00.000Z", total: 2777 },
        { createdAt: "2026-10-16T09:00:00.000Z", total: 40 },
        { createdAt: "2026-10-16T09:05:00.000Z", total: 15 },
      ])
    ).toBe(55);
  });
});
