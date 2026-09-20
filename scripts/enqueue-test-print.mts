/**
 * Ad-hoc: enqueue a TEST print job so the running local agent picks it up.
 * Usage: npx tsx scripts/enqueue-test-print.mts ar|he|en
 */
import "dotenv/config";
import { enqueueTestPrintJob } from "../src/lib/print-jobs/jobs";
import { parsePrintLocale } from "../src/lib/print-jobs/ids";

async function main() {
  const locale = parsePrintLocale(process.argv[2] || "ar");
  const result = await enqueueTestPrintJob(locale);
  console.log(JSON.stringify({ ok: true, locale, ...result }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
