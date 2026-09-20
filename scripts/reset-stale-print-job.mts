import "dotenv/config";
import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { listClaimableJobs } from "../src/lib/print-jobs/jobs";

const JOB_ID = process.argv[2]?.trim() || "NEW_ORDER_L6NPk58doZDBqILCCp99";

async function main() {
  const db = getAdminDb();
  const ref = db.collection(COLLECTIONS.printJobs).doc(JOB_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    console.log(JSON.stringify({ ok: false, reason: "missing" }));
    process.exit(1);
  }
  const before = snap.data();
  console.log("before", before?.status, before?.claimedAt);
  const claimable = await listClaimableJobs();
  console.log(
    "claimable",
    claimable.map((j) => `${j.id}:${j.status}`)
  );

  if (before?.status === "PRINTING" || before?.status === "FAILED") {
    await ref.update({
      status: "PENDING",
      claimedAt: null,
      claimedBy: null,
      nextRetryAt: null,
      lastError: "reset_stale_claim",
    });
    console.log("reset to PENDING");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
