import { existsSync } from "node:fs";
import {
  escRasterBitImage,
  rgbaToMonoRaster,
  wrapRasterReceipt,
} from "@/lib/printer/raster";
import { formatMoney, receiptUiLabels } from "@/lib/print-jobs/receipt-model";
import type { ReceiptModel } from "@/lib/print-jobs/types";

/** 80mm thermal, 576 dots wide. */
export const RECEIPT_WIDTH_PX = 576;

/**
 * Typography scale — everything is intentionally large.
 * Longer receipt is OK; kitchen must read it at a glance.
 */
const FONT = {
  banner: 24, // "TEST PRINT" banner (test-only)
  brandTitle: 56, // CRISPY
  brandSecondary: 30, // secondary script line under brand
  headline: 34, // "NEW ORDER" / "طلب جديد" / "הזמנה חדשה"
  orderNumber: 52, // #1234
  dateTime: 28, // date / time meta
  sectionLabel: 26, // "Customer:", "Phone:", "NOTES:", "Payment:"
  customerName: 40, // customer + phone value
  itemsHeader: 32, // "ITEMS" / "الأصناف"
  productName: 42, // 2 × Cappuccino
  modifier: 32, // - Large / - Soy milk
  itemNote: 32, // per-item kitchen note
  itemPrice: 38, // per-item line total
  orderNote: 34, // order-level note lines
  subtotal: 30, // subtotal / discount rows
  totalLabel: 40, // "TOTAL:" label
  totalAmount: 60, // 62.00 ₪
  paymentValue: 36, // Cash / Card / نقداً
  pickupPrimary: 50, // primary pickup label (locale)
  pickupSecondary: 30, // other-language pickup lines
  createdAt: 26, // "Order created at: 12:35"
  ruleThickness: 4,
} as const;

/**
 * Vertical rhythm — sections breathe. Multiplied against font size.
 * Longer receipt is OK per spec.
 */
const LINE_GAP = 10;
const SECTION_GAP_LARGE = 32;
const SECTION_GAP_MEDIUM = 20;
const SECTION_GAP_SMALL = 12;

const PADDING_X = 24;
const PADDING_TOP = 28;
const PADDING_BOTTOM = 36;

const FONT_CANDIDATES = [
  "C:/Windows/Fonts/segoeuib.ttf",
  "C:/Windows/Fonts/arialbd.ttf",
  "C:/Windows/Fonts/segoeui.ttf",
  "C:/Windows/Fonts/arial.ttf",
  "C:/Windows/Fonts/tahoma.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
];

type Align = "center" | "start" | "end";

type DrawOp =
  | { kind: "gap"; h: number }
  | { kind: "rule"; heavy?: boolean }
  | {
      kind: "text";
      text: string;
      size: number;
      bold?: boolean;
      align?: Align;
      dir?: "rtl" | "ltr";
    };

function isRtl(locale: ReceiptModel["locale"]): boolean {
  return locale === "ar" || locale === "he";
}

function rule(heavy = false): DrawOp {
  return { kind: "rule", heavy };
}

function gap(h: number): DrawOp {
  return { kind: "gap", h };
}

function text(
  content: string,
  size: number,
  opts?: { bold?: boolean; align?: Align; dir?: "rtl" | "ltr" }
): DrawOp {
  return {
    kind: "text",
    text: content,
    size,
    bold: opts?.bold,
    align: opts?.align,
    dir: opts?.dir,
  };
}

