/**
 * Secret-free SIGN failure diagnostics for server logs.
 * Never include KEY, PassP, signature values, customer fields, or signed URLs.
 */

export type HypSignBodyKind = "query" | "html" | "json" | "empty" | "other";

export type HypSignSafeDiagnostic = {
  httpStatus: number;
  cCode: string | null;
  bodyKind: HypSignBodyKind;
  hasActionPay: boolean;
  hasSignature: boolean;
};

/** Hyp SIGN success uses lowercase `signature` (not request echo `Sign=True`). */
export function hypSignResponseHasSignature(params: Record<string, string>): boolean {
  return Boolean(params.signature?.trim());
}

export function hypSignResponseHasActionPay(
  body: string,
  params: Record<string, string>
): boolean {
  if (params.action === "pay") return true;
  return /(?:^|&)action=pay(?:&|$)/i.test(body.trim());
}

export function classifyHypSignResponseBody(
  body: string,
  params: Record<string, string>
): Omit<HypSignSafeDiagnostic, "httpStatus"> {
  const trimmed = body.trim();
  let bodyKind: HypSignBodyKind;
  if (!trimmed) {
    bodyKind = "empty";
  } else if (trimmed.startsWith("<") || /^<!doctype/i.test(trimmed)) {
    bodyKind = "html";
  } else if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    bodyKind = "json";
  } else if (
    trimmed.includes("=") &&
    (trimmed.includes("&") ||
      /(?:^|&)(?:action|CCode|signature|Order|Amount)=/i.test(trimmed))
  ) {
    bodyKind = "query";
  } else {
    bodyKind = "other";
  }

  const cCodeRaw = params.CCode?.trim();
  return {
    cCode: cCodeRaw ? cCodeRaw : null,
    bodyKind,
    hasActionPay: hypSignResponseHasActionPay(trimmed, params),
    hasSignature: hypSignResponseHasSignature(params),
  };
}

export function buildHypSignSafeDiagnostic(
  httpStatus: number,
  body: string,
  params: Record<string, string>
): HypSignSafeDiagnostic {
  return {
    httpStatus,
    ...classifyHypSignResponseBody(body, params),
  };
}

/** Structured log line — values are already non-secret. */
export function logHypSignFailureDiagnostic(
  diagnostic: HypSignSafeDiagnostic,
  code: string
): void {
  console.error("[Hyp][SIGN] failed", {
    code,
    httpStatus: diagnostic.httpStatus,
    cCode: diagnostic.cCode,
    bodyKind: diagnostic.bodyKind,
    hasActionPay: diagnostic.hasActionPay,
    hasSignature: diagnostic.hasSignature,
  });
}
