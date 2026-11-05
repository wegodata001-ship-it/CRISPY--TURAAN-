import { hypAmountParam } from "./amount";
import type { HypClient } from "./client";
import { buildQueryString, parseHypQueryString } from "./query";
import type { HypSignFailure, HypSignRequest, HypSignResult } from "./types";

function isValidOrderRef(orderRef: string): boolean {
  const trimmed = orderRef.trim();
  return trimmed.length > 0 && trimmed.length <= 64 && !/[\s&?=]/.test(trimmed);
}

/**
 * Build APISign What=SIGN request and turn the response into a hosted payment URL.
 * Credentials stay on the server; only the signed payment URL is returned to callers.
 */
export async function createHostedPaymentPage(
  client: HypClient,
  request: HypSignRequest
): Promise<HypSignResult | HypSignFailure> {
  if (!client.config.enabled) {
    return { ok: false, code: "DISABLED", message: "Hyp Pay integration is disabled" };
  }
  if (!client.config.masof || !client.config.key || !client.config.passp) {
    return { ok: false, code: "NOT_CONFIGURED", message: "Hyp Pay credentials are incomplete" };
  }

  const amount = hypAmountParam(request.amount);
  if (!amount) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Amount must be a positive ILS value" };
  }
  if (!isValidOrderRef(request.orderRef)) {
    return { ok: false, code: "INVALID_ORDER_REF", message: "Order reference is invalid" };
  }

  const coin = String(request.coin ?? client.config.coin);
  const pageLang = request.pageLang ?? client.config.pageLang;

  const signParams: Array<[string, string]> = [
    ["action", "APISign"],
    ["What", "SIGN"],
    ["Sign", "True"],
    ["Masof", client.config.masof],
    ["KEY", client.config.key],
    ["PassP", client.config.passp],
    ["Amount", amount],
    ["Coin", coin],
    ["Order", request.orderRef.trim()],
    ["PageLang", pageLang],
    ["UTF8", "True"],
    ["UTF8out", "True"],
  ];

  if (request.clientName?.trim()) {
    signParams.push(["ClientName", request.clientName.trim().slice(0, 50)]);
  }
  if (request.cell?.trim()) {
    signParams.push(["cell", request.cell.trim()]);
  }
  if (request.info?.trim()) {
    signParams.push(["Info", request.info.trim().slice(0, 120)]);
  }

  const query = buildQueryString(signParams, true);
  const response = await client.get(query);
  const body = response.text.trim();
  const parsed = parseHypQueryString(body);

  if (parsed.params.CCode && parsed.params.CCode !== "0") {
    return {
      ok: false,
      code: "SIGN_FAILED",
      message: `Hyp Sign rejected with CCode=${parsed.params.CCode}`,
    };
  }

  if (!parsed.params.signature && !parsed.params.Sign) {
    // Successful SIGN returns action=pay + signature (lowercase in docs).
    if (!body || body.startsWith("<") || /CCode=\d+/.test(body)) {
      return { ok: false, code: "SIGN_FAILED", message: "Hyp Sign returned an unexpected body" };
    }
  }

  if (parsed.params.action && parsed.params.action !== "pay") {
    return { ok: false, code: "SIGN_FAILED", message: "Hyp Sign did not return action=pay" };
  }

  // Hyp docs: append the response query as-is to the payment base URL.
  const signedQuery = body.startsWith("?") ? body.slice(1) : body;
  if (!signedQuery.includes("action=pay") && parsed.params.action !== "pay") {
    return { ok: false, code: "SIGN_FAILED", message: "Hyp Sign response missing action=pay" };
  }

  const base = client.config.baseUrl.replace(/\/$/, "");
  const paymentUrl = `${base}/?${signedQuery}`;

  return { ok: true, paymentUrl, signedQuery };
}
