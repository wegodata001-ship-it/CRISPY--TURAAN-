import iconv from "iconv-lite";
import {
  concatBuffers,
  escAlign,
  escBold,
  escCut,
  escFeedLines,
  escInit,
  escSelectCodePage,
  textLine,
} from "@/lib/printer/escpos";
import {
  getArabicCodePageIndex,
  getArabicEncoding,
  getHebrewCodePageIndex,
  getPrinterHost,
  getPrinterPort,
} from "@/lib/printer/config";
import { toVisualOrder } from "@/lib/printer/text-rtl";

function divider(): Buffer {
  return textLine("------------------------------");
}

function encodeCpLine(logical: string, encoding: string): Buffer {
  // Thermal printers print bytes LTR — send visual order.
  const visual = toVisualOrder(logical);
  return iconv.encode(`${visual}\n`, encoding);
}

export function buildAsciiTestPayload(now = new Date()): Buffer {
  const stamp = now.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const target = `${getPrinterHost() || "PRINTER_IP"}:${getPrinterPort()}`;

  return concatBuffers(
    escInit(),
    escAlign("center"),
    escBold(true),
    textLine("================================"),
    textLine("CRISPY"),
    textLine("================================"),
    escBold(false),
    textLine("Printer test"),
    escAlign("left"),
    textLine(""),
    textLine(`Printer: ${target}`),
    textLine("Connection: TCP LAN"),
    textLine(`Date / Time: ${stamp}`),
    textLine(""),
    divider(),
    escAlign("center"),
    textLine("PRINT TEST SUCCESS"),
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}

/** Feed + single cut — one cut command only. */
export function buildCutterTestPayload(
  cut: "full" | "partial" = "full"
): Buffer {
  return concatBuffers(
    escInit(),
    escAlign("center"),
    textLine("CUTTER TEST"),
    textLine(""),
    textLine(""),
    escAlign("left"),
    escFeedLines(3),
    escCut(cut)
  );
}

/**
 * Hebrew test using CP862 + Unicode BiDi visual order.
 * Shekel may not exist in CP862 — printed as "ILS".
 */
export function buildHebrewTestPayload(): Buffer {
  const lines = [
    "בדיקת מדפסת",
    "הזמנה מספר 123",
    "קפה",
    "עוגה",
    "סה״כ 30 ILS",
  ];

  return concatBuffers(
    escInit(),
    escSelectCodePage(getHebrewCodePageIndex()),
    escAlign("center"),
    escBold(true),
    encodeCpLine("בדיקת עברית", "cp862"),
    escBold(false),
    escAlign("right"),
    ...lines.map((line) => encodeCpLine(line, "cp862")),
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}

/**
 * Arabic ESC/POS text mode (experimental).
 * Shapes + BiDi, then encodes to configured code page.
 * If glyphs are disconnected / wrong on paper → use raster instead.
 */
export function buildArabicTextTestPayload(): Buffer {
  const encoding = getArabicEncoding();
  const lines = [
    "اختبار الطابعة",
    "طلب رقم 123",
    "قهوة",
    "كعكة",
    "المجموع 30 ILS",
  ];

  const encodeAr = (logical: string): Buffer => {
    // Code pages store isolated letters — shaping presentation forms usually
    // cannot be encoded. Send BiDi visual order of logical Arabic for the text test.
    const visual = toVisualOrder(logical);
    return iconv.encode(`${visual}\n`, encoding);
  };

  return concatBuffers(
    escInit(),
    escSelectCodePage(getArabicCodePageIndex()),
    escAlign("center"),
    escBold(true),
    encodeAr("اختبار عربي"),
    escBold(false),
    escAlign("right"),
    ...lines.map(encodeAr),
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}
