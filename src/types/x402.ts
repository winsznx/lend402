import type {
  NetworkV2,
  PaymentPayloadV2,
  PaymentRequiredV2,
  PaymentRequirementsV2,
  ResourceInfo,
  SettlementResponseV2,
} from "x402-stacks";

/** CAIP-2 network identifiers for Stacks */
export type Caip2NetworkId = "stacks:1" | "stacks:2147483648";

/** Payment scheme — only "exact" is supported in Lend402 */
export type PaymentScheme = "exact";

// ---------------------------------------------------------------------------
// 402 Response Body (server → client)
// ---------------------------------------------------------------------------

/** Single payment option within a 402 body */
export interface PaymentOption
  extends Omit<PaymentRequirementsV2, "scheme" | "network"> {
  scheme: PaymentScheme;
  network: Caip2NetworkId;
}

/** x402 V2 HTTP 402 response body */
export interface PaymentRequiredBody extends Omit<PaymentRequiredV2, "accepts" | "resource"> {
  x402Version: 2;
  resource: ResourceInfo;
  accepts: PaymentOption[];
}

// ---------------------------------------------------------------------------
// payment-signature Header (client → server)
// ---------------------------------------------------------------------------

/** Decoded content of the payment-signature request header (base64 JSON) */
export interface XPaymentHeader extends Omit<PaymentPayloadV2, "accepted"> {
  x402Version: 2;
  accepted: PaymentOption;
  payload: {
    transaction: string;
  };
}

// ---------------------------------------------------------------------------
// payment-response Header (server → client)
// ---------------------------------------------------------------------------

/** Decoded content of the payment-response response header (base64 JSON) */
export interface XPaymentResponse extends SettlementResponseV2 {
  network: Caip2NetworkId;
  transaction: string;
  blockHeight: number;
  confirmedAt: number;
}

// ---------------------------------------------------------------------------
// Stacks settlement request / receipt
// ---------------------------------------------------------------------------

/** Canonical settlement request derived from payment-signature */
export interface SettlementRequest {
  x402Version: 2;
  scheme: PaymentScheme;
  network: Caip2NetworkId;
  payload: {
    signedTransaction: string;
    type: "contract_call";
  };
  /** Gateway resource being unlocked */
  resource: string;
  /** Provider's Stacks principal receiving payment */
  payTo: string;
}

/** Confirmed on-chain settlement receipt */
export interface SettlementReceipt {
  success: true;
  txid: string;
  network: Caip2NetworkId;
  blockHeight: number;
  confirmedAt: number;
  payer: string;
}
