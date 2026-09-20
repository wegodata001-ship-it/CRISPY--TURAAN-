/**
 * Read-only audit of the print pipeline for a specific order.
 * Usage: npx tsx scripts/audit-print-pipeline.mts MC-2026-H1S5ZFKF
 */
import "dotenv/config";
import { getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import {
  countJobsByStatus,
  listRecentPrintJobs,
  getPrintJob,
} from "../src/lib/print-jobs/jobs";
import { getLatestHeartbeat, isAgentOnline } from "../src/lib/print-jobs/heartbeat";
import { newOrderPrintJobId } from "../src/lib/print-jobs/ids";
import { isAutoPrintNewOrdersEnabled, getPrintStoreId } from "../src/lib/print-jobs/config";
import { toIso } from "../src/lib/print-jobs/time";

async function main() {
  const orderNumber = (process.argv[2] || "").trim();
  const db = getAdminDb();
  const out: Record<string, unknown> = {};

  // --- Order lookup by orderNumber ---
  if (orderNumber) {
    const snap = await db
      .collection(COLLECTIONS.orders)
      .where("orderNumber", "==", orderNumber)
      .limit(1)
      .get();
    if (snap.empty) {
      out.order = { found: false, orderNumber };
    } else {
      const doc = snap.docs[0]!;
      const data = doc.data() as Record<string, unknown>;
      out.order = {
        found: true,
        id: doc.id,
        orderNumber: data.orderNumber,
        createdAt: toIso(data.createdAt),
        status: data.status,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus ?? "(unset)",
        orderType: data.orderType,
        total: data.total,
        locale: data.locale ?? "(unset)",
        customerName: data.customerName,
        notificationsNewOrderEmail:
          (data.notifications as { newOrderEmail?: { status?: string } } | undefined)?.newOrderEmail
            ?.status ?? "(none)",
      };

      // Deterministic NEW_ORDER job id
      const jobId = newOrderPrintJobId(doc.id);
      const job = await getPrintJob(jobId);
      out.newOrderPrintJob = job
        ? {
            found: true,
            id: job.id,
            type: job.type,
            status: job.status,
            attempts: job.attempts,
            lastError: job.lastError,
            createdAt: job.createdAt,
            claimedAt: job.claimedAt,
            printedAt: job.printedAt,
            claimedBy: job.claimedBy,
            uniqueKey: job.uniqueKey,
          }
        : { found: false, expectedId: jobId };

      // All jobs for this orderId (REPRINT etc)
      const all = await db
        .collection(COLLECTIONS.printJobs)
        .where("orderId", "==", doc.id)
        .limit(20)
        .get();
      out.allPrintJobsForOrder = all.docs.map((d) => {
        const j = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          type: j.type,
          status: j.status,
          attempts: j.attempts,
          createdAt: toIso(j.createdAt),
          printedAt: toIso(j.printedAt),
          lastError: j.lastError,
        };
      });
    }
  }

  // --- Config ---
  out.config = {
    PRINT_AUTO_NEW_ORDERS_env: process.env.PRINT_AUTO_NEW_ORDERS ?? "(missing)",
    autoPrintEnabled: isAutoPrintNewOrdersEnabled(),
    storeId: getPrintStoreId(),
    PRINT_AGENT_TOKEN_present: Boolean(process.env.PRINT_AGENT_TOKEN?.trim()),
    PRINTER_IP: process.env.PRINTER_IP ?? "(default 192.168.1.87)",
    PRINTER_PORT: process.env.PRINTER_PORT ?? "(default 9100)",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "(missing)",
  };

  // --- Heartbeat ---
  const heartbeat = await getLatestHeartbeat();
  out.agent = heartbeat
    ? {
        agentId: heartbeat.agentId,
        hostname: heartbeat.hostname,
        version: heartbeat.version,
        lastSeenAt: heartbeat.lastSeenAt,
        printerConnectionStatus: heartbeat.printerConnectionStatus,
        online: isAgentOnline(heartbeat),
        printerIp: heartbeat.printerIp,
        printerPort: heartbeat.printerPort,
      }
    : { found: false, message: "No heartbeat document exists" };

  // --- Global queue stats + recent ---
  out.counts = await countJobsByStatus();
  const recent = await listRecentPrintJobs(15);
  out.recentJobs = recent.map((j) => ({
    id: j.id,
    type: j.type,
    status: j.status,
    orderId: j.orderId,
    attempts: j.attempts,
    createdAt: j.createdAt,
    printedAt: j.printedAt,
    lastError: j.lastError,
  }));

  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
