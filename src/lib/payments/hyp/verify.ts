import { amountsMatch, parseHypAmount } from "./amount";
import type { HypClient } from "./client";
import { buildQueryString, rebuildOrderedQuery } from "./query";
import type { HypVerifyInput, HypVerifyResult } from "./types";

/**
 * Validate a Hyp Pay success redirect with APISign What=VERIFY.
 *
 * Official Hyp Pay success redirect documents (developers.hyp.co.il/pay):
 *   Id, CCode, Amount, ACode, Order, Fild1–3, Sign
 * Masof/Coin are NOT listed as guaranteed redirect fields (they appear on SIGN/pay URLs).
 * Merchant authentication for VERIFY uses our server Masof+KEY+PassP; Hyp checks Sign.
 * If Masof or Coin ARE present on the redirect, they must match our expectations.
 * Network failures return NETWORK (inconclusive), not payment failure.
 */
export async function verifyHypPaymentRedirect(
  client: HypClient,
  input: HypVerifyInput
): Promise<HypVerifyResult> {
  if (!client.config.enabled) {
    return { ok: false, code: "DISABLED", message: "Hyp Pay integration is disabled" };
  }
  if (!client.config.masof || !client.config.key || !client.config.passp) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Hyp Pay credentials are incomplete" };
  }

  const { redirectParams, redirectParamOrder, expectedOrderRef, expectedAmount } = input;
  const cCode = redirectParams.CCode;
  const orderRef = (redirectParams.Order || "").trim();
  const transactionId = (redirectParams.Id || "").trim();
  const amount = parseHypAmount(redirectParams.Amount);
  const redirectMasof = (redirectParams.Masof || "").trim();
  const redirectSign = (redirectParams.Sign || "").trim();
  const redirectCoinRaw = redirectParams.Coin;
  const redirectCoin =
    redirectCoinRaw != null && redirectCoinRaw !== "" ? Number(redirectCoinRaw) : undefined;

  // Documented required redirect fields for a success completion (Hyp Pay docs examples).
  if (!cCode || !orderRef || !transactionId || amount == null || !redirectSign) {
    return {
      ok: false,
      code: "MISSING_PARAMS",
      message: "Redirect is missing required payment fields (Id, CCode, Amount, Order, Sign)",
    };
  }

  if (cCode !== "0") {
    return {
      ok: false,
      code: "PAYMENT_DECLINED",
      message: `Payment not successful (CCode=${cCode})`,
      cCode,
    };
  }

  if (orderRef !== expectedOrderRef.trim()) {
    return { ok: false, code: "ORDER_MISMATCH", message: "Order reference does not match the payment intent" };
  }

  if (!amountsMatch(expectedAmount, amount)) {
    return { ok: false, code: "AMOUNT_MISMATCH", message: "Paid amount does not match the order total" };
  }

  // Masof is NOT guaranteed on success redirects. When present it must match; when absent,
  // merchant binding is enforced by VERIFY using our configured Masof+KEY+PassP + Sign.
  if (redirectMasof) {
    const expected = (input.expectedMasof || client.config.masof || "").trim();
    if (!expected || expected !== redirectMasof) {
      return { ok: false, code: "MERCHANT_MISMATCH", message: "Masof/terminal does not match merchant config" };
    }
  } else if (!(input.expectedMasof || client.config.masof || "").trim()) {
    return {
      ok: false,
      code: "MERCHANT_MISMATCH",
      message: "Server merchant terminal (Masof) is not configured for VERIFY",
    };
  }

  if (
    input.expectedCoin != null &&
    redirectCoin != null &&
    Number.isFinite(redirectCoin) &&
    input.expectedCoin !== redirectCoin
  ) {
    return { ok: false, code: "CURRENCY_MISMATCH", message: "Coin/currency does not match the payment intent" };
  }

  const redirectQuery = rebuildOrderedQuery(redirectParams, redirectParamOrder);
  const verifyParams: Array<[string, string]> = [
    ["action", "APISign"],
    ["What", "VERIFY"],
    ["Masof", client.config.masof],
    ["KEY", client.config.key],
    ["PassP", client.config.passp],
  ];

  const verifyQuery = `${buildQueryString(verifyParams, true)}&${redirectQuery}`;
  const response = await client.get(verifyQuery);
  const body = response.text.trim();

  if (response.status === 0 || body.includes("CCode=NETWORK") || (!response.ok && !body.includes("CCode="))) {
    return {
      ok: false,
      code: "NETWORK",
      message: "Hyp VERIFY transport failed — payment status is inconclusive",
    };
  }

  const verifyCode = /(?:^|&)CCode=([^&]*)/.exec(body)?.[1] ?? "";

  if (verifyCode !== "0") {
    return {
      ok: false,
      code: "VERIFY_FAILED",
      message: `Hyp VERIFY failed (CCode=${verifyCode || "unknown"})`,
      cCode: verifyCode || undefined,
    };
  }

  return {
    ok: true,
    transactionId,
    amount,
    orderRef,
    approvalCode: redirectParams.ACode,
    cCode: "0",
    masof: redirectMasof || client.config.masof,
    coin: Number.isFinite(redirectCoin) ? redirectCoin : input.expectedCoin,
  };
}
