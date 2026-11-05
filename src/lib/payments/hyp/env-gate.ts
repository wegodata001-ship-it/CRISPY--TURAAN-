/**
 * Environment gates for real Hyp / MAX Pay.
 *
 * Two explicit tracks:
 * - Staging: Firebase crispy-staging + NEXT_PUBLIC_CRISPY_STAGING_MODE (mock or real keys).
 * - Production: Firebase crispy-d0bf7 + HYP_PAY_PRODUCTION_ENABLED=true (never by accident).
 *
 * Never enables production Hyp just because credentials exist.
 */

import { PRODUCTION_CUSTOMER_URL } from "@/lib/public-urls";

export const HYP_STAGING_FIREBASE_PROJECT_ID = "crispy-staging";
/** Customer production Firebase — requires explicit HYP_PAY_PRODUCTION_ENABLED. */
export const HYP_PRODUCTION_FIREBASE_PROJECT_ID = "crispy-d0bf7";
/** @deprecated Use HYP_PRODUCTION_FIREBASE_PROJECT_ID — kept for older test imports. */
export const HYP_BLOCKED_PRODUCTION_FIREBASE_PROJECT_ID = HYP_PRODUCTION_FIREBASE_PROJECT_ID;

export const HYP_PRODUCTION_RETURN_PATH = "/api/payments/hyp/return";

function flagTrue(value: string | undefined): boolean {
  return (value || "").trim().toLowerCase() === "true";
}

function projectIds(env: NodeJS.ProcessEnv) {
  const clientProjectId = (env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  const adminProjectId = (env.FIREBASE_ADMIN_PROJECT_ID || "").trim() || clientProjectId;
  return { clientProjectId, adminProjectId };
}

function isVercelProduction(env: NodeJS.ProcessEnv): boolean {
  return (env.VERCEL_ENV || "").trim() === "production";
}

export type HypPayProfile = "staging" | "production";

export type HypRealPayEnvironmentDecision =
  | { ok: true; profile: HypPayProfile }
  | {
      ok: false;
      code:
        | "PROJECT_MISMATCH"
        | "UNKNOWN_FIREBASE_PROJECT"
        | "STAGING_MODE_REQUIRED"
        | "PRODUCTION_ENABLE_REQUIRED"
        | "STAGING_MODE_FORBIDDEN_ON_PRODUCTION"
        | "STAGING_MOCK_FORBIDDEN_ON_PRODUCTION"
        | "PRODUCTION_HTTPS_REQUIRED";
      message: string;
    };

/**
 * Canonical Hyp browser return URL for the active profile.
 * Production always uses the published HTTPS storefront (never localhost).
 */
export function resolveHypPayReturnUrl(env: NodeJS.ProcessEnv = process.env): string {
  const { clientProjectId, adminProjectId } = projectIds(env);
  const onProductionProject =
    clientProjectId === HYP_PRODUCTION_FIREBASE_PROJECT_ID ||
    adminProjectId === HYP_PRODUCTION_FIREBASE_PROJECT_ID ||
    isVercelProduction(env);

  if (onProductionProject) {
    const configured = (env.HYP_PAY_SUCCESS_URL || env.NEXT_PUBLIC_SITE_URL || "").trim();
    if (configured.startsWith("https://")) {
      try {
        const parsed = new URL(configured);
        if (parsed.hostname === "almostafachicken.com" || parsed.hostname.endsWith(".almostafachicken.com")) {
          return `${parsed.origin}${HYP_PRODUCTION_RETURN_PATH}`;
        }
      } catch {
        // fall through to canonical production URL
      }
    }
    return `${PRODUCTION_CUSTOMER_URL.replace(/\/+$/, "")}${HYP_PRODUCTION_RETURN_PATH}`;
  }

  const site = (env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
  return `${site}${HYP_PRODUCTION_RETURN_PATH}`;
}

/** Success and Fail portal targets are the same CRISPY return route (CCode distinguishes outcome). */
export function resolveHypPortalRedirectUrls(env: NodeJS.ProcessEnv = process.env): {
  successUrl: string;
  failUrl: string;
} {
  const url = resolveHypPayReturnUrl(env);
  return { successUrl: url, failUrl: url };
}

/**
 * Whether this process may arm real Hyp SIGN/VERIFY (not the local mock).
 * Does not check Masof/KEY/PassP — callers combine with credential checks.
 */
export function evaluateHypRealPayEnvironment(
  env: NodeJS.ProcessEnv = process.env
): HypRealPayEnvironmentDecision {
  const { clientProjectId, adminProjectId } = projectIds(env);

  if (!clientProjectId || !adminProjectId) {
    return {
      ok: false,
      code: "PROJECT_MISMATCH",
      message: "Firebase client and Admin project ids are required for Hyp Pay",
    };
  }
  if (clientProjectId !== adminProjectId) {
    return {
      ok: false,
      code: "PROJECT_MISMATCH",
      message: "Firebase client and Admin project ids must match for Hyp Pay",
    };
  }

  // --- Staging track (mock or optional real keys on crispy-staging) ---
  if (clientProjectId === HYP_STAGING_FIREBASE_PROJECT_ID) {
    if (!flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE)) {
      return {
        ok: false,
        code: "STAGING_MODE_REQUIRED",
        message: "Set NEXT_PUBLIC_CRISPY_STAGING_MODE=true for Hyp on crispy-staging",
      };
    }
    return { ok: true, profile: "staging" };
  }

  // --- Production track (explicit second switch) ---
  if (clientProjectId === HYP_PRODUCTION_FIREBASE_PROJECT_ID) {
    if (flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE) && !isVercelProduction(env)) {
      return {
        ok: false,
        code: "STAGING_MODE_FORBIDDEN_ON_PRODUCTION",
        message: "Do not enable CRISPY staging mode against production Firebase crispy-d0bf7",
      };
    }
    if (flagTrue(env.HYP_STAGING_MOCK)) {
      return {
        ok: false,
        code: "STAGING_MOCK_FORBIDDEN_ON_PRODUCTION",
        message: "HYP_STAGING_MOCK must stay false on production Firebase",
      };
    }
    if (!flagTrue(env.HYP_PAY_PRODUCTION_ENABLED)) {
      return {
        ok: false,
        code: "PRODUCTION_ENABLE_REQUIRED",
        message:
          "Set HYP_PAY_PRODUCTION_ENABLED=true (Vercel Production secret) to arm Hyp on crispy-d0bf7",
      };
    }

    const returnUrl = resolveHypPayReturnUrl(env);
    if (!returnUrl.startsWith("https://")) {
      return {
        ok: false,
        code: "PRODUCTION_HTTPS_REQUIRED",
        message: "Production Hyp return URL must be HTTPS on the published CRISPY site",
      };
    }

    return { ok: true, profile: "production" };
  }

  return {
    ok: false,
    code: "UNKNOWN_FIREBASE_PROJECT",
    message: "Hyp Pay is only configured for crispy-staging or crispy-d0bf7",
  };
}

