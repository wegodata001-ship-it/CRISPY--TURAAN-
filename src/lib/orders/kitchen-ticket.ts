import type { Order } from "@/types";
import { formatPrice } from "@/lib/utils";
import {
  browserKitchenPrintBlockReason,
  canPrintKitchenTicketBrowser,
  kitchenActionBlockMessage,
} from "@/lib/orders/kitchen-action-gate";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTicketDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function orderTypeLabel(order: Order): string {
  if (order.orderType === "delivery") return "משלוח";
  if (order.orderType === "pickup") return "איסוף עצמי";
  return "";
}

const TICKET_STYLES = `
  :root {
    --ink: #1c1410;
    --muted: #6b5a4e;
    --line: #d6c8b8;
    --soft: #f7f1ea;
    --accent: #0d7377;
    --note: #7a3e12;
  }
  * { box-sizing: border-box; }
  @page { margin: 8mm; size: auto; }
  body {
    margin: 0;
    padding: 16px;
    color: var(--ink);
    background: #efe6db;
    font-family: "Segoe UI", Tahoma, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket {
    width: 100%;
    max-width: 340px;
    margin: 0 auto;
    padding: 20px 18px 18px;
    background: #fffefb;
    border: 1px solid var(--line);
    border-radius: 16px;
    box-shadow: 0 10px 28px rgba(44, 24, 16, 0.1);
  }
  .brand {
    text-align: center;
    letter-spacing: 0.14em;
    font-size: 12px;
    font-weight: 700;
    color: var(--accent);
    margin: 0 0 6px;
  }
  .order-no {
    text-align: center;
    margin: 0;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: 0.02em;
  }
  .meta {
    text-align: center;
    margin: 8px 0 0;
    font-size: 13px;
    color: var(--muted);
  }
  .badge-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 12px;
  }
  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid #b7ddd9;
    background: #e8f6f5;
    color: var(--accent);
    font-size: 12px;
    font-weight: 700;
  }
  .rule {
    height: 1px;
    margin: 16px 0;
    background: repeating-linear-gradient(
      to left,
      var(--line) 0 7px,
      transparent 7px 12px
    );
  }
  .items { display: grid; gap: 14px; }
  .item { break-inside: avoid; }
  .item-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .qty {
    flex: 0 0 auto;
    min-width: 2rem;
    padding: 2px 8px;
    border-radius: 8px;
    background: var(--ink);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
    line-height: 1.5;
  }
  .name {
    flex: 1;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.35;
  }
  .price {
    flex: 0 0 auto;
    font-size: 14px;
    font-weight: 700;
    color: var(--muted);
    white-space: nowrap;
  }
  .mods {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .mods li {
    position: relative;
    padding-inline-start: 14px;
    font-size: 14px;
    line-height: 1.4;
  }
  .mods li::before {
    content: "+";
    position: absolute;
    inset-inline-start: 0;
    color: var(--accent);
    font-weight: 800;
  }
  .mods li.note {
    font-weight: 700;
    color: var(--note);
  }
  .mods li.note::before { content: "•"; color: var(--note); }
  .info {
    display: grid;
    gap: 8px;
    font-size: 14px;
  }
  .info-row {
    display: flex;
    gap: 8px;
    align-items: baseline;
  }
  .info-label {
    flex: 0 0 auto;
    font-weight: 700;
    color: var(--muted);
  }
  .info-value { flex: 1; font-weight: 600; }
  .note-box {
    margin-top: 2px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff6e8;
    border: 1px solid #efd3a8;
    font-weight: 700;
    line-height: 1.45;
  }
  .total {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--ink);
    color: #fffefb;
  }
  .total-label { font-size: 14px; font-weight: 700; opacity: 0.85; }
  .total-value { font-size: 22px; font-weight: 800; letter-spacing: 0.01em; }
  .footer-hint {
    margin: 14px 0 0;
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .ticket {
      max-width: none;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      padding: 0;
    }
    .qty, .total { background: #000; }
  }
`;

