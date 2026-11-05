/**
 * Secret-free local check: baseline vs Hyp merge candidate.
 * Does not read Firebase, does not publish rules.
 *
 *   npx tsx scripts/hyp-rules-merge-check.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const baselinePath = resolve(root, "firestore/crispy-d0bf7.baseline.from-git.rules");
const candidatePath = resolve(root, "firestore/crispy-d0bf7.hyp-merge.candidate.rules");
const fragmentPath = resolve(root, "firestore/hyp-orders-production.fragment.rules");
const workingRulesPath = resolve(root, "firestore.rules");

const baseline = readFileSync(baselinePath, "utf8");
const fragment = readFileSync(fragmentPath, "utf8");
const workingRules = readFileSync(workingRulesPath, "utf8");

const header = `// =============================================================================
// PRODUCTION MERGE CANDIDATE for Firebase project: crispy-d0bf7
// DO NOT auto-deploy. Review, then publish manually when ready.
//
// Base: last committed repo firestore.rules (git HEAD) - pre-HYP production shape.
// Patch: firestore/hyp-orders-production.fragment.rules ONLY:
//   1) Hyp order helper functions + tighter /orders create|update
//   2) hypPaymentIntents + hypPaymentAuditLogs client-denied
// All other collections/permissions (admin, products, categories, cash orders
// read path, costing, print jobs, coupons, etc.) are unchanged from baseline.
//
// Live remote rules were NOT fetched in this step (Firebase account for
// crispy-d0bf7 was not switched). Before publish: open Console > Rules and
// confirm remote matches baseline (orders create/update/delete if isStaff()).
// If remote differs, merge the fragment into the LIVE rules, not this file blindly.
// =============================================================================

`;

writeFileSync(candidatePath, header + workingRules, "utf8");
const candidate = readFileSync(candidatePath, "utf8");

function collectionPaths(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*match\s+(\/\S+)\s*\{?\s*$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => m[1])
    .filter((p) => p !== "/databases/{database}/documents");
}

const baselinePaths = collectionPaths(baseline);
const candidatePaths = collectionPaths(candidate);

const added = candidatePaths.filter((p) => !baselinePaths.includes(p));
const removed = baselinePaths.filter((p) => !candidatePaths.includes(p));

const requiredHelpers = [
  "orderRequiresOnlinePayment",
  "orderPaymentFieldsUnchanged",
  "staffMayUpdateOrderStatus",
  "staffCreateHasNoTrustedPaymentMarks",
];
const missingHelpers = requiredHelpers.filter((name) => !candidate.includes(`function ${name}`));

const requiredBits = [
  "hypPaymentIntents",
  "hypPaymentAuditLogs",
  "affectedKeys()",
  "staffCreateHasNoTrustedPaymentMarks",
  "awaitingHypPayment",
];
const missingBits = requiredBits.filter((bit) => !candidate.includes(bit));

const preserved = [
  "/products/{id}",
  "/categories/{id}",
  "/customers/{id}",
  "/users/{uid}",
  "/settings/{id}",
  "/printJobs/{id}",
  "/ingredients/{id}",
  "/costingSettings/{id}",
];
const missingPreserved = preserved.filter((p) => !candidatePaths.includes(p));

const ordersStillOpenStaffWrite =
  /match \/orders\/\{id\}[\s\S]*?allow create, update, delete: if isStaff\(\);/.test(candidate);

const expectedAdds = ["/hypPaymentIntents/{id}", "/hypPaymentAuditLogs/{id}"];
const unexpectedAdds = added.filter((p) => !expectedAdds.includes(p));
const missingAdds = expectedAdds.filter((p) => !added.includes(p));

const report = {
  ok:
    removed.length === 0 &&
    unexpectedAdds.length === 0 &&
    missingAdds.length === 0 &&
    missingHelpers.length === 0 &&
    missingBits.length === 0 &&
    missingPreserved.length === 0 &&
    !ordersStillOpenStaffWrite &&
    fragment.includes("affectedKeys()"),
  baselineOrderBlock: "create, update, delete if isStaff()",
  candidateAddsCollections: added,
  candidateRemovesCollections: removed,
  unexpectedAdds,
  missingAdds,
  missingHelpers,
  missingBits,
  missingPreserved,
  ordersStillOpenStaffWrite,
  note: "Compare LIVE Console rules to baseline before publish. No deploy from this script.",
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
