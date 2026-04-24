// =============================================================================
// src/lib/x402.ts
// x402 V2 Protocol helpers backed by the official x402-stacks package
// =============================================================================

import {
  decodePaymentRequired,
  decodePaymentResponse,
  encodePaymentPayload,
  X402_HEADERS,
} from "x402-stacks";
import type {
  Caip2NetworkId,
  PaymentRequiredBody,
  PaymentOption,
  XPaymentHeader,
  XPaymentResponse,
  SettlementRequest,
} from "@/types/x402";
import { DEFAULT_SBTC_CONTRACT, DEFAULT_USDCX_CONTRACT, normalizeTxid } from "@/lib/network";

export const PAYMENT_REQUIRED_HEADER = X402_HEADERS.PAYMENT_REQUIRED;
export const PAYMENT_SIGNATURE_HEADER = X402_HEADERS.PAYMENT_SIGNATURE;
export const PAYMENT_RESPONSE_HEADER = X402_HEADERS.PAYMENT_RESPONSE;

interface LegacyXPaymentHeader {
  readonly x402Version: 2;
  readonly scheme: "exact";
  readonly network: Caip2NetworkId;
  readonly payload: {
    readonly signedTransaction: string;
    readonly type: "contract_call";
  };
}

export function usdcxAsset(network: Caip2NetworkId): string {
  return network === "stacks:1"
    ? DEFAULT_USDCX_CONTRACT.mainnet
    : DEFAULT_USDCX_CONTRACT.testnet;
}

export function sbtcAsset(network: Caip2NetworkId): string {
  return network === "stacks:1"
    ? DEFAULT_SBTC_CONTRACT.mainnet
    : DEFAULT_SBTC_CONTRACT.testnet;
}

export function encodeBase64<T>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decodeBase64<T>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as T;
}

