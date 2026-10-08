import assert from "node:assert/strict";
import {
  ACTIVE_ORDER_STATUSES,
  averagePreparationMinutes,
  effectivePaymentStatus,
  isActiveOrder,
  nextOrderStatus,
  orderSearchText,
} from "../src/lib/orders/operations";
import type { Order } from "../src/types";

const base: Order = {
  id: "legacy-order",
  orderNumber: "MC-2026-TEST",
  customerId: "guest",
  customerName: "Tasneem",
  status: "received",
  items: [
    {
      productId: "croissant",
      productName: "קוראסון חמאה",
      quantity: 1,
      price: 18,
      modifiers: [
        {
          groupId: "extras",
          groupName: "תוספות",
          optionId: "tomato",
          optionName: "עגבניה",
          priceDelta: 0,
          quantity: 1,
          kitchenNote: "ללא בצל",
        },
      ],
    },
  ],
  total: 18,
  createdAt: new Date().toISOString(),
};

assert.deepEqual(ACTIVE_ORDER_STATUSES, ["received", "preparing", "ready"]);
assert.equal(nextOrderStatus("received"), "preparing");
assert.equal(nextOrderStatus("preparing"), "ready");
assert.equal(nextOrderStatus("ready"), "delivered");
assert.equal(nextOrderStatus("delivered"), null);
assert.equal(isActiveOrder(base), true);
assert.equal(effectivePaymentStatus(base), "pending");
assert.match(orderSearchText(base), /tasneem/);
assert.match(orderSearchText(base), /קוראסון חמאה/);
assert.match(orderSearchText(base), /עגבניה/);
assert.match(orderSearchText(base), /ללא בצל/);

const timed: Order = {
  ...base,
  id: "timed",
  status: "ready",
  preparationStartedAt: "2026-08-12T10:00:00.000Z",
  readyAt: "2026-08-12T10:12:00.000Z",
};
assert.equal(averagePreparationMinutes([base, timed]), 12);

console.log(
  JSON.stringify(
    {
      legacyOrderCompatible: true,
      operationalFlow: true,
      snapshotSearch: true,
      paymentFallback: true,
      preparationMetrics: true,
    },
    null,
    2
  )
);
