/**
 * Local crispy-staging Hyp Pay mock — server-only.
 * Never contacts pay.hyp.co.il. Never requires HYP_PAY_* secrets.
 * HYP_PAYMENTS_ENABLED must stay false; this uses HYP_STAGING_MOCK instead.
 */

import { STAGING_LOCAL_URL } from "@/lib/public-urls";
import { buildHypOrderRef, createPaymentIntentDraft } from "./engine";
import { hypAmountParam } from "./amount";
import { evaluateHypRealPayEnvironment } from "./env-gate";
import type { HypCheckoutPaymentFailure, HypCheckoutPaymentSuccess } from "./create-checkout-payment";

export const STAGING_HYP_MOCK_PROJECT_ID = "crispy-staging";
export const STAGING_HYP_MOCK_MASOF = "STAGING_MOCK";
export const STAGING_HYP_MOCK_TX_PREFIX = "MOCK-TX-";

function flagTrue(value: string | undefined): boolean {
  return (value || "").trim().toLowerCase() === "true";
}

function isVercelRuntime(env: NodeJS.ProcessEnv): boolean {
  return Boolean((env.VERCEL || "").trim()) || Boolean((env.VERCEL_ENV || "").trim());
}

/**
 * Safe local Hyp mock. Requires ALL of:
 * - HYP_STAGING_MOCK=true (server-only)
 * - NODE_ENV=development
 * - not on Vercel
 * - NEXT_PUBLIC_CRISPY_STAGING_MODE=true
 * - Firebase client + admin both crispy-staging
 * Does NOT require HYP_PAYMENTS_ENABLED or real keys.
 */
export function isHypStagingMockEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!flagTrue(env.HYP_STAGING_MOCK)) return false;
  if ((env.NODE_ENV || "").trim() !== "development") return false;
  if (isVercelRuntime(env)) return false;
  if (!flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE)) return false;

  const clientProjectId = (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const adminProjectId = (env.FIREBASE_ADMIN_PROJECT_ID || "").trim() || clientProjectId;
  if (clientProjectId !== STAGING_HYP_MOCK_PROJECT_ID) return false;
  if (adminProjectId !== STAGING_HYP_MOCK_PROJECT_ID) return false;
  return true;
}

/** Hyp card flow active for kitchen gating: real Hyp OR staging mock. */
export function isHypPaymentFlowActive(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isHypStagingMockEnabled(env)) return true;
  const flag = flagTrue(env.HYP_PAYMENTS_ENABLED);
  const configured = Boolean(
    (env.HYP_PAY_MASOF || "").trim() && (env.HYP_PAY_KEY || "").trim() && (env.HYP_PAY_PASSP || "").trim()
  );
  return flag && configured && evaluateHypRealPayEnvironment(env).ok;
}

function mockOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const site = (env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (site.startsWith("http://localhost") || site.startsWith("http://127.0.0.1")) return site;
  return STAGING_LOCAL_URL;
}

export function buildHypStagingMockPaymentUrl(input: {
  orderRef: string;
  amount: number;
  env?: NodeJS.ProcessEnv;
}): string {
  const amount = hypAmountParam(input.amount) || String(input.amount);
  const origin = mockOrigin(input.env);
  const url = new URL("/checkout/hyp-mock", origin);
  url.searchParams.set("Order", input.orderRef);
  url.searchParams.set("Amount", amount);
  url.searchParams.set("mock", "1");
  return url.toString();
}

export function createOrReuseHypStagingMockPayment(input: {
  requestId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  existingPaymentUrl?: string | null;
  existingOrderRef?: string | null;
  nowMs?: number;
  env?: NodeJS.ProcessEnv;
}): HypCheckoutPaymentSuccess | HypCheckoutPaymentFailure {
  if (!isHypStagingMockEnabled(input.env)) {
    return { ok: false, code: "DISABLED", message: "Hyp staging mock is disabled" };
  }

  const existingUrl = input.existingPaymentUrl?.trim();
  const existingRef = input.existingOrderRef?.trim();
  if (existingUrl && existingRef) {
    const intent = createPaymentIntentDraft({
      id: input.requestId,
      requestId: input.requestId,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      amount: input.amount,
      createdAtMs: input.nowMs ?? Date.now(),
    });
    if (!intent) return { ok: false, code: "INVALID_AMOUNT", message: "Invalid payment amount" };
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

  const intent = createPaymentIntentDraft({
    id: input.requestId,
    requestId: input.requestId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: input.amount,
    createdAtMs: input.nowMs ?? Date.now(),
  });
  if (!intent) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Invalid payment amount" };
  }

  return {
    ok: true,
    paymentUrl: buildHypStagingMockPaymentUrl({
      orderRef,
      amount: input.amount,
      env: input.env,
    }),
    orderRef,
    intent: { ...intent, status: "redirected" },
    reused: false,
  };
}

export function isHypStagingMockTransactionId(transactionId: string): boolean {
  return transactionId.trim().startsWith(STAGING_HYP_MOCK_TX_PREFIX);
}

export function hypStagingMockPublicSummary(env: NodeJS.ProcessEnv = process.env): {
  enabled: boolean;
  flag: boolean;
  nodeEnv: string;
  vercel: boolean;
  stagingMode: boolean;
  hypPaymentsEnabledFlag: boolean;
  clientProjectId: string;
  adminProjectId: string;
} {
  const clientProjectId = (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const adminProjectId = (env.FIREBASE_ADMIN_PROJECT_ID || "").trim() || clientProjectId;
  return {
    enabled: isHypStagingMockEnabled(env),
    flag: flagTrue(env.HYP_STAGING_MOCK),
    nodeEnv: (env.NODE_ENV || "").trim() || "(unset)",
    vercel: isVercelRuntime(env),
    stagingMode: flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE),
    hypPaymentsEnabledFlag: flagTrue(env.HYP_PAYMENTS_ENABLED),
    clientProjectId,
    adminProjectId,
  };
}
