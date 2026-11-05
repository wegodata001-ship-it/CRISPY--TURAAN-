/**
 * Compare LIVE snapshot vs FINAL production rules (local only, no publish).
 *   npx tsx scripts/hyp-production-final-check.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.cwd());
const live = readFileSync(resolve(root, "firestore/crispy-d0bf7.live.snapshot.rules"), "utf8");
const finalRules = readFileSync(resolve(root, "firestore/crispy-d0bf7.production.final.rules"), "utf8");

function paths(source: string): string[] {
  return source
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*match\s+(\/\S+)\s*\{?\s*$/))
    .filter((m): m is RegExpMatchArray => Boolean(m))
    .map((m) => m[1])
    .filter((p) => p !== "/databases/{database}/documents");
}

const livePaths = paths(live);
const finalPaths = paths(finalRules);
const added = finalPaths.filter((p) => !livePaths.includes(p));
const removed = livePaths.filter((p) => !finalPaths.includes(p));

const preservedLiveBlocks = [
  "match /categories/{id}",
  "match /products/{id}",
  "match /customers/{id}",
  "match /banners/{id}",
  "match /settings/{id}",
  "match /printJobs/{id}",
  "match /costingSettings/{id}",
];

function ordersBlock(source: string): string {
  const match = source.match(/match \/orders\/\{id\}[\s\S]*?(?=\n\s*match \/|$)/);
  return match?.[0] ?? "";
}

const liveOrders = ordersBlock(live);
const finalOrders = ordersBlock(finalRules);
const liveHadOpenOrderCreate = /allow create:\s*if true;/.test(liveOrders);
const finalGuestCompatibleCreate =
  /allow create:\s*if createHasNoTrustedPaymentMarks\(\);/.test(finalOrders) &&
  !/allow create:\s*if isStaff\(\)/.test(finalOrders);
const finalBlocksTrustedCreateHelper = finalRules.includes("function createHasNoTrustedPaymentMarks");

const report = {
  ok:
    removed.length === 0 &&
    finalRules.includes("orderPaymentFieldsUnchanged") &&
    finalRules.includes("staffMayUpdateOrderStatus") &&
    finalRules.includes("hypPaymentIntents") &&
    liveHadOpenOrderCreate &&
    finalGuestCompatibleCreate &&
    finalBlocksTrustedCreateHelper &&
    preservedLiveBlocks.every((b) => finalRules.includes(b)),
  liveHadOpenOrderCreate,
  finalGuestCompatibleCreate,
  finalBlocksTrustedCreateHelper,
  addedCollections: added,
  removedCollections: removed,
  hypLocksPresent: finalRules.includes("affectedKeys()"),
  outageLesson:
    "Never publish isStaff()-only order create while guest/client writers still exist. Use createHasNoTrustedPaymentMarks().",
  note: "Do not publish from this script.",
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
