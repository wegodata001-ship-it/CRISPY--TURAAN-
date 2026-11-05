import { describe, expect, it } from "vitest";
import {
  browserKitchenPrintBlockReason,
  canAdvanceKitchenWorkflow,
  canPrintKitchenTicketBrowser,
  kitchenWorkflowBlockReason,
  orderRequiresOnlinePayment,
  patchTouchesServerOnlyPaymentFields,
  SERVER_ONLY_ORDER_PAYMENT_KEYS,
} from "@/lib/orders/kitchen-action-gate";
import { decideKitchenRelease } from "@/lib/payments/hyp/engine";
import { mayReleaseOrderToKitchen } from "@/lib/print-jobs/payment-gate";

const unpaidOnline = {
  status: "received",
  paymentMethod: "card",
  paymentStatus: "pending",
  requiresOnlinePayment: true,
  awaitingHypPayment: true,
} as const;

const paidOnline = {
  ...unpaidOnline,
  paymentStatus: "paid" as const,
  awaitingHypPayment: false,
};

const cashLegacy = {
  status: "received",
  paymentMethod: "cash",
  paymentStatus: "pending",
} as const;

const legacyCardHypOff = {
  status: "received",
  paymentMethod: "card",
  paymentStatus: "pending",
} as const;

describe("kitchen action gate — unpaid online card", () => {
  it("blocks preparing / ready / delivered until paid", () => {
    for (const status of ["preparing", "ready", "delivered", "confirmed"] as const) {
      expect(canAdvanceKitchenWorkflow(unpaidOnline, status)).toBe(false);
      expect(kitchenWorkflowBlockReason(unpaidOnline, status)).toBe("awaiting_online_payment");
    }
    expect(canAdvanceKitchenWorkflow(unpaidOnline, "cancelled")).toBe(true);
    expect(canAdvanceKitchenWorkflow(unpaidOnline, "received")).toBe(true);
  });

  it("blocks browser kitchen ticket print while awaiting payment", () => {
    expect(canPrintKitchenTicketBrowser(unpaidOnline)).toBe(false);
    expect(browserKitchenPrintBlockReason(unpaidOnline)).toBe("awaiting_online_payment");
  });

  it("allows kitchen workflow and browser print after trusted paid", () => {
    expect(canAdvanceKitchenWorkflow(paidOnline, "preparing")).toBe(true);
    expect(canAdvanceKitchenWorkflow(paidOnline, "ready")).toBe(true);
    expect(canPrintKitchenTicketBrowser(paidOnline)).toBe(true);
  });

  it("blocks failed/refunded online card from kitchen", () => {
    expect(
      canAdvanceKitchenWorkflow({ ...unpaidOnline, paymentStatus: "failed" }, "preparing")
    ).toBe(false);
    expect(
      browserKitchenPrintBlockReason({ ...unpaidOnline, paymentStatus: "refunded" })
    ).toBe("payment_not_collectable");
  });
});

describe("kitchen action gate — cash / legacy Hyp-off", () => {
  it("keeps cash and unstamped card pending usable when Hyp is off", () => {
    expect(canAdvanceKitchenWorkflow(cashLegacy, "preparing")).toBe(true);
    expect(canPrintKitchenTicketBrowser(cashLegacy)).toBe(true);
    expect(canAdvanceKitchenWorkflow(legacyCardHypOff, "preparing")).toBe(true);
    expect(canPrintKitchenTicketBrowser(legacyCardHypOff)).toBe(true);

    expect(
      decideKitchenRelease({
        hypPaymentsEnabled: false,
        paymentMethod: "card",
        paymentStatus: "pending",
        orderStatus: "received",
      }).allow
    ).toBe(true);
  });

  it("stamped requiresOnlinePayment still blocks print even if Hyp env is off", () => {
    expect(
      mayReleaseOrderToKitchen(
        {
          status: "received",
          paymentMethod: "card",
          paymentStatus: "pending",
          requiresOnlinePayment: true,
        },
        { hypPaymentsEnabled: false }
      )
    ).toBe(false);
  });
});