export type HypCredentialsPresent = {
  masof: boolean;
  key: boolean;
  passp: boolean;
};

export type HypReadinessReport = {
  profile: HypPayProfile | null;
  ready: boolean;
  mockWouldWin: boolean;
  paymentsFlag: boolean;
  productionEnableFlag: boolean;
  credentialsPresent: HypCredentialsPresent;
  environment: HypRealPayEnvironmentDecision;
  urls: {
    baseUrl: string;
    successUrl: string;
    failUrl: string;
    successUrlConfigured: boolean;
    failUrlConfigured: boolean;
  };
  missing: string[];
  nextSteps: string[];
};

function credentialsPresentOf(env: NodeJS.ProcessEnv): HypCredentialsPresent {
  return {
    masof: Boolean((env.HYP_PAY_MASOF || "").trim()),
    key: Boolean((env.HYP_PAY_KEY || "").trim()),
    passp: Boolean((env.HYP_PAY_PASSP || "").trim()),
  };
}

function hypBaseUrl(env: NodeJS.ProcessEnv): string {
  return (
    ((env.HYP_PAY_BASE_URL || "https://pay.hyp.co.il/p/").trim() || "https://pay.hyp.co.il/p/").replace(
      /\/+$/,
      ""
    ) + "/"
  );
}

/**
 * Secret-free readiness for staging (mock or optional real keys).
 */
export function assessHypTestReadiness(env: NodeJS.ProcessEnv = process.env): HypReadinessReport {
  return assessHypReadiness(env, "staging");
}

/**
 * Secret-free readiness for production Hyp on crispy-d0bf7.
 */
export function assessHypProductionReadiness(env: NodeJS.ProcessEnv = process.env): HypReadinessReport {
  return assessHypReadiness(env, "production");
}

