/**
 * Fire-and-forget new-order email notification.
 * Must never block or fail checkout.
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
