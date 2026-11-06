import { hypAmountParam } from "./amount";
import type { HypClient } from "./client";
import { buildQueryString, parseHypQueryString } from "./query";
import {
  buildHypSignSafeDiagnostic,
  hypSignResponseHasActionPay,
  hypSignResponseHasSignature,
  logHypSignFailureDiagnostic,
} from "./sign-diagnostic";
import type { HypSignFailure, HypSignRequest, HypSignResult } from "./types";

function isValidOrderRef(orderRef: string): boolean {
  const trimmed = orderRef.trim();
  return trimmed.length > 0 && trimmed.length <= 64 && !/[\s&?=]/.test(trimmed);
}

function failSign(
  code: HypSignFailure["code"],
  message: string,
  diagnostic?: HypSignFailure["diagnostic"]
): HypSignFailure {
  if (diagnostic) {
    logHypSignFailureDiagnostic(diagnostic, code);
  }
  return diagnostic ? { ok: false, code, message, diagnostic } : { ok: false, code, message };
}

/**
 * Build APISign What=SIGN request and turn the response into a hosted payment URL.
 * Credentials stay on the server; only the signed payment URL is returned to callers.
 *
 * Success requires Hyp query body with action=pay and lowercase `signature`.
 * Request echo `Sign=True` is not treated as a payment signature.
 * Response query is appended to the base URL as-is (order preserved).
 */
export async function createHostedPaymentPage(
  client: HypClient,
  request: HypSignRequest
): Promise<HypSignResult | HypSignFailure> {
  if (!client.config.enabled) {
    return failSign("DISABLED", "Hyp Pay integration is disabled");
  }
  if (!client.config.masof || !client.config.key || !client.config.passp) {
    return failSign("NOT_CONFIGURED", "Hyp Pay credentials are incomplete");
  }

  const amount = hypAmountParam(request.amount);
  if (!amount) {
    return failSign("INVALID_AMOUNT", "Amount must be a positive ILS value");
  }
  if (!isValidOrderRef(request.orderRef)) {
    return failSign("INVALID_ORDER_REF", "Order reference is invalid");
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
  const diagnostic = buildHypSignSafeDiagnostic(response.status, body, parsed.params);

  if (diagnostic.cCode === "NETWORK" || response.status === 0) {
    return failSign("NETWORK", "Hyp Sign transport failed", diagnostic);
  }

  if (diagnostic.cCode && diagnostic.cCode !== "0") {
    return failSign(
      "SIGN_FAILED",
      `Hyp Sign rejected with CCode=${diagnostic.cCode}`,
      diagnostic
    );
  }

  if (diagnostic.bodyKind === "html" || diagnostic.bodyKind === "json" || diagnostic.bodyKind === "empty") {
    return failSign("SIGN_FAILED", "Hyp Sign returned an unexpected body", diagnostic);
  }

  // Proven fix: do not treat request-echo Sign=True as a crypto signature.
  // Require lowercase `signature` + action=pay for a usable hosted pay URL.
  if (!hypSignResponseHasActionPay(body, parsed.params) || !hypSignResponseHasSignature(parsed.params)) {
    return failSign(
      "SIGN_FAILED",
      !hypSignResponseHasActionPay(body, parsed.params)
        ? "Hyp Sign response missing action=pay"
        : "Hyp Sign response missing signature",
      diagnostic
    );
  }

  if (parsed.params.action && parsed.params.action !== "pay") {
    return failSign("SIGN_FAILED", "Hyp Sign did not return action=pay", diagnostic);
  }

  // Hyp docs: append the response query as-is to the payment base URL.
  const signedQuery = body.startsWith("?") ? body.slice(1) : body;
  if (!signedQuery.includes("action=pay")) {
    return failSign("SIGN_FAILED", "Hyp Sign response missing action=pay", diagnostic);
  }

  const base = client.config.baseUrl.replace(/\/$/, "");
  const paymentUrl = `${base}/?${signedQuery}`;

  return { ok: true, paymentUrl, signedQuery };
}
