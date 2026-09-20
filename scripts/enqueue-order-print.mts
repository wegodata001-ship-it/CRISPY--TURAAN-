/**
 * Enqueue NEW_ORDER PrintJob for an existing order (unique orderId+type).
 * Usage: npx tsx scripts/enqueue-order-print.mts L6NPk58doZDBqILCCp99
 */
import "dotenv/config";
import { enqueueNewOrderPrintJob } from "../src/lib/print-jobs/jobs";

async function main() {
  const orderId = process.argv[2]?.trim();
  if (!orderId) {
    console.error("usage: npx tsx scripts/enqueue-order-print.mts <firestoreOrderId>");
    process.exit(1);
  }
  const result = await enqueueNewOrderPrintJob(orderId);
  console.log(JSON.stringify({ orderId, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