// Conservative sBTC reference price used to quote the sBTC option amount.
// This is intentionally a floor estimate — the actual price check is performed
// on-chain by the DIA oracle at execution time. The informational sBTC option
// in the 402 response uses this to express a satoshi-denominated amount without
// requiring a live oracle call on every challenge request.
// Reads SBTC_REF_PRICE_USD8 env var; falls back to $95,000 × 10^8.
function getSbtcRefPriceUsd8(): number {
  const fromEnv = process.env.SBTC_REF_PRICE_USD8;
  if (fromEnv) {
    const parsed = Number(fromEnv);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 9_500_000_000_000; // $95,000 × 10^8 (oracle 8-decimal format)
}

export interface Build402BodyOptions {
  readonly network: Caip2NetworkId;
  /** Price in USDCx (6 decimals, e.g. 500000 = $0.50) */
  readonly priceUsdcx: number;
  /** Stacks principal receiving payment */
  readonly payTo: string;
  /** Unique resource identifier */
  readonly resource: string;
  /** Human-readable description */
  readonly description: string;
  /** MIME type of the gated resource */
  readonly mimeType?: string;
  /** Max seconds to pay (default: 300) */
  readonly maxTimeoutSeconds?: number;
  /** Explicit USDCx asset contract override */
  readonly asset?: string;
  /** sBTC asset contract override (defaults to network canonical address) */
  readonly sbtcAsset?: string;
  /** Extra protocol data */
  readonly extra?: Record<string, unknown>;
}

/** Builds the JSON body returned with HTTP 402 responses. */
export function buildPaymentRequiredBody(opts: Build402BodyOptions): PaymentRequiredBody {
  const usdcxOption: PaymentOption = {
    scheme: "exact",
    network: opts.network,
    amount: String(opts.priceUsdcx),
    asset: opts.asset ?? usdcxAsset(opts.network),
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 300,
    extra: {
      token: "USDCx",
      decimals: 6,
      priceUsdcx: opts.priceUsdcx,
      ...opts.extra,
    },
  };

  // x402 V2 multi-rail: include an sBTC direct-payment option.
  // The satoshi amount is a best-effort quote based on a conservative sBTC
  // reference price. Agents should treat this as approximate and confirm via
  // DIA oracle before signing. The gateway currently settles USDCx payments
  // only; sBTC direct-pay processing is indicated by the `railStatus` field.
  //
  // Derivation:
  //   price_usd  = priceUsdcx / 1e6  (USDCx is pegged $1.00)
  //   satoshis   = price_usd / (sbtc_price_usd8 / 1e8) * 1e8
  //              = priceUsdcx * 1e10 / sbtc_price_usd8
  const sbtcSatoshis = Math.max(
    1,
    Math.ceil((opts.priceUsdcx * 10_000_000_000) / getSbtcRefPriceUsd8())
  );

  const sbtcOption: PaymentOption = {
    scheme: "exact",
    network: opts.network,
    amount: String(sbtcSatoshis),
    asset: opts.sbtcAsset ?? sbtcAsset(opts.network),
    payTo: opts.payTo,
    maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 300,
    extra: {
      token: "sBTC",
      decimals: 8,
      amountIsApproximate: true,
      refPriceUsd8: getSbtcRefPriceUsd8(),
      usdcxEquivalent: opts.priceUsdcx,
      railStatus: "active",
    },
  };

  return {
    x402Version: 2,
    error: "Payment required",
    resource: {
      url: opts.resource,
      description: opts.description,
      mimeType: opts.mimeType ?? "application/json",
    },
    accepts: [usdcxOption, sbtcOption],
  };
}

export function buildPaymentRequiredHeader(body: PaymentRequiredBody): string {
  return encodeBase64(body);
}

export function parsePaymentRequiredHeader(encoded: string): PaymentRequiredBody {
  const decoded = decodePaymentRequired(encoded) as PaymentRequiredBody | null;

  if (!decoded || decoded.x402Version !== 2 || !Array.isArray(decoded.accepts)) {
    throw new Error("Malformed payment-required header");
  }

  return decoded;
}

export interface BuildPaymentSignatureHeaderOptions {
  readonly resource: PaymentRequiredBody["resource"];
  readonly accepted: PaymentOption;
  readonly signedTransactionHex: string;
  /**
   * x402 V2 `payment-identifier` extension.
   * Set to the Stacks txid (0x-prefixed) computed from the signed transaction.
   * The gateway cross-checks this against the txid it derives independently
   * from deserializing the transaction, providing an early integrity signal.
   */
  readonly paymentIdentifier?: string;
}

/** Builds the base64-encoded value of the payment-signature request header. */
export function buildPaymentSignatureHeader(
  opts: BuildPaymentSignatureHeaderOptions
): string {
  const header: XPaymentHeader = {
    x402Version: 2,
    resource: opts.resource,
    accepted: opts.accepted,
    payload: {
      transaction: opts.signedTransactionHex,
    },
    ...(opts.paymentIdentifier && {
      extensions: { "payment-identifier": opts.paymentIdentifier },
    }),
  };

  return encodePaymentPayload(header);
}

/** Decodes and validates the payment-signature header value. */
export function parsePaymentSignatureHeader(encoded: string): XPaymentHeader {
  const decoded = decodeBase64<XPaymentHeader>(encoded);

  if (decoded.x402Version !== 2) {
    throw new Error(`Unsupported x402 version: ${decoded.x402Version}`);
  }
  if (decoded.accepted?.scheme !== "exact") {
    throw new Error(`Unsupported payment scheme: ${decoded.accepted?.scheme ?? "unknown"}`);
  }
  if (!decoded.payload?.transaction) {
    throw new Error("payment-signature payload missing transaction");
  }

  return decoded;
}

/** Cheap fallback for older x-payment callers still sending the legacy shape. */
export function parseLegacyXPaymentHeader(
  encoded: string,
  accepted: PaymentOption,
  resource: PaymentRequiredBody["resource"]
): XPaymentHeader {
  const decoded = decodeBase64<LegacyXPaymentHeader>(encoded);

  if (decoded.x402Version !== 2 || decoded.scheme !== "exact") {
    throw new Error("Legacy x-payment header is not x402 v2 exact");
  }
  if (!decoded.payload?.signedTransaction) {
    throw new Error("Legacy x-payment payload missing signedTransaction");
  }

  return {
    x402Version: 2,
    resource,
    accepted,
    payload: {
      transaction: decoded.payload.signedTransaction,
    },
  };
}

export interface BuildPaymentResponseOptions {
  readonly txid: string;
  readonly network: Caip2NetworkId;
  readonly payer: string;
  readonly blockHeight: number;
  readonly confirmedAt: number;
}

/** Builds the base64-encoded value of the payment-response response header. */
export function buildPaymentResponseHeader(
  opts: BuildPaymentResponseOptions
): string {
  const response: XPaymentResponse = {
    success: true,
    transaction: normalizeTxid(opts.txid),
    network: opts.network,
    payer: opts.payer,
    blockHeight: opts.blockHeight,
    confirmedAt: opts.confirmedAt,
  };

  return encodeBase64(response);
}

/** Decodes the payment-response header. */
export function parsePaymentResponseHeader(encoded: string): XPaymentResponse {
  const decoded = decodePaymentResponse(encoded) as XPaymentResponse | null;

  if (!decoded || !decoded.transaction) {
    throw new Error("Malformed payment-response header");
  }

  return {
    ...decoded,
    transaction: normalizeTxid(decoded.transaction),
  };
}

/** Builds the canonical settlement request from a parsed payment-signature payload. */
export function buildSettlementRequest(
  paymentPayload: XPaymentHeader,
  resource: string,
  payTo: string
): SettlementRequest {
  return {
    x402Version: 2,
    scheme: paymentPayload.accepted.scheme,
    network: paymentPayload.accepted.network,
    payload: {
      signedTransaction: paymentPayload.payload.transaction,
      type: "contract_call",
    },
    resource,
    payTo,
  };
}

/** Returns true if the payment targets the expected network and payTo. */
export function verifyXPayment(
  header: XPaymentHeader,
  expectedNetwork: Caip2NetworkId,
  expectedPayTo: string
): { valid: boolean; reason?: string } {
  if (header.accepted.network !== expectedNetwork) {
    return {
      valid: false,
      reason: `Network mismatch: got ${header.accepted.network}, expected ${expectedNetwork}`,
    };
  }

  if (header.accepted.payTo !== expectedPayTo) {
    return {
      valid: false,
      reason: `Recipient mismatch: got ${header.accepted.payTo}, expected ${expectedPayTo}`,
    };
  }

  if (!header.payload.transaction) {
    return { valid: false, reason: "Missing transaction in payment payload" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases while the rest of the repo migrates wording
// ---------------------------------------------------------------------------

export const build402Body = buildPaymentRequiredBody;
export const buildXPaymentHeader = buildPaymentSignatureHeader;
export const parseXPaymentHeader = parsePaymentSignatureHeader;
export const buildXPaymentResponse = buildPaymentResponseHeader;
export const parseXPaymentResponse = parsePaymentResponseHeader;
