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
import { getHebrewCodePageIndex } from "@/lib/printer/config";

function divider(): Buffer {
  return textLine("------------------------------");
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

  return concatBuffers(
    escInit(),
    escAlign("center"),
    escBold(true),
    textLine("MISHKAH PRINTER TEST"),
    escBold(false),
    divider(),
    textLine("Printer connection OK"),
    escAlign("left"),
    textLine(""),
    textLine("Order: TEST-001"),
    textLine("Coffee x 2"),
    textLine("Cake x 1"),
    textLine(""),
    textLine("Total: 30.00"),
    textLine(""),
    textLine(`Date: ${stamp}`),
    textLine(""),
    divider(),
    escAlign("center"),
    textLine("PRINT TEST SUCCESS"),
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}

/** Feed + cut only — after ASCII works, verify cutter alone. */
export function buildCutterTestPayload(): Buffer {
  return concatBuffers(
    escInit(),
    escAlign("center"),
    textLine("CUTTER TEST"),
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}

/**
 * Hebrew test using CP862 (printer default code page per self-test).
 * Requires the printer ESC t index to match firmware tables.
 */
export function buildHebrewTestPayload(): Buffer {
  const lines = [
    "בדיקת מדפסת",
    "הזמנה מספר 123",
    "קפה",
    "עוגה",
    "סה״כ",
  ];

  const encoded = lines.map((line) => {
    const body = iconv.encode(`${line}\n`, "cp862");
    return body;
  });

  return concatBuffers(
    escInit(),
    escSelectCodePage(getHebrewCodePageIndex()),
    escAlign("center"),
    escBold(true),
    iconv.encode("בדיקת עברית\n", "cp862"),
    escBold(false),
    escAlign("right"),
    ...encoded,
    escAlign("left"),
    escFeedLines(4),
    escCut("full")
  );
}
