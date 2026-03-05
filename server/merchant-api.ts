// =============================================================================
// MERCHANT-API.TS
// Lend402 — Merchant API Server & Facilitator Client
// x402 V2 Protocol / Express.js / Stacks Nakamoto
// =============================================================================
// Architecture:
//   ┌──────────┐  GET /api/premium-data  ┌──────────────────┐
//   │  Agent   │ ──────────────────────► │  Merchant API    │
//   │  Client  │ ◄────────────────────── │  (this file)     │
//   └──────────┘   402 payment-required  └────────┬─────────┘
//        │                                        │  POST /settle
//        │  retry + payment-signature             ▼
//        └──────────────────────────────► ┌──────────────────┐
//                                         │  Facilitator     │
//                                         │  Node            │
//                                         │  (broadcasts tx) │
//                                         └──────────────────┘
//
// The merchant server NEVER broadcasts transactions. It delegates exclusively
// to the Facilitator to prevent double-spend races and maintain atomicity.
// =============================================================================

import express, {
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import axios, { AxiosError } from "axios";
import { randomUUID } from "crypto";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

/** CAIP-2 network identifier */
type Caip2NetworkId = "stacks:1" | "stacks:2147483648";

/** Decoded `payment-required` header payload (base64 JSON) */
interface PaymentRequiredPayload {
  network: Caip2NetworkId;
  amount_usdcx: number;
  merchant_address: string;
  resource: string;
  issued_at: number;
  expires_at: number;
  nonce: string;
}

/** Decoded `payment-signature` header payload (base64 JSON) */
interface PaymentSignaturePayload {
  signed_tx_hex: string;
  agent_address: string;
  nonce: string;
  network: Caip2NetworkId;
  signed_at: number;
}

/** POST body sent to Facilitator /settle */
interface FacilitatorSettleRequest {
  signed_tx_hex: string;
  agent_address: string;
  merchant_address: string;
  amount_usdcx: number;
  network: Caip2NetworkId;
  nonce: string;
  resource: string;
}

/** Successful response from Facilitator /settle */
interface FacilitatorSettleResponse {
  confirmed: boolean;
  txid: string;
  block_height: number;
  confirmed_at: number;
}

/** Content of `payment-response` header (base64 JSON) */
interface PaymentResponsePayload {
  txid: string;
  network: Caip2NetworkId;
  block_height: number;
  confirmed_at: number;
  amount_usdcx: number;
  merchant_address: string;
}

/** Premium data endpoint response body */
interface PremiumDataResponse {
  data: {
    btc_price_usd: number;
    sbtc_tvl_usd: number;
    lend402_active_loans: number;
    nakamoto_block_time_avg_sec: number;
    timestamp: string;
    source: string;
  };
  meta: {
    agent_address: string;
    txid: string;
    cost_usdcx: number;
  };
}

// ---------------------------------------------------------------------------
// CONFIGURATION
// ---------------------------------------------------------------------------

interface MerchantConfig {
  /** Merchant's Stacks principal (receives USDCx from vault) */
  merchantAddress: string;
  /** CAIP-2 network identifier */
  network: Caip2NetworkId;
  /** USDCx price for the premium data endpoint (6 decimals: 500000 = $0.50) */
  premiumDataPriceUsdcx: number;
  /** Facilitator base URL */
  facilitatorUrl: string;
  /** Shared secret for Facilitator authentication (HMAC) */
  facilitatorSecret: string;
  /** Challenge TTL in seconds (default: 300 = 5 minutes) */
  challengeTtlSeconds: number;
  /** Port to listen on */
  port: number;
}

const CONFIG: MerchantConfig = {
  merchantAddress:
    process.env.MERCHANT_ADDRESS ?? "SP2MERCHANT000LEND402ADDRESS",
  network: (process.env.STACKS_NETWORK as Caip2NetworkId) ?? "stacks:1",
  premiumDataPriceUsdcx: parseInt(
    process.env.PREMIUM_DATA_PRICE_USDCX ?? "500000",
    10
  ), // $0.50 USDCx
  facilitatorUrl:
    process.env.FACILITATOR_URL ?? "https://facilitator.lend402.network",
  facilitatorSecret: process.env.FACILITATOR_SECRET ?? "",
  challengeTtlSeconds: parseInt(
    process.env.CHALLENGE_TTL_SECONDS ?? "300",
    10
  ),
  port: parseInt(process.env.PORT ?? "3001", 10),
};

// ---------------------------------------------------------------------------
// HEADER CONSTANTS (x402 V2 spec)
// ---------------------------------------------------------------------------

const PAYMENT_REQUIRED_HEADER = "payment-required";
const PAYMENT_SIGNATURE_HEADER = "payment-signature";
const PAYMENT_RESPONSE_HEADER = "payment-response";

// ---------------------------------------------------------------------------
// NONCE STORE
// ---------------------------------------------------------------------------
// In production, replace with a distributed Redis store with TTL.
// This in-memory map tracks issued nonces to prevent replay attacks.

interface NonceRecord {
  payload: PaymentRequiredPayload;
  issued_at: number;
  used: boolean;
}

const nonceStore = new Map<string, NonceRecord>();

/** Periodically purge expired nonces to prevent memory growth */
setInterval(() => {
  const nowSec = Math.floor(Date.now() / 1000);
  for (const [nonce, record] of nonceStore.entries()) {
    if (record.payload.expires_at < nowSec) {
      nonceStore.delete(nonce);
    }
  }
}, 60_000); // Purge every 60 seconds

// ---------------------------------------------------------------------------
// HEADER CODEC
// ---------------------------------------------------------------------------

function encodeHeader<T>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decodeHeader<T>(headerValue: string): T {
  try {
    return JSON.parse(
      Buffer.from(headerValue, "base64").toString("utf8")
    ) as T;
  } catch {
    throw new Error("Malformed base64 header — cannot decode JSON");
  }
}

// ---------------------------------------------------------------------------
// FACILITATOR CLIENT
// ---------------------------------------------------------------------------

/**
 * Computes an HMAC-SHA256 signature over the canonical settle request body.
 * Sent as `X-Lend402-Signature` header to authenticate with the Facilitator.
 */
function computeFacilitatorHmac(
  body: FacilitatorSettleRequest,
  secret: string
): string {
  const canonical = JSON.stringify(body, Object.keys(body).sort());
  return createHash("sha256")
    .update(secret + canonical)
    .digest("hex");
}

/**
 * Forward the signed payment payload to the Facilitator node for broadcasting
 * and Nakamoto fast-block confirmation polling.
 *
 * The Facilitator is the ONLY component that calls `broadcastTransaction`.
 * This separation enforces atomicity: the merchant cannot accidentally
 * double-broadcast a signed transaction.
 *
 * @throws If the Facilitator returns non-200 or `confirmed: false`
 */
async function settleWithFacilitator(
  signaturePayload: PaymentSignaturePayload,
  challenge: PaymentRequiredPayload
): Promise<FacilitatorSettleResponse> {
  const body: FacilitatorSettleRequest = {
    signed_tx_hex: signaturePayload.signed_tx_hex,
    agent_address: signaturePayload.agent_address,
    merchant_address: challenge.merchant_address,
    amount_usdcx: challenge.amount_usdcx,
    network: challenge.network,
    nonce: challenge.nonce,
    resource: challenge.resource,
  };

  const hmac = computeFacilitatorHmac(body, CONFIG.facilitatorSecret);

  const response = await axios.post<FacilitatorSettleResponse>(
    `${CONFIG.facilitatorUrl}/settle`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
        "X-Lend402-Signature": hmac,
        "X-Lend402-Network": challenge.network,
      },
      timeout: 15_000, // Nakamoto fast-blocks settle within ~5 seconds; 15s is safe
