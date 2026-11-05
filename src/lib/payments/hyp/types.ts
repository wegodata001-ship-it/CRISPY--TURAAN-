/** Hyp Pay hosted payment page — server-side types only. */

export type HypPaymentIntentStatus =
  | "created"
  | "redirected"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired"
  /** TTL / abandoned return — unpaid until admin VERIFY or abandon_after_review. */
  | "needs_review";

export type HypSignRequest = {
  amount: number;
  orderRef: string;
  clientName?: string;
  cell?: string;
  info?: string;
  pageLang?: "HEB" | "ENG";
  coin?: 1 | 2 | 3 | 4;
};

export type HypSignResult = {
  ok: true;
  paymentUrl: string;
  signedQuery: string;
};

export type HypSignFailure = {
  ok: false;
  code: "DISABLED" | "NOT_CONFIGURED" | "INVALID_AMOUNT" | "INVALID_ORDER_REF" | "SIGN_FAILED" | "NETWORK";
  message: string;
};

export type HypRedirectParams = Record<string, string>;

export type HypVerifyInput = {
  /** Query params from Hyp success redirect, in original order when available. */
  redirectParams: HypRedirectParams;
  /** Ordered keys from the redirect URL (preserve Hyp order for VERIFY). */
  redirectParamOrder: string[];
  /** Expected CRISPY order / payment reference (Hyp `Order`). */
  expectedOrderRef: string;
  /** Expected charge amount in ILS major units (e.g. 47.3). */
  expectedAmount: number;
  /** Expected terminal number when present on the redirect. */
  expectedMasof?: string;
  /** Expected Hyp Coin (1=ILS). */
  expectedCoin?: 1 | 2 | 3 | 4;
};

export type HypVerifyResult =
  | {
      ok: true;
      transactionId: string;
      amount: number;
      orderRef: string;
      approvalCode?: string;
      cCode: string;
      masof?: string;
      coin?: number;
    }
  | {
      ok: false;
      code:
        | "DISABLED"
        | "NOT_CONFIGURED"
        | "MISSING_PARAMS"
        | "AMOUNT_MISMATCH"
        | "ORDER_MISMATCH"
        | "MERCHANT_MISMATCH"
        | "CURRENCY_MISMATCH"
        | "PAYMENT_DECLINED"
        | "VERIFY_FAILED"
        | "NETWORK";
      message: string;
      cCode?: string;
    };

export type HypPaymentIntent = {
  id: string;
  requestId: string;
  orderId: string;
  orderNumber: string;
  /** Value sent to Hyp as `Order` — stable idempotency key for the charge. */
  orderRef: string;
  amount: number;
  currencyCoin: 1 | 2 | 3 | 4;
  status: HypPaymentIntentStatus;
  hypTransactionId?: string;
  couponCode?: string;
  createdAtMs: number;
  paidAtMs?: number;
};

export type HypHttpGet = (url: string) => Promise<{ ok: boolean; text: string; status: number }>;

export type HypClientConfig = {
  enabled: boolean;
  baseUrl: string;
  masof: string;
  key: string;
  passp: string;
  coin: 1 | 2 | 3 | 4;
  pageLang: "HEB" | "ENG";
  httpGet?: HypHttpGet;
};
