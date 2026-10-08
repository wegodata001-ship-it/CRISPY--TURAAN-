/**
 * Local printer phase tests — no Next.js / no auth.
 * Usage (from repo root, same LAN as printer):
 *   npx tsx scripts/printer-phase-test.mts cutter
 *   npx tsx scripts/printer-phase-test.mts cutter-partial
 *   npx tsx scripts/printer-phase-test.mts hebrew
 *   npx tsx scripts/printer-phase-test.mts arabic
 *   npx tsx scripts/printer-phase-test.mts arabic-raster
 *   npx tsx scripts/printer-phase-test.mts receipt-ar
 *   npx tsx scripts/printer-phase-test.mts receipt-he
 *   npx tsx scripts/printer-phase-test.mts receipt-en
 */
import "dotenv/config";
import { probePrinterConnection, sendRawToPrinter } from "../src/lib/printer/tcp";
import {
  buildArabicTextTestPayload,
  buildAsciiTestPayload,
  buildCutterTestPayload,
  buildHebrewTestPayload,
} from "../src/lib/printer/test-payloads";
import { buildArabicRasterTestPayload } from "../src/lib/printer/arabic-raster";
import { buildReceiptPrintPayload } from "../src/lib/printer/receipt-raster";
import { buildTestReceiptModel } from "../src/lib/print-jobs/test-receipt";
import { getPrinterHost, getPrinterPort } from "../src/lib/printer/config";
import type { PrintLocale } from "../src/lib/print-jobs/types";

async function main() {
  const mode = (process.argv[2] || "cutter").toLowerCase();
  const host = getPrinterHost();
  const port = getPrinterPort();
  console.log(`[printer-phase-test] target ${host}:${port} mode=${mode}`);

  if (mode === "probe") {
    const result = await probePrinterConnection();
    console.log(JSON.stringify({ success: true, mode, printer: result }, null, 2));
    return;
  }

  let payload: Buffer;
  switch (mode) {
    case "ascii":
    case "test":
      payload = buildAsciiTestPayload();
      break;
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
      payload = await buildArabicRasterTestPayload();
      break;
    case "receipt-ar":
    case "receipt-he":
    case "receipt-en": {
      const locale = mode.slice("receipt-".length) as PrintLocale;
      payload = await buildReceiptPrintPayload(buildTestReceiptModel(locale), "full");
      break;
    }
    default:
      console.error(
        "Unknown mode. Use: probe | ascii | cutter | cutter-partial | hebrew | arabic | arabic-raster | receipt-ar | receipt-he | receipt-en"
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
