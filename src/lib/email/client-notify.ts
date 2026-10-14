/**
 * Fire-and-forget email notifications from the browser.
 * Must never block order create/update/cancel.
 */

export function requestNewOrderEmailNotification(orderId: string): void {
  if (!orderId) return;
  void fetch("/api/orders/notify-new", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
    keepalive: true,
  }).catch((error) => {
    console.error("[email] Email notification failed", {
      kind: "new_order",
      stage: "client_dispatch",
      error: error instanceof Error ? error.message : "dispatch failed",
    });
  });
}

/** Queue one kitchen print job after the order is saved. Never fails the order. */
export async function requestNewOrderPrintJob(orderId: string): Promise<void> {
  if (!orderId || typeof fetch !== "function") return;
  try {
    await fetch("/api/print-jobs/enqueue-new", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
      keepalive: true,
    });
  } catch (error) {
    console.error("[PrintJob] enqueue dispatch failed", {
      orderId,
      error: error instanceof Error ? error.message : "dispatch failed",
    });
  }
}

export function requestOrderUpdatedEmailNotification(input: {
  orderId: string;
  changes: Array<{ label: string; before: string; after: string }>;
  fingerprint: string;
}): void {
  if (!input.orderId || !input.changes.length) return;
  void fetch("/api/orders/notify-updated", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch((error) => {
    console.error("[email] Email notification failed", {
      kind: "order_updated",
      stage: "client_dispatch",
      error: error instanceof Error ? error.message : "dispatch failed",
    });
  });
}

export function requestOrderCancelledEmailNotification(orderId: string): void {
  if (!orderId) return;
  void fetch("/api/orders/notify-cancelled", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
    keepalive: true,
  }).catch((error) => {
    console.error("[email] Email notification failed", {
      kind: "order_cancelled",
      stage: "client_dispatch",
      error: error instanceof Error ? error.message : "dispatch failed",
    });
  });
}

export function requestCriticalCheckoutFailureNotification(input: {
  message: string;
  code?: string;
}): void {
  if (!input.message?.trim()) return;
  void fetch("/api/orders/notify-critical", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
    keepalive: true,
  }).catch((error) => {
    console.error("[email] Email notification failed", {
      kind: "critical",
      stage: "client_dispatch",
      error: error instanceof Error ? error.message : "dispatch failed",
    });
  });
}