export async function renderReceiptRaster(
  model: ReceiptModel
): Promise<{ raster: Buffer; width: number; height: number }> {
  const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");

  let fontFamily = "sans-serif";
  for (const path of FONT_CANDIDATES) {
    if (existsSync(path)) {
      GlobalFonts.registerFromPath(path, "CrispyReceipt");
      fontFamily = "CrispyReceipt";
      break;
    }
  }

  const labels = receiptUiLabels(model.locale);
  const rtl = isRtl(model.locale);
  const dir: "rtl" | "ltr" = rtl ? "rtl" : "ltr";
  const priceAlign: Align = rtl ? "start" : "end";
  const ops: DrawOp[] = [];

  if (model.isTest) {
    ops.push(text(labels.testBanner, FONT.banner, { bold: true, align: "center" }));
    ops.push(gap(SECTION_GAP_SMALL));
  }
  if (model.isReprint) {
    ops.push(text(labels.reprintBanner, FONT.banner, { bold: true, align: "center" }));
    ops.push(gap(SECTION_GAP_SMALL));
  }

  // Header banner
  ops.push(rule(true));
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(text(model.brand, FONT.brandTitle, { bold: true, align: "center" }));
  if (model.brandSecondary) {
    ops.push(gap(6));
    ops.push(text(model.brandSecondary, FONT.brandSecondary, { align: "center" }));
  }
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(text(model.headline, FONT.headline, { bold: true, align: "center" }));
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(
    text(model.orderNumber, FONT.orderNumber, { bold: true, align: "center", dir: "ltr" })
  );
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(rule(true));

  // Date / time
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(text(`${labels.date}: ${model.date}`, FONT.dateTime, { align: "center" }));
  ops.push(text(`${labels.time}: ${model.time}`, FONT.dateTime, { align: "center", dir: "ltr" }));
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(rule());
  ops.push(gap(SECTION_GAP_MEDIUM));

  // Customer
  ops.push(text(`${labels.customer}:`, FONT.sectionLabel, { bold: true, align: "start" }));
  ops.push(gap(6));
  ops.push(text(model.customerName, FONT.customerName, { bold: true, align: "start" }));
  if (model.customerPhone) {
    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(text(`${labels.phone}:`, FONT.sectionLabel, { bold: true, align: "start" }));
    ops.push(gap(6));
    ops.push(
      text(model.customerPhone, FONT.customerName, {
        bold: true,
        align: "start",
        dir: "ltr",
      })
    );
  }
  if (model.address) {
    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(text(`${labels.address}:`, FONT.sectionLabel, { bold: true, align: "start" }));
    ops.push(gap(6));
    ops.push(text(model.address, FONT.customerName, { bold: true, align: "start" }));
  }

  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(rule());
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(text(labels.items, FONT.itemsHeader, { bold: true, align: "center" }));
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(rule());

  // Items — each item on multiple lines
  model.items.forEach((item, index) => {
    ops.push(gap(SECTION_GAP_MEDIUM));
    ops.push(
      text(`${item.quantity} × ${item.name}`, FONT.productName, {
        bold: true,
        align: "start",
      })
    );

    if (item.modifiers.length > 0) {
      ops.push(gap(SECTION_GAP_SMALL));
      for (const mod of item.modifiers) {
        ops.push(text(`  - ${mod.label}`, FONT.modifier, { align: "start" }));
      }
    }

    if (item.notes) {
      ops.push(gap(SECTION_GAP_SMALL));
      ops.push(text(`  ${item.notes}`, FONT.itemNote, { bold: true, align: "start" }));
    }

    if (item.unitPrice != null) {
      ops.push(gap(6));
      ops.push(
        text(`${labels.unitPrice}: ${formatMoney(item.unitPrice)}`, FONT.modifier, {
          align: "start",
          dir: "ltr",
        })
      );
    }

    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(
      text(formatMoney(item.lineTotal), FONT.itemPrice, {
        bold: true,
        align: priceAlign,
        dir: "ltr",
      })
    );
    ops.push(gap(SECTION_GAP_SMALL));

    if (index < model.items.length - 1) {
      ops.push(rule());
    }
  });

  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(rule());

  // Order-level notes — extra emphasis
  if (model.notes) {
    ops.push(gap(SECTION_GAP_MEDIUM));
    ops.push(text(`${labels.notes}:`, FONT.sectionLabel, { bold: true, align: "start" }));
    ops.push(gap(SECTION_GAP_SMALL));
    for (const line of model.notes.split(/\n/)) {
      if (!line.trim()) continue;
      ops.push(text(line, FONT.orderNote, { bold: true, align: "start" }));
    }
    ops.push(gap(SECTION_GAP_MEDIUM));
    ops.push(rule());
  }

  // Subtotal / discount (only shown if a discount was applied)
  if (model.subtotal != null) {
    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(text(`${labels.subtotal}: ${formatMoney(model.subtotal)}`, FONT.subtotal, { align: "start" }));
  }
  if (model.discount != null) {
    ops.push(text(`${labels.discount}: ${formatMoney(model.discount)}`, FONT.subtotal, { align: "start" }));
  }
  if (model.deliveryFee != null) {
    ops.push(
      text(`${labels.deliveryFee}: ${formatMoney(model.deliveryFee)}`, FONT.subtotal, { align: "start" })
    );
  }

  // TOTAL — biggest single line on the ticket
  ops.push(gap(SECTION_GAP_LARGE));
  ops.push(text(`${labels.total}:`, FONT.totalLabel, { bold: true, align: "center" }));
  ops.push(gap(SECTION_GAP_SMALL));
  ops.push(
    text(formatMoney(model.total), FONT.totalAmount, {
      bold: true,
      align: "center",
      dir: "ltr",
    })
  );
  ops.push(gap(SECTION_GAP_LARGE));
  ops.push(rule());

  // Payment
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(text(`${labels.payment}:`, FONT.sectionLabel, { bold: true, align: "start" }));
  ops.push(gap(6));
  ops.push(text(model.paymentLabel, FONT.paymentValue, { bold: true, align: "start" }));
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(rule(true));

  const fulfillment = model.fulfillmentLabel || model.pickupLabel;
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(text(`${labels.orderType}:`, FONT.sectionLabel, { bold: true, align: "center" }));
  ops.push(gap(6));
  ops.push(text(fulfillment, FONT.pickupPrimary, { bold: true, align: "center" }));
  if (model.orderType !== "delivery") {
    ops.push(gap(SECTION_GAP_SMALL));
    if (model.locale === "ar") {
      ops.push(text("PICKUP ONLY", FONT.pickupSecondary, { align: "center", dir: "ltr" }));
      ops.push(text("איסוף עצמי", FONT.pickupSecondary, { align: "center" }));
    } else if (model.locale === "he") {
      ops.push(text("PICKUP ONLY", FONT.pickupSecondary, { align: "center", dir: "ltr" }));
      ops.push(text("استلام ذاتي", FONT.pickupSecondary, { align: "center" }));
    } else {
      ops.push(text("استلام ذاتي", FONT.pickupSecondary, { align: "center" }));
      ops.push(text("איסוף עצמי", FONT.pickupSecondary, { align: "center" }));
    }
  }
  ops.push(gap(SECTION_GAP_MEDIUM));
  ops.push(rule(true));

  if (model.orderNumber) {
    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(
      text(model.orderNumber, FONT.orderNumber, { bold: true, align: "center", dir: "ltr" })
    );
  }

  if (model.createdTime) {
    ops.push(gap(SECTION_GAP_SMALL));
    ops.push(
      text(`${labels.createdAt}: ${model.createdTime}`, FONT.createdAt, {
        align: "center",
        dir: "ltr",
      })
    );
  }

  // Compute canvas height
  let height = PADDING_TOP + PADDING_BOTTOM;
  for (const op of ops) {
    if (op.kind === "gap") height += op.h;
    else if (op.kind === "rule") height += FONT.ruleThickness + 12;
    else height += op.size + LINE_GAP;
  }

  const canvas = createCanvas(RECEIPT_WIDTH_PX, height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, RECEIPT_WIDTH_PX, height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  const font = (size: number, bold?: boolean) =>
    `${bold ? "bold " : ""}${size}px "${fontFamily}"`;

  const drawText = (
    content: string,
    y: number,
    size: number,
    align: Align,
    bold: boolean | undefined,
    textDir: "rtl" | "ltr"
  ) => {
    ctx.font = font(size, bold);
    ctx.direction = textDir;
    const maxWidth = RECEIPT_WIDTH_PX - PADDING_X * 2;
    if (align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(content, RECEIPT_WIDTH_PX / 2, y, maxWidth);
      return;
    }
    if (textDir === "rtl") {
      ctx.textAlign = align === "end" ? "left" : "right";
      const x = align === "end" ? PADDING_X : RECEIPT_WIDTH_PX - PADDING_X;
      ctx.fillText(content, x, y, maxWidth);
      return;
    }
    ctx.textAlign = align === "end" ? "right" : "left";
    const x = align === "end" ? RECEIPT_WIDTH_PX - PADDING_X : PADDING_X;
    ctx.fillText(content, x, y, maxWidth);
  };

  let y = PADDING_TOP;
  for (const op of ops) {
    if (op.kind === "gap") {
      y += op.h;
      continue;
    }
    if (op.kind === "rule") {
      y += 6;
      const thickness = op.heavy ? FONT.ruleThickness + 2 : FONT.ruleThickness;
      if (op.heavy) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(PADDING_X, y, RECEIPT_WIDTH_PX - PADDING_X * 2, thickness);
      } else {
        ctx.fillStyle = "#000000";
        for (let x = PADDING_X; x < RECEIPT_WIDTH_PX - PADDING_X; x += 12) {
          ctx.fillRect(x, y, 8, thickness);
        }
      }
      y += thickness + 6;
      continue;
    }
    y += op.size;
    drawText(op.text, y, op.size, op.align ?? "start", op.bold, op.dir ?? dir);
    y += LINE_GAP;
  }

  const image = ctx.getImageData(0, 0, RECEIPT_WIDTH_PX, height);
  const mono = rgbaToMonoRaster(image.data, RECEIPT_WIDTH_PX, height);
  const raster = escRasterBitImage(RECEIPT_WIDTH_PX, height, mono);
  return { raster, width: RECEIPT_WIDTH_PX, height };
}

export async function buildReceiptPrintPayload(
  model: ReceiptModel,
  cut: "full" | "partial" | "none" = "none"
): Promise<Buffer> {
  const { raster } = await renderReceiptRaster(model);
  return wrapRasterReceipt(raster, cut);
}