describe("bypass attempts", () => {
  it("detects client patches that try to forge payment confirmation fields", () => {
    for (const key of SERVER_ONLY_ORDER_PAYMENT_KEYS) {
      expect(patchTouchesServerOnlyPaymentFields({ [key]: "paid" })).toBe(true);
    }
    expect(patchTouchesServerOnlyPaymentFields({ status: "preparing" })).toBe(false);
    expect(patchTouchesServerOnlyPaymentFields({ notes: "ok" })).toBe(false);
  });

  it("treats awaitingHypPayment legacy stamp like requiresOnlinePayment", () => {
    const legacyStamp = {
      status: "received",
      paymentMethod: "card",
      paymentStatus: "pending",
      awaitingHypPayment: true,
    };
    expect(orderRequiresOnlinePayment(legacyStamp)).toBe(true);
    expect(canAdvanceKitchenWorkflow(legacyStamp, "preparing")).toBe(false);
    expect(canPrintKitchenTicketBrowser(legacyStamp)).toBe(false);
  });
});

/**
 * Mirrors firestore.rules staff order update checks without deploying.
 * Keep in sync with firestore.rules order helpers.
 */
function staffMayUpdateOrderSim(resource: Record<string, unknown>, request: Record<string, unknown>) {
  const paymentKeys = [
    "paymentStatus",
    "requiresOnlinePayment",
    "awaitingHypPayment",
    "paymentFlow",
    "hypOrderRef",
    "hypTransactionId",
    "paidAt",
    "phoneVerified",
    "phoneVerifiedAt",
  ] as const;
  for (const key of paymentKeys) {
    const before = resource[key] ?? null;
    const after = key in request ? request[key] ?? null : before;
    if (after !== before) return { allow: false as const, reason: "payment_field_locked" };
  }

  const nextStatus = String(request.status ?? resource.status ?? "received");
  const kitchenWorkflow = ["preparing", "ready", "delivered", "confirmed"].includes(nextStatus);
  const requires =
    resource.requiresOnlinePayment === true || resource.awaitingHypPayment === true;
  const paid = (resource.paymentStatus ?? "pending") === "paid";
  if (kitchenWorkflow && requires && !paid) {
    return { allow: false as const, reason: "awaiting_online_payment" };
  }
  return { allow: true as const };
}

describe("firestore rules simulation — unpaid online card", () => {
  it("rejects direct status→preparing and paymentStatus→paid forgeries", () => {
    const resource = { ...unpaidOnline };
    expect(staffMayUpdateOrderSim(resource, { status: "preparing" })).toEqual({
      allow: false,
      reason: "awaiting_online_payment",
    });
    expect(staffMayUpdateOrderSim(resource, { paymentStatus: "paid" })).toEqual({
      allow: false,
      reason: "payment_field_locked",
    });
    expect(
      staffMayUpdateOrderSim(resource, { requiresOnlinePayment: false, status: "preparing" })
    ).toEqual({ allow: false, reason: "payment_field_locked" });
    expect(staffMayUpdateOrderSim(resource, { status: "cancelled" }).allow).toBe(true);
    expect(staffMayUpdateOrderSim(paidOnline, { status: "preparing" }).allow).toBe(true);
  });

  it("still allows cash kitchen advance without online stamp", () => {
    expect(staffMayUpdateOrderSim({ ...cashLegacy }, { status: "preparing" }).allow).toBe(true);
  });
});

describe("cancel / fail / success payment outcomes", () => {
  it("cancel leaves order visible but kitchen locked; success unlocks once", () => {
    // Cancel/fail payment UI leaves paymentStatus pending + requiresOnlinePayment.
    expect(canAdvanceKitchenWorkflow(unpaidOnline, "preparing")).toBe(false);
    expect(canPrintKitchenTicketBrowser(unpaidOnline)).toBe(false);

    // Trusted confirm path sets paid.
    expect(canAdvanceKitchenWorkflow(paidOnline, "preparing")).toBe(true);
    expect(
      mayReleaseOrderToKitchen(
        {
          status: "received",
          paymentMethod: "card",
          paymentStatus: "paid",
          requiresOnlinePayment: true,
        },
        { hypPaymentsEnabled: true }
      )
    ).toBe(true);
  });
});
