import { createHypClient } from "./client";
import { loadHypPayConfig } from "./config";
import { createOrReuseHypCheckoutPayment } from "./create-checkout-payment";
import { createOrReuseHypStagingMockPayment, isHypStagingMockEnabled } from "./staging-mock";
import type { HypHttpGet } from "./types";

/** Server helper: SIGN a hosted page for an already-saved unpaid card order. */
export async function issueHypPaymentUrlForOrder(input: {
  requestId: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  customerName?: string;
  cell?: string;
  couponCode?: string;
  existingPaymentUrl?: string | null;
  existingOrderRef?: string | null;
  httpGet?: HypHttpGet;
}) {
  if (isHypStagingMockEnabled()) {
    return createOrReuseHypStagingMockPayment({
      requestId: input.requestId,
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      amount: input.amount,
      existingPaymentUrl: input.existingPaymentUrl,
      existingOrderRef: input.existingOrderRef,
    });
  }

  const config = loadHypPayConfig();
  const client = createHypClient({ ...config, httpGet: input.httpGet });
  return createOrReuseHypCheckoutPayment({
    client,
    requestId: input.requestId,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: input.amount,
    customerName: input.customerName,
    cell: input.cell,
    couponCode: input.couponCode,
    existingPaymentUrl: input.existingPaymentUrl,
    existingOrderRef: input.existingOrderRef,
  });
}
