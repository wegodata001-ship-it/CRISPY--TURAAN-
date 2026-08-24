import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import {
  escRasterBitImage,
  rgbaToMonoRaster,
  wrapRasterReceipt,
} from "@/lib/printer/raster";

const RECEIPT_WIDTH = 576;

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/segoeui.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
];

let fontFamily = "sans-serif";
let fontReady = false;

function ensureArabicFont(): void {
  if (fontReady) return;
  for (const path of FONT_CANDIDATES) {
    if (existsSync(path)) {
      GlobalFonts.registerFromPath(path, "PrinterArabic");
      fontFamily = "PrinterArabic";
      fontReady = true;
      return;
    }
  }
  fontReady = true;
}

/**
 * Render Arabic (and mixed) receipt lines to an ESC/POS raster payload.
 * Skia/canvas handles Arabic shaping + RTL when drawing logical Unicode.
 */
export function buildArabicRasterTestPayload(): Buffer {
  ensureArabicFont();

  const lines = [
    "مشكا",
    "اختبار الطابعة",
    "",
    "طلب رقم 123",
    "",
    "2 × قهوة",
    "1 × كعكة",
    "",
    "المجموع: 30 ₪",
  ];

  const paddingX = 24;
  const lineHeight = 42;
  const paddingTop = 28;
  const paddingBottom = 28;
  const height = paddingTop + lines.length * lineHeight + paddingBottom;

  const canvas = createCanvas(RECEIPT_WIDTH, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, RECEIPT_WIDTH, height);
  ctx.fillStyle = "#000000";
  ctx.textAlign = "center";
  ctx.direction = "rtl";

  lines.forEach((line, index) => {
    const y = paddingTop + index * lineHeight + lineHeight * 0.72;
    if (!line) return;
    const isTitle = index === 0;
    ctx.font = `${isTitle ? "bold " : ""}${isTitle ? 36 : 28}px "${fontFamily}"`;
    ctx.fillText(line, RECEIPT_WIDTH / 2, y, RECEIPT_WIDTH - paddingX * 2);
  });

  const image = ctx.getImageData(0, 0, RECEIPT_WIDTH, height);
  const mono = rgbaToMonoRaster(image.data, RECEIPT_WIDTH, height);
  const raster = escRasterBitImage(RECEIPT_WIDTH, height, mono);
  return wrapRasterReceipt(raster, "full");
}
