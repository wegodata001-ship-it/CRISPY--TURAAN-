import { buildHypOrderRef, createPaymentIntentDraft } from "./engine";
import { createHostedPaymentPage } from "./sign";
import type { HypClient } from "./client";
import type { HypPaymentIntent } from "./types";

export type HypCheckoutPaymentSuccess = {
  ok: true;
  paymentUrl: string;
  orderRef: string;
  intent: HypPaymentIntent;
  reused: boolean;
};

export type HypCheckoutPaymentFailure = {
  ok: false;
  code: "HYP_PAYMENT_LINK_FAILED" | "DISABLED" | "NOT_CONFIGURED" | "INVALID_AMOUNT" | "INVALID_ORDER_REF";
  message: string;
};

/**
 * Creates (or reuses) a hosted Hyp payment URL for a checkout request.
 * Idempotent on requestId via existingPaymentUrl / existing intent.
 * Never treats a browser redirect as payment success — VERIFY is a later phase.
 */
export async function createOrReuseHypCheckoutPayment(input: {
  client: HypClient;
  requestId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName?: string;
  cell?: string;
  couponCode?: string;
  existingPaymentUrl?: string | null;
  existingOrderRef?: string | null;
  existingIntent?: HypPaymentIntent | null;
  nowMs?: number;
}): Promise<HypCheckoutPaymentSuccess | HypCheckoutPaymentFailure> {
  const existingUrl = input.existingPaymentUrl?.trim();
  const existingRef = input.existingOrderRef?.trim() || input.existingIntent?.orderRef;
  if (existingUrl && existingRef) {
    const intent =
      input.existingIntent ??
      createPaymentIntentDraft({
        id: input.requestId,
        requestId: input.requestId,
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        amount: input.amount,
        createdAtMs: input.nowMs ?? Date.now(),
        couponCode: input.couponCode,
      });
    if (!intent) {
      return { ok: false, code: "INVALID_ORDER_REF", message: "Invalid payment intent" };
    }
    return {
      ok: true,
      paymentUrl: existingUrl,
      orderRef: existingRef,
      intent: { ...intent, status: "redirected" },
      reused: true,
    };
  }

  const orderRef = buildHypOrderRef(input.requestId);
  if (!orderRef) {
    return { ok: false, code: "INVALID_ORDER_REF", message: "Invalid checkout request id" };
  }

  const signed = await createHostedPaymentPage(input.client, {
    amount: input.amount,
    orderRef,
    clientName: input.customerName,
    cell: input.cell,
    info: input.orderNumber,
  });

  if (!signed.ok) {
    return {
      ok: false,
      code:
        signed.code === "DISABLED" || signed.code === "NOT_CONFIGURED" || signed.code === "INVALID_AMOUNT"
          ? signed.code
          : "HYP_PAYMENT_LINK_FAILED",
      message: signed.message,
    };
  }

  const intent = createPaymentIntentDraft({
    id: input.requestId,
    requestId: input.requestId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: input.amount,
    createdAtMs: input.nowMs ?? Date.now(),
    couponCode: input.couponCode,
  });
  if (!intent) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Invalid payment amount" };
  }

  return {
    ok: true,
    paymentUrl: signed.paymentUrl,
    orderRef,
    intent: { ...intent, status: "redirected" },
    reused: false,
  };
}
