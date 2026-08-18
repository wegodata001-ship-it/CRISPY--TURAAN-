import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { PDFDocument } from "pdf-lib";

const ARABIC_SAMPLES = ["مشروبات ساخنة", "نسكافيه", "إسبريسو", "الشوكولاتة الساخنة"];
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const root = process.cwd();
  const outDir = path.join(root, "tests/output");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "mishkat-menu-2026-08-18-design.pdf");

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[PDF_EXPORT") || msg.type() === "error") {
      console.log(`[browser:${msg.type()}] ${text}`);
    }
  });
  page.on("pageerror", (err) => {
    console.error("[browser:pageerror]", err.message);
  });

  await page.goto(process.env.PDF_SMOKE_URL || "http://127.0.0.1:3000/pdf-smoke", { waitUntil: "domcontentloaded", timeout: 60000 });

  const result = await page.waitForFunction(
    () => window.__PDF_EXPORT_RESULT,
    null,
    { timeout: 180000 }
  ).then(() => page.evaluate(() => window.__PDF_EXPORT_RESULT));

  const pageIds = ["cover", "elegant", "two-small", "few", "dense", "images", "promo", "split"];
  for (const id of pageIds) {
    const handle = page.locator(`[data-testid="smoke-page-${id}"]`);
    await handle.waitFor({ timeout: 30000 });
    await handle.screenshot({ path: path.join(outDir, `smoke-page-${id}.png`) });
  }

  await browser.close();

  if (!result?.ok || !result.b64) {
    await writeFile(path.join(outDir, "pdf-smoke-report.json"), JSON.stringify(result, null, 2), "utf8");
    throw new Error(`EXPORT_FAILED:${result?.message ?? "no result"}`);
  }

  const bytes = Buffer.from(result.b64, "base64");
  await writeFile(outPath, bytes);

  if (bytes.length < 2500) {
    throw new Error(`PDF_FILE_TOO_SMALL:${bytes.length}`);
  }
  if (!bytes.subarray(0, 5).toString("utf8").startsWith("%PDF-")) {
    throw new Error("PDF_BAD_HEADER");
  }

  const pdf = await PDFDocument.load(bytes);
  const pageCount = pdf.getPageCount();
  const asUtf8 = bytes.toString("utf8");
  const asUtf16 = bytes.toString("utf16le");
  const arabicHits = ARABIC_SAMPLES.filter((word) => asUtf8.includes(word) || asUtf16.includes(word));

  const report = {
    exportClicked: true,
    exportRootCreated: true,
    filename: result.filename,
    fileSize: bytes.length,
    mime: result.mime,
    pageCount,
    expectedPages: 8,
    header: bytes.subarray(0, 8).toString("utf8"),
    fileOpens: true,
    secondRunOk: result.secondRunOk,
    arabicExtractableFromPdfBytes: arabicHits,
    note: "Raster PDF (html2canvas-pro + jsPDF) may not contain extractable text; visual check uses smoke-page-*.png",
  };

  await writeFile(path.join(outDir, "pdf-smoke-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (pageCount !== 8) {
    throw new Error(`PDF_PAGE_COUNT:${pageCount}`);
  }
}

main().catch((error) => {
  console.error("[PDF_SMOKE_FAILED]", error);
  process.exit(1);
});
