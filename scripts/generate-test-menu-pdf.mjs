import { accessSync, constants } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const execFileAsync = promisify(execFile);

const CHROME_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

const ARABIC_SAMPLES = ["مشروبات ساخنة", "نسكافيه", "إسبريسو", "الشوكولاتة الساخنة", "القهوة", "الشاي"];

function chromePath(): string {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      try {
        accessSync(candidate, constants.F_OK);
        return candidate;
      } catch {
        /* try next */
      }
    }
  }
  throw new Error("Chrome/Edge not found for PDF smoke test");
}

async function main() {
  const root = process.cwd();
  const htmlPath = path.join(root, "tests/fixtures/menu-pdf-smoke.html");
  const outDir = path.join(root, "tests/output");
  const outPath = path.join(outDir, "mishkat-menu-2026-08-18.pdf");
  await mkdir(outDir, { recursive: true });

  const fileUrl = `file:///${htmlPath.replace(/\\/g, "/")}`;
  const chrome = chromePath();

  await execFileAsync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    `--print-to-pdf=${outPath}`,
    fileUrl,
  ], { timeout: 30000 });

  const bytes = await readFile(outPath);
  if (bytes.length < 2500) {
    throw new Error(`PDF_FILE_TOO_SMALL:${bytes.length}`);
  }
  if (!bytes.subarray(0, 5).toString("utf8").startsWith("%PDF-")) {
    throw new Error("PDF_BAD_HEADER");
  }

  const pdf = await PDFDocument.load(bytes);
  const pageCount = pdf.getPageCount();
  if (pageCount !== 3) {
    throw new Error(`PDF_PAGE_COUNT:${pageCount}`);
  }

  const asUtf8 = bytes.toString("utf8");
  const asUtf16 = bytes.toString("utf16le");
  const arabicFound = ARABIC_SAMPLES.filter(
    (word) => asUtf8.includes(word) || asUtf16.includes(word)
  );

  const report = {
    filename: path.basename(outPath),
    fileSize: bytes.length,
    mime: "application/pdf",
    pageCount,
    header: bytes.subarray(0, 8).toString("utf8"),
    arabicHits: arabicFound,
    fileOpens: true,
  };

  await writeFile(path.join(outDir, "pdf-smoke-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (arabicFound.length < 3) {
    console.warn("Arabic strings were not all extractable (may be subset-embedded). Visual check required.");
  }
}

main().catch((error) => {
  console.error("[PDF_SMOKE_FAILED]", error);
  process.exit(1);
});
