import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Simulates the production FINAL create rule:
 *   allow create: if createHasNoTrustedPaymentMarks();
 * (must NOT require isStaff — that caused the crispy-d0bf7 outage)
 */
function createHasNoTrustedPaymentMarks(data: Record<string, unknown>): boolean {
  return (
    data.requiresOnlinePayment !== true &&
    data.awaitingHypPayment !== true &&
    (data.paymentFlow ?? "") !== "hyp_online" &&
    (data.paymentStatus ?? "pending") !== "paid" &&
    data.hypTransactionId == null &&
    data.paidAt == null
  );
}

describe("orders create compatibility (post-outage fix)", () => {
  const finalRules = readFileSync(
    resolve(process.cwd(), "firestore/crispy-d0bf7.production.final.rules"),
    "utf8"
  );

  it("FINAL rules allow create without isStaff (guest/client compatible)", () => {
    expect(finalRules).toContain("allow create: if createHasNoTrustedPaymentMarks();");
    expect(finalRules).not.toMatch(
      /allow create:\s*if isStaff\(\)\s*&&\s*createHasNoTrustedPaymentMarks\(\);/
    );
    expect(finalRules).not.toMatch(
      /allow create:\s*if isStaff\(\)\s*&&\s*staffCreateHasNoTrustedPaymentMarks\(\);/
    );
  });

  it("allows guest cash/legacy creates that LIVE depended on", () => {
    expect(
      createHasNoTrustedPaymentMarks({
        paymentMethod: "cash",
        paymentStatus: "pending",
        status: "received",
      })
    ).toBe(true);
    expect(
      createHasNoTrustedPaymentMarks({
        paymentMethod: "card",
        paymentStatus: "pending",
      })
    ).toBe(true);
  });

  it("blocks forged paid / Hyp stamps on client create", () => {
    expect(createHasNoTrustedPaymentMarks({ paymentStatus: "paid" })).toBe(false);
    expect(
      createHasNoTrustedPaymentMarks({
        paymentStatus: "pending",
        requiresOnlinePayment: true,
        awaitingHypPayment: true,
        paymentFlow: "hyp_online",
      })
    ).toBe(false);
    expect(createHasNoTrustedPaymentMarks({ hypTransactionId: "tx-1" })).toBe(false);
    expect(createHasNoTrustedPaymentMarks({ paidAt: new Date().toISOString() })).toBe(false);
  });
});