export function kitchenTicketHtml(order: Order): string {
  const type = orderTypeLabel(order);
  const phone = order.customerPhone?.trim() || "";
  const customer = order.customerName?.trim() || "";

  const items = order.items
    .map((item) => {
      const modifiers = [
        ...(item.modifiers?.map((modifier) => {
          const qty = modifier.quantity > 1 ? ` ×${modifier.quantity}` : "";
          const note = modifier.kitchenNote
            ? ` — ${escapeHtml(modifier.kitchenNote)}`
            : "";
          return `<li>${escapeHtml(modifier.optionName)}${qty}${note}</li>`;
        }) ?? []),
        ...(item.kitchenNotes?.map(
          (note) => `<li class="note">${escapeHtml(note)}</li>`
        ) ?? []),
        ...(item.notes
          ? [`<li class="note">${escapeHtml(item.notes)}</li>`]
          : []),
      ].join("");

      return `
        <section class="item">
          <div class="item-head">
            <span class="qty">${item.quantity}×</span>
            <span class="name">${escapeHtml(item.productName)}</span>
            <span class="price">${escapeHtml(formatPrice(item.price))}</span>
          </div>
          ${modifiers ? `<ul class="mods">${modifiers}</ul>` : ""}
        </section>`;
    })
    .join("");

  const infoRows: string[] = [];
  if (customer) {
    infoRows.push(
      `<div class="info-row"><span class="info-label">לקוח</span><span class="info-value">${escapeHtml(customer)}</span></div>`
    );
  }
  if (phone) {
    infoRows.push(
      `<div class="info-row"><span class="info-label">טלפון</span><span class="info-value" dir="ltr">${escapeHtml(phone)}</span></div>`
    );
  }
  if (order.deliveryAddress?.trim()) {
    infoRows.push(
      `<div class="info-row"><span class="info-label">כתובת</span><span class="info-value">${escapeHtml(order.deliveryAddress.trim())}</span></div>`
    );
  }

  return `
    <style>${TICKET_STYLES}</style>
    <article class="ticket" dir="rtl">
      <p class="brand">CRISPY</p>
      <h1 class="order-no">#${escapeHtml(order.orderNumber)}</h1>
      <p class="meta">${escapeHtml(formatTicketDate(order.createdAt))}</p>
      ${
        type
          ? `<div class="badge-row"><span class="badge">${escapeHtml(type)}</span></div>`
          : ""
      }
      <div class="rule" aria-hidden="true"></div>
      <div class="items">${items}</div>
      <div class="rule" aria-hidden="true"></div>
      ${
        infoRows.length
          ? `<section class="info">${infoRows.join("")}</section><div class="rule" aria-hidden="true"></div>`
          : ""
      }
      ${
        order.notes?.trim()
          ? `<section class="info"><div class="info-label">הערה להזמנה</div><div class="note-box">${escapeHtml(order.notes.trim())}</div></section><div class="rule" aria-hidden="true"></div>`
          : ""
      }
      <div class="total">
        <span class="total-label">סה״כ לתשלום</span>
        <span class="total-value">${escapeHtml(formatPrice(order.total))}</span>
      </div>
      <p class="footer-hint">כרטיס מטבח · Mishkat</p>
    </article>`;
}

export function printKitchenTicket(order: Order): { ok: true } | { ok: false; reason: string; message: string } {
  if (!canPrintKitchenTicketBrowser(order)) {
    const reason = browserKitchenPrintBlockReason(order) || "awaiting_online_payment";
    return { ok: false, reason, message: kitchenActionBlockMessage(reason) };
  }
  const printWindow = window.open("", "_blank", "width=440,height=780");
  if (!printWindow) return { ok: false, reason: "popup_blocked", message: "Could not open print window" };
  printWindow.document.write(`<!doctype html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(order.orderNumber)}</title>
      </head>
      <body>${kitchenTicketHtml(order)}</body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return { ok: true };
}
