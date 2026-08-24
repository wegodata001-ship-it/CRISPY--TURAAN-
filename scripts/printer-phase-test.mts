/**
 * Local printer phase tests — no Next.js / no auth.
 * Usage (from repo root, same LAN as printer):
 *   npx tsx scripts/printer-phase-test.mts cutter
 *   npx tsx scripts/printer-phase-test.mts cutter-partial
 *   npx tsx scripts/printer-phase-test.mts hebrew
 *   npx tsx scripts/printer-phase-test.mts arabic
 *   npx tsx scripts/printer-phase-test.mts arabic-raster
 */
import "dotenv/config";
import { sendRawToPrinter } from "../src/lib/printer/tcp";
import {
  buildArabicTextTestPayload,
  buildCutterTestPayload,
  buildHebrewTestPayload,
} from "../src/lib/printer/test-payloads";
import { buildArabicRasterTestPayload } from "../src/lib/printer/arabic-raster";
import { getPrinterHost, getPrinterPort } from "../src/lib/printer/config";

async function main() {
  const mode = (process.argv[2] || "cutter").toLowerCase();
  const host = getPrinterHost();
  const port = getPrinterPort();
  console.log(`[printer-phase-test] target ${host}:${port} mode=${mode}`);

  let payload: Buffer;
  switch (mode) {
    case "cutter":
      payload = buildCutterTestPayload("full");
      break;
    case "cutter-partial":
      payload = buildCutterTestPayload("partial");
      break;
    case "hebrew":
      payload = buildHebrewTestPayload();
      break;
    case "arabic":
      payload = buildArabicTextTestPayload();
      break;
    case "arabic-raster":
      payload = buildArabicRasterTestPayload();
      break;
    default:
      console.error(
        "Unknown mode. Use: cutter | cutter-partial | hebrew | arabic | arabic-raster"
      );
      process.exit(1);
  }

  const result = await sendRawToPrinter(payload);
  console.log(
    JSON.stringify(
      {
        success: true,
        mode,
        printer: { ip: result.host, port: result.port },
        bytesSent: result.bytesSent,
        message: "Sent. Confirm paper output — PASS only after visual check.",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      null,
      2
    )
  );
  process.exit(1);
});
