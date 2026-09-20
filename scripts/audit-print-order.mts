/**
 * Audit one real order + PrintJob + heartbeat. Prints no secrets.
 * Usage: npx tsx scripts/audit-print-order.mts MC-2026-H1S5ZFKF
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { newOrderPrintJobId } from "../src/lib/print-jobs/ids";
import { mapPrintJob } from "../src/lib/print-jobs/jobs";
import { getLatestHeartbeat, isAgentOnline } from "../src/lib/print-jobs/heartbeat";

function iso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return null;
}

async function main() {
  const orderNumber = process.argv[2]?.trim() || "MC-2026-H1S5ZFKF";
  const db = getAdminDb();

  const snap = await db
    .collection(COLLECTIONS.orders)
    .where("orderNumber", "==", orderNumber)
    .limit(1)
    .get();

  if (snap.empty) {
    console.log(JSON.stringify({ orderNumber, found: false }, null, 2));
    process.exit(1);
  }

  const doc = snap.docs[0]!;
  const data = doc.data();
  const jobId = newOrderPrintJobId(doc.id);
  const jobSnap = await db.collection(COLLECTIONS.printJobs).doc(jobId).get();
  const extraJobs = await db
    .collection(COLLECTIONS.printJobs)
    .where("orderId", "==", doc.id)
    .limit(10)
    .get();

  const heartbeat = await getLatestHeartbeat();

  console.log(
    JSON.stringify(
      {
        order: {
          found: true,
          id: doc.id,
          orderNumber: data.orderNumber,
          createdAt: iso(data.createdAt),
          paymentMethod: data.paymentMethod ?? null,
          paymentStatus: data.paymentStatus ?? null,
          status: data.status ?? null,
          locale: data.locale ?? null,
          total: data.total ?? null,
        },
        printJobById: jobSnap.exists
          ? mapPrintJob(jobSnap.id, jobSnap.data() as FirebaseFirestore.DocumentData)
          : null,
        printJobsForOrder: extraJobs.docs.map((d) =>
          mapPrintJob(d.id, d.data() as FirebaseFirestore.DocumentData)
        ),
        heartbeat: heartbeat
          ? {
              ...heartbeat,
              online: isAgentOnline(heartbeat),
            }
          : null,
        envPresence: {
          PRINT_AUTO_NEW_ORDERS: process.env.PRINT_AUTO_NEW_ORDERS ?? null,
          PRINT_AGENT_TOKEN: process.env.PRINT_AGENT_TOKEN ? "PRESENT" : "MISSING",
          PRINT_AGENT_API_URL: process.env.PRINT_AGENT_API_URL ?? null,
          PRINT_AGENT_ENABLED: process.env.PRINT_AGENT_ENABLED ?? null,
          PRINT_STORE_ID: process.env.PRINT_STORE_ID ?? null,
          PRINTER_IP: process.env.PRINTER_IP ?? null,
          PRINTER_PORT: process.env.PRINTER_PORT ?? null,
          NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? null,
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