function assessHypReadiness(
  env: NodeJS.ProcessEnv,
  expectedProfile: HypPayProfile
): HypReadinessReport {
  const paymentsFlag = flagTrue(env.HYP_PAYMENTS_ENABLED);
  const productionEnableFlag = flagTrue(env.HYP_PAY_PRODUCTION_ENABLED);
  const mockFlag = flagTrue(env.HYP_STAGING_MOCK);
  const nodeDev = (env.NODE_ENV || "").trim() === "development";
  const stagingMode = flagTrue(env.NEXT_PUBLIC_CRISPY_STAGING_MODE);
  const { clientProjectId, adminProjectId } = projectIds(env);
  const mockWouldWin =
    mockFlag &&
    nodeDev &&
    stagingMode &&
    clientProjectId === HYP_STAGING_FIREBASE_PROJECT_ID &&
    adminProjectId === HYP_STAGING_FIREBASE_PROJECT_ID &&
    !(env.VERCEL || "").trim() &&
    !(env.VERCEL_ENV || "").trim();

  const credentialsPresent = credentialsPresentOf(env);
  const environment = evaluateHypRealPayEnvironment(env);
  const portal = resolveHypPortalRedirectUrls(env);
  const successUrlConfigured = Boolean((env.HYP_PAY_SUCCESS_URL || "").trim());
  const failUrlConfigured = Boolean((env.HYP_PAY_FAIL_URL || "").trim());

  const missing: string[] = [];
  if (expectedProfile === "staging" && mockWouldWin) {
    missing.push("Turn off HYP_STAGING_MOCK when using real Hyp SIGN on staging");
  }
  if (expectedProfile === "production" && mockFlag) {
    missing.push("HYP_STAGING_MOCK must be false for production");
  }
  if (!paymentsFlag) missing.push("Set HYP_PAYMENTS_ENABLED=true (Vercel server env)");
  if (expectedProfile === "production" && !productionEnableFlag) {
    missing.push("Set HYP_PAY_PRODUCTION_ENABLED=true (explicit production arming)");
  }
  if (!credentialsPresent.masof) missing.push("Set HYP_PAY_MASOF (Vercel encrypted env / secret)");
  if (!credentialsPresent.key) missing.push("Set HYP_PAY_KEY (Vercel encrypted env / secret)");
  if (!credentialsPresent.passp) missing.push("Set HYP_PAY_PASSP (Vercel encrypted env / secret)");
  if (!environment.ok) missing.push(environment.message);
  if (environment.ok && environment.profile !== expectedProfile) {
    missing.push(`Environment profile is ${environment.profile}, expected ${expectedProfile}`);
  }
  if (!successUrlConfigured) {
    missing.push(`Set HYP_PAY_SUCCESS_URL=${portal.successUrl} (document portal target)`);
  }
  if (!failUrlConfigured) {
    missing.push(`Set HYP_PAY_FAIL_URL=${portal.failUrl} (document portal target)`);
  }

  const nextSteps =
    expectedProfile === "production"
      ? [
          "In Vercel Production: set HYP_PAYMENTS_ENABLED, HYP_PAY_PRODUCTION_ENABLED, HYP_PAY_MASOF, HYP_PAY_KEY, HYP_PAY_PASSP as encrypted server secrets (never NEXT_PUBLIC_*).",
          "Keep NEXT_PUBLIC_FIREBASE_PROJECT_ID / FIREBASE_ADMIN_PROJECT_ID = crispy-d0bf7; leave staging mode unset/false.",
          `In Hyp / MAX portal, set Success and Fail URLs to ${portal.successUrl}`,
          "Deploy app code that includes Hyp return VERIFY + kitchen gate; publish matching Firestore order payment rules only after review.",
          "Smoke-test one low-value live card payment; confirm paid once and kitchen unlocks once.",
        ]
      : [
          "Keep Firebase on crispy-staging with NEXT_PUBLIC_CRISPY_STAGING_MODE=true.",
          "For mock: HYP_STAGING_MOCK=true and HYP_PAYMENTS_ENABLED=false.",
          "For real keys on staging: HYP_STAGING_MOCK=false + HYP_PAYMENTS_ENABLED=true + Masof/KEY/PassP.",
          `Portal return URL for local staging: ${portal.successUrl}`,
        ];

  const profileMatch = environment.ok && environment.profile === expectedProfile;
  const ready =
    !mockWouldWin &&
    paymentsFlag &&
    credentialsPresent.masof &&
    credentialsPresent.key &&
    credentialsPresent.passp &&
    profileMatch &&
    (expectedProfile === "staging" || productionEnableFlag);

  return {
    profile: environment.ok ? environment.profile : null,
    ready,
    mockWouldWin,
    paymentsFlag,
    productionEnableFlag,
    credentialsPresent,
    environment,
    urls: {
      baseUrl: hypBaseUrl(env),
      successUrl: portal.successUrl,
      failUrl: portal.failUrl,
      successUrlConfigured,
      failUrlConfigured,
    },
    missing,
    nextSteps,
  };
}
