import type { Order } from "@/types";
import { formatPrice } from "@/lib/utils";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function kitchenTicketHtml(order: Order): string {
  const items = order.items
    .map((item) => {
      const modifiers = [
        ...(item.modifiers?.map(
          (modifier) =>
            `<li>+ ${escapeHtml(modifier.optionName)}${
              modifier.quantity > 1 ? ` ×${modifier.quantity}` : ""
            }${modifier.kitchenNote ? ` — ${escapeHtml(modifier.kitchenNote)}` : ""}</li>`
        ) ?? []),
        ...(item.kitchenNotes?.map((note) => `<li>${escapeHtml(note)}</li>`) ?? []),
        ...(item.notes ? [`<li class="note">${escapeHtml(item.notes)}</li>`] : []),
      ].join("");
      return `<section class="item"><strong>${item.quantity}× ${escapeHtml(item.productName)}</strong>${
        modifiers ? `<ul>${modifiers}</ul>` : ""
      }</section>`;
    })
    .join("");

  return `
    <main dir="rtl">
      <header>
        <h1>MISHKAT CAFÉ</h1>
        <h2>#${escapeHtml(order.orderNumber)}</h2>
        <p>${new Date(order.createdAt).toLocaleString()}</p>
      </header>
      <hr />
      ${items}
      ${
        order.notes
          ? `<hr /><section><strong>הערה:</strong><p class="order-note">${escapeHtml(order.notes)}</p></section>`
          : ""
      }
      <hr />
      <footer><strong>סה״כ: ${escapeHtml(formatPrice(order.total))}</strong></footer>
    </main>`;
}

export function printKitchenTicket(order: Order): void {
  const printWindow = window.open("", "_blank", "width=520,height=760");
  if (!printWindow) return;
  printWindow.document.write(`<!doctype html>
    <html lang="he" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(order.orderNumber)}</title>
        <style>
          @page { margin: 10mm; }
          body { margin: 0; color: #111; font-family: Arial, sans-serif; font-size: 18px; }
          main { max-width: 360px; margin: 0 auto; }
          header { text-align: center; }
          h1 { margin: 0; font-size: 24px; }
          h2 { margin: 8px 0 2px; font-size: 23px; }
          p { margin: 4px 0; }
          hr { border: 0; border-top: 2px dashed #111; margin: 14px 0; }
          .item { margin: 0 0 16px; break-inside: avoid; }
          .item > strong { font-size: 21px; }
          ul { margin: 7px 0 0; padding-inline-start: 22px; }
          li { margin: 4px 0; }
          .note, .order-note { font-weight: 700; }
          footer { text-align: center; font-size: 22px; }
        </style>
      </head>
      <body>${kitchenTicketHtml(order)}</body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
