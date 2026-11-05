import type { HypClientConfig } from "./types";
import { isHypPaymentFlowActive as stagingHypFlowActive } from "./staging-mock";
import { evaluateHypRealPayEnvironment } from "./env-gate";

const DEFAULT_BASE_URL = "https://pay.hyp.co.il/p/";

function parseCoin(raw: string): 1 | 2 | 3 | 4 {
  if (raw === "2") return 2;
  if (raw === "3") return 3;
  if (raw === "4") return 4;
  return 1;
}

function parsePageLang(raw: string): "HEB" | "ENG" {
  return raw.toUpperCase() === "ENG" ? "ENG" : "HEB";
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim() || DEFAULT_BASE_URL;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

/**
 * Server-only Hyp Pay settings. Never expose KEY/PassP to the client bundle.
 * Integration stays off unless the flag is true AND credentials are present
 * AND the Firebase/staging environment gate allows real Hyp.
 */
export function loadHypPayConfig(
  env: NodeJS.ProcessEnv = process.env
): Omit<HypClientConfig, "httpGet"> {
  const enabledFlag = (env.HYP_PAYMENTS_ENABLED || "false").trim().toLowerCase() === "true";
  const masof = (env.HYP_PAY_MASOF || "").trim();
  const key = (env.HYP_PAY_KEY || "").trim();
  const passp = (env.HYP_PAY_PASSP || "").trim();
  const configured = Boolean(masof && key && passp);
  const environment = evaluateHypRealPayEnvironment(env);

  return {
    enabled: enabledFlag && configured && environment.ok,
    baseUrl: normalizeBaseUrl(env.HYP_PAY_BASE_URL || DEFAULT_BASE_URL),
    masof,
    key,
    passp,
    coin: parseCoin((env.HYP_PAY_COIN || "1").trim()),
    pageLang: parsePageLang((env.HYP_PAY_PAGE_LANG || "HEB").trim()),
  };
}

export function isHypPaymentsFlagEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.HYP_PAYMENTS_ENABLED || "false").trim().toLowerCase() === "true";
}

export function isHypPayConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const masof = (env.HYP_PAY_MASOF || "").trim();
  const key = (env.HYP_PAY_KEY || "").trim();
  const passp = (env.HYP_PAY_PASSP || "").trim();
  return Boolean(masof && key && passp);
}

/** Fully armed: flag ON, credentials present, and staging/live env gate passes. */
export function isHypPaymentsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return loadHypPayConfig(env).enabled;
}

/**
 * Whether card checkouts follow the Hyp await-paid kitchen path.
 * True for real Hyp (flag+creds+env gate) OR local staging mock (separate flag; no real keys).
 */
export function isHypPaymentFlowActive(env: NodeJS.ProcessEnv = process.env): boolean {
  return stagingHypFlowActive(env);
}

/** Safe summary for logs — never includes KEY or PassP. */
export function hypConfigPublicSummary(env: NodeJS.ProcessEnv = process.env): {
  enabled: boolean;
  flag: boolean;
  configured: boolean;
  environmentOk: boolean;
  environmentCode: string | null;
  baseUrl: string;
  masofPresent: boolean;
  coin: 1 | 2 | 3 | 4;
  pageLang: "HEB" | "ENG";
} {
  const flag = (env.HYP_PAYMENTS_ENABLED || "false").trim().toLowerCase() === "true";
  const cfg = loadHypPayConfig(env);
  const environment = evaluateHypRealPayEnvironment(env);
  return {
    enabled: cfg.enabled,
    flag,
    configured: Boolean(cfg.masof && cfg.key && cfg.passp),
    environmentOk: environment.ok,
    environmentCode: environment.ok ? null : environment.code,
    baseUrl: cfg.baseUrl,
    masofPresent: Boolean(cfg.masof),
    coin: cfg.coin,
    pageLang: cfg.pageLang,
  };
}

export const HYP_ENV_NAMES = [
  "HYP_PAYMENTS_ENABLED",
  "HYP_PAY_PRODUCTION_ENABLED",
  "HYP_STAGING_MOCK",
  "HYP_PAY_BASE_URL",
  "HYP_PAY_MASOF",
  "HYP_PAY_KEY",
  "HYP_PAY_PASSP",
  "HYP_PAY_COIN",
  "HYP_PAY_PAGE_LANG",
  "HYP_PAY_SUCCESS_URL",
  "HYP_PAY_FAIL_URL",
] as const;
