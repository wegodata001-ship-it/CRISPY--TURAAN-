/**
 * Secret-free Hyp readiness report.
 * Usage:
 *   npx tsx scripts/hyp-test-readiness.mts
 *   npx tsx scripts/hyp-test-readiness.mts --production
 * Does not call Hyp. Does not print KEY/PassP/Masof values.
 */
import {
  assessHypProductionReadiness,
  assessHypTestReadiness,
  hypConfigPublicSummary,
} from "../src/lib/payments/hyp";

const production = process.argv.includes("--production");
const readiness = production
  ? assessHypProductionReadiness(process.env)
  : assessHypTestReadiness(process.env);
const summary = hypConfigPublicSummary(process.env);

console.log(
  JSON.stringify(
    {
      mode: production ? "production" : "staging",
      ready: readiness.ready,
      profile: readiness.profile,
      mockWouldWin: readiness.mockWouldWin,
      hypConfig: summary,
      credentialsPresent: readiness.credentialsPresent,
      productionEnableFlag: readiness.productionEnableFlag,
      environment: readiness.environment,
      portalUrls: {
        success: readiness.urls.successUrl,
        fail: readiness.urls.failUrl,
      },
      missing: readiness.missing,
      nextSteps: readiness.nextSteps,
    },
    null,
    2
  )
);

process.exit(readiness.ready ? 0 : 2);
