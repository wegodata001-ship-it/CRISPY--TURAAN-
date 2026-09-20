/** Local thermal printer config — LAN only, never call from Vercel. */

export function getPrinterHost(): string {
  return process.env.PRINTER_IP?.trim() || "192.168.1.87";
}

export function getPrinterPort(): number {
  const raw = Number(process.env.PRINTER_PORT || 9100);
  return Number.isFinite(raw) && raw > 0 ? raw : 9100;
}

export function getPrinterTimeoutMs(): number {
  const raw = Number(process.env.PRINTER_TIMEOUT_MS || 8000);
  return Number.isFinite(raw) && raw >= 1000 ? raw : 8000;
}

/**
 * Epson ESC t n index for Hebrew (CP862). Model-dependent — override via env if needed.
 * Many ESC/POS firmwares map Hebrew CP862 around 36.
 */
export function getHebrewCodePageIndex(): number {
  const raw = Number(process.env.PRINTER_HEBREW_CODEPAGE_INDEX || 36);
  return Number.isFinite(raw) && raw >= 0 ? raw : 36;
}

/**
 * Epson ESC t n for Arabic. Firmware-dependent — override after checking paper output.
 * Default 37 is a common PC864 slot on Epson-compatible tables.
 */
export function getArabicCodePageIndex(): number {
  const raw = Number(process.env.PRINTER_ARABIC_CODEPAGE_INDEX || 37);
  return Number.isFinite(raw) && raw >= 0 ? raw : 37;
}

/** iconv-lite encoding name for Arabic text-mode tests. */
export function getArabicEncoding(): string {
  const raw = (process.env.PRINTER_ARABIC_ENCODING || "cp864").trim().toLowerCase();
  if (raw === "windows-1256" || raw === "cp1256") return "windows-1256";
  if (raw === "iso-8859-6") return "iso-8859-6";
  if (raw === "cp720") return "cp720";
  return "cp864";
}

/**
 * Allow printer test APIs:
 * - Always blocked in production unless ENABLE_LOCAL_PRINTER_TEST=true
 * - In development, allowed (local LAN testing)
 */
export function isPrinterTestAllowed(): boolean {
  if (process.env.ENABLE_LOCAL_PRINTER_TEST === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export function printerTestBlockedResponse(): Response {
  return Response.json(
    {
      success: false,
      message:
        "Printer test is disabled. Run locally and set ENABLE_LOCAL_PRINTER_TEST=true if needed. Never use Vercel for LAN printers.",
    },
    { status: 403 }
  );
}
