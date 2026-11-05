import type { HypClient } from "./client";
import {
  evaluateTrustedPaymentConfirmation,
  isInconclusiveVerifyFailure,
  type DurableHypIntent,
} from "./confirm-engine";
import { parseHypQueryString } from "./query";
import { verifyHypPaymentRedirect } from "./verify";

export type ConfirmFromRedirectInput = {
  client: HypClient;
  /** Raw query string from Hyp redirect (order preserved). */
  rawQuery: string;
  /** Lookup durable intent by Hyp Order value. */
  loadIntentByOrderRef: (orderRef: string) => Promise<DurableHypIntent | null> | DurableHypIntent | null;
  expectedMasof?: string;
  expectedCoin?: 1 | 2 | 3 | 4;
  nowMs?: number;
};

export type ConfirmFromRedirectResult =
  | {
      ok: true;
      alreadyPaid: boolean;
      releaseKitchen: boolean;
      finalizeCoupon: boolean;
      intent: DurableHypIntent;
      transactionId: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
      inconclusive?: boolean;
      intent?: DurableHypIntent;
    };

/**
 * Server-side payment confirmation:
 * 1) Parse redirect (untrusted)
 * 2) Load durable intent (required)
 * 3) VERIFY with Hyp
 * 4) Apply atomic paid transition rules
 *
 * Never marks paid from redirect alone. Network VERIFY errors stay inconclusive.
 */
export async function confirmHypPaymentFromRedirect(
  input: ConfirmFromRedirectInput
): Promise<ConfirmFromRedirectResult> {
  const parsed = parseHypQueryString(input.rawQuery);
  const orderRef = (parsed.params.Order || "").trim();
  if (!orderRef) {
    return { ok: false, code: "MISSING_PARAMS", message: "Redirect missing Order" };
  }

  const intent = await input.loadIntentByOrderRef(orderRef);
  if (!intent) {
    return {
      ok: false,
      code: "INTENT_NOT_FOUND",
      message: "No durable payment intent — cannot accept payment without recoverable order linkage",
    };
  }

  const verified = await verifyHypPaymentRedirect(input.client, {
    redirectParams: parsed.params,
    redirectParamOrder: parsed.order,
    expectedOrderRef: intent.orderRef,
    expectedAmount: intent.amount,
    expectedMasof: input.expectedMasof || intent.expectedMasof,
    expectedCoin: input.expectedCoin || intent.currencyCoin,
  });

  if (!verified.ok) {
    const inconclusive = isInconclusiveVerifyFailure(verified.code);
    return {
      ok: false,
      code: inconclusive ? "VERIFY_INCONCLUSIVE" : verified.code,
      message: verified.message,
      inconclusive,
      intent,
    };
  }

  const decision = evaluateTrustedPaymentConfirmation({
    intent,
    verified: {
      transactionId: verified.transactionId,
      orderRef: verified.orderRef,
      amount: verified.amount,
      masof: verified.masof,
      coin: verified.coin,
    },
    nowMs: input.nowMs ?? Date.now(),
  });

  if (!decision.ok) {
    return {
      ok: false,
      code: decision.code,
      message: decision.message,
      intent: decision.intent,
    };
  }

  return {
    ok: true,
    alreadyPaid: decision.alreadyPaid,
    releaseKitchen: decision.releaseKitchen,
    finalizeCoupon: decision.finalizeCoupon,
    intent: decision.intent,
    transactionId: verified.transactionId,
  };
}
