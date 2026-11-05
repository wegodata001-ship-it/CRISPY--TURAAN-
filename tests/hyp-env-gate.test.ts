import { describe, expect, it } from "vitest";
import {
  assessHypProductionReadiness,
  assessHypTestReadiness,
  evaluateHypRealPayEnvironment,
  HYP_PRODUCTION_FIREBASE_PROJECT_ID,
  isHypPaymentsEnabled,
  resolveCheckoutSettlementModeFromEnv,
  resolveHypPayReturnUrl,
  resolveHypPortalRedirectUrls,
} from "@/lib/payments/hyp";

function stagingBase(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_CRISPY_STAGING_MODE: "true",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: "crispy-staging",
    FIREBASE_ADMIN_PROJECT_ID: "crispy-staging",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    HYP_STAGING_MOCK: "false",
    HYP_PAY_PRODUCTION_ENABLED: "false",
    ...overrides,
  };
}

function productionBase(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NEXT_PUBLIC_CRISPY_STAGING_MODE: "false",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: HYP_PRODUCTION_FIREBASE_PROJECT_ID,
    FIREBASE_ADMIN_PROJECT_ID: HYP_PRODUCTION_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_SITE_URL: "https://almostafachicken.com",
    HYP_STAGING_MOCK: "false",
    HYP_PAYMENTS_ENABLED: "true",
    HYP_PAY_PRODUCTION_ENABLED: "true",
    HYP_PAY_MASOF: "prod-masof",
    HYP_PAY_KEY: "prod-key",
    HYP_PAY_PASSP: "prod-passp",
    HYP_PAY_SUCCESS_URL: "https://almostafachicken.com/api/payments/hyp/return",
    HYP_PAY_FAIL_URL: "https://almostafachicken.com/api/payments/hyp/return",
    VERCEL_ENV: "production",
    ...overrides,
  };
}

describe("Hyp real-pay environment gate", () => {
  it("allows crispy-staging with staging mode", () => {
    expect(evaluateHypRealPayEnvironment(stagingBase())).toEqual({
      ok: true,
      profile: "staging",
    });
  });

  it("blocks production Firebase until HYP_PAY_PRODUCTION_ENABLED is set", () => {
    const decision = evaluateHypRealPayEnvironment(
      productionBase({ HYP_PAY_PRODUCTION_ENABLED: "false" })
    );
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.code).toBe("PRODUCTION_ENABLE_REQUIRED");
  });

  it("arms production when explicit production enable + HTTPS return are present", () => {
    expect(evaluateHypRealPayEnvironment(productionBase())).toEqual({
      ok: true,
      profile: "production",
    });
    expect(isHypPaymentsEnabled(productionBase())).toBe(true);
  });

  it("forbids staging mock on production project", () => {
    const decision = evaluateHypRealPayEnvironment(
      productionBase({ HYP_STAGING_MOCK: "true" })
    );
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.code).toBe("STAGING_MOCK_FORBIDDEN_ON_PRODUCTION");
  });

  it("requires staging mode for crispy-staging", () => {
    const decision = evaluateHypRealPayEnvironment(
      stagingBase({ NEXT_PUBLIC_CRISPY_STAGING_MODE: "false" })
    );
    expect(decision.ok).toBe(false);
    if (decision.ok) return;
    expect(decision.code).toBe("STAGING_MODE_REQUIRED");
  });
});

describe("Hyp portal HTTPS return URLs", () => {
  it("uses published storefront HTTPS for production (not localhost)", () => {
    const url = resolveHypPayReturnUrl(productionBase());
    expect(url).toBe("https://almostafachicken.com/api/payments/hyp/return");
    expect(resolveHypPortalRedirectUrls(productionBase())).toEqual({
      successUrl: url,
      failUrl: url,
    });
  });
});

describe("Hyp readiness (no secrets leaked)", () => {
  it("staging readiness never echoes secrets", () => {
    const report = assessHypTestReadiness(
      stagingBase({
        HYP_PAYMENTS_ENABLED: "true",
        HYP_PAY_MASOF: "SECRET-MASOF",
        HYP_PAY_KEY: "SECRET-KEY",
        HYP_PAY_PASSP: "SECRET-PASSP",
        HYP_PAY_SUCCESS_URL: "http://localhost:3000/api/payments/hyp/return",
        HYP_PAY_FAIL_URL: "http://localhost:3000/api/payments/hyp/return",
      })
    );
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain("SECRET-");
    expect(report.ready).toBe(true);
    expect(report.urls.successUrl).toContain("/api/payments/hyp/return");
  });

  it("production readiness requires both enable flags", () => {
    const blocked = assessHypProductionReadiness(
      productionBase({ HYP_PAY_PRODUCTION_ENABLED: "false" })
    );
    expect(blocked.ready).toBe(false);
    expect(blocked.missing.some((item) => item.includes("HYP_PAY_PRODUCTION_ENABLED"))).toBe(true);

    const ready = assessHypProductionReadiness(productionBase());
    expect(ready.ready).toBe(true);
    expect(ready.urls.successUrl).toBe("https://almostafachicken.com/api/payments/hyp/return");
  });
});

describe("checkout settlement with env gate", () => {
  it("does not fall back to legacy kitchen when production is not explicitly armed", () => {
    const mode = resolveCheckoutSettlementModeFromEnv(
      "card",
      productionBase({ HYP_PAY_PRODUCTION_ENABLED: "false" })
    );
    expect(mode).toEqual({ kind: "hyp_flag_incomplete_config", code: "HYP_NOT_CONFIGURED" });
    expect(isHypPaymentsEnabled(productionBase({ HYP_PAY_PRODUCTION_ENABLED: "false" }))).toBe(
      false
    );
  });

  it("keeps legacy cash+card when both production payment flags stay false", () => {
    const disarmed = productionBase({
      HYP_PAYMENTS_ENABLED: "false",
      HYP_PAY_PRODUCTION_ENABLED: "false",
    });
    expect(isHypPaymentsEnabled(disarmed)).toBe(false);
    expect(resolveCheckoutSettlementModeFromEnv("cash", disarmed)).toEqual({
      kind: "legacy_print",
    });
    expect(resolveCheckoutSettlementModeFromEnv("card", disarmed)).toEqual({
      kind: "legacy_print",
    });
  });
});
