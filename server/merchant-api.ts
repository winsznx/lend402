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
    }
  );

  if (!response.data.confirmed) {
    throw new Error(
      `Facilitator did not confirm transaction: txid=${response.data.txid}`
    );
  }

  return response.data;
}

// ---------------------------------------------------------------------------
// MIDDLEWARE: x402 Payment Gate
// ---------------------------------------------------------------------------

/**
 * Express middleware that enforces x402 payment for protected routes.
 *
 * Flow:
 *   No payment-signature header  →  Issue 402 with payment-required challenge
 *   payment-signature present    →  Validate nonce → Forward to Facilitator
 *                                   → On 200 confirmed: attach payment-response
 *                                     and call next() to serve the resource
 */
function requirePayment(
  resourceName: string,
  priceUsdcx: number
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const signatureHeader = req.headers[PAYMENT_SIGNATURE_HEADER] as
      | string
      | undefined;

    // ── PATH A: No payment signature — issue 402 challenge ─────────────────
    if (!signatureHeader) {
      const nowSec = Math.floor(Date.now() / 1000);
      const nonce = randomUUID();

      const challenge: PaymentRequiredPayload = {
        network: CONFIG.network,
        amount_usdcx: priceUsdcx,
        merchant_address: CONFIG.merchantAddress,
        resource: resourceName,
        issued_at: nowSec,
        expires_at: nowSec + CONFIG.challengeTtlSeconds,
        nonce,
      };

      // Store nonce for replay-attack prevention
      nonceStore.set(nonce, {
        payload: challenge,
        issued_at: nowSec,
        used: false,
      });

      res
        .status(402)
        .header(PAYMENT_REQUIRED_HEADER, encodeHeader(challenge))
        .header("Content-Type", "application/json")
        .json({
          error: "Payment Required",
          message: `This resource costs ${priceUsdcx / 1_000_000} USDCx. Attach a \`${PAYMENT_SIGNATURE_HEADER}\` header generated by an x402-compatible client.`,
          amount_usdcx: priceUsdcx,
          network: CONFIG.network,
        });
      return;
    }

    // ── PATH B: payment-signature present — validate and settle ────────────
    let signaturePayload: PaymentSignaturePayload;
    try {
      signaturePayload = decodeHeader<PaymentSignaturePayload>(signatureHeader);
    } catch {
      res.status(400).json({
        error: "Bad Request",
        message: `\`${PAYMENT_SIGNATURE_HEADER}\` header is not valid base64 JSON`,
      });
      return;
    }

    // ── Validate required fields ────────────────────────────────────────────
    if (
      !signaturePayload.signed_tx_hex ||
      !signaturePayload.agent_address ||
      !signaturePayload.nonce ||
      !signaturePayload.network ||
      !signaturePayload.signed_at
    ) {
      res.status(400).json({
        error: "Bad Request",
        message: "Malformed payment-signature payload — missing required fields",
      });
      return;
    }

    // ── Network match ────────────────────────────────────────────────────────
    if (signaturePayload.network !== CONFIG.network) {
      res.status(400).json({
        error: "Network Mismatch",
        message: `Expected ${CONFIG.network}, received ${signaturePayload.network}`,
      });
      return;
    }

    // ── Nonce validation (replay-attack prevention) ──────────────────────────
    const nonceRecord = nonceStore.get(signaturePayload.nonce);
    if (!nonceRecord) {
      res.status(400).json({
        error: "Invalid Nonce",
        message: "Unrecognised or expired nonce — request a fresh challenge",
      });
      return;
    }
    if (nonceRecord.used) {
      res.status(400).json({
        error: "Nonce Replayed",
        message: "This nonce has already been consumed — replay attack detected",
      });
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec > nonceRecord.payload.expires_at) {
      nonceStore.delete(signaturePayload.nonce);
      res.status(400).json({
        error: "Challenge Expired",
        message: "The payment challenge has expired — request a new 402 challenge",
      });
      return;
    }

    // Mark nonce as consumed BEFORE forwarding to Facilitator to prevent
    // concurrent replay under race conditions
    nonceRecord.used = true;
    nonceStore.set(signaturePayload.nonce, nonceRecord);

    // ── Signature timestamp freshness check ──────────────────────────────────
    const signatureAge = nowSec - signaturePayload.signed_at;
    if (signatureAge > CONFIG.challengeTtlSeconds || signatureAge < 0) {
      res.status(400).json({
        error: "Signature Stale",
        message: `Signed at ${signaturePayload.signed_at} is outside acceptable window`,
      });
      return;
    }

    // ── Forward to Facilitator for broadcasting & confirmation ───────────────
    let settlement: FacilitatorSettleResponse;
    try {
      settlement = await settleWithFacilitator(
        signaturePayload,
        nonceRecord.payload
      );
    } catch (err) {
      // Un-consume the nonce if Facilitator fails, so agent can retry
      nonceRecord.used = false;
      nonceStore.set(signaturePayload.nonce, nonceRecord);

      if (axios.isAxiosError(err)) {
        const axErr = err as AxiosError;
        const status = axErr.response?.status ?? 502;
        const facilitatorBody = axErr.response?.data ?? "No response body";
        console.error(
          `[Merchant] Facilitator error ${status}:`,
          facilitatorBody
        );
        res.status(502).json({
          error: "Facilitator Error",
          message: "The settlement facilitator returned an error",
          facilitator_status: status,
          facilitator_response: facilitatorBody,
        });
      } else {
        console.error("[Merchant] Unexpected settlement error:", err);
        res.status(500).json({
          error: "Internal Server Error",
          message: (err as Error).message,
        });
      }
      return;
    }

    // ── Settlement confirmed — attach payment-response header ────────────────
    const paymentResponse: PaymentResponsePayload = {
      txid: settlement.txid,
      network: CONFIG.network,
      block_height: settlement.block_height,
      confirmed_at: settlement.confirmed_at,
      amount_usdcx: nonceRecord.payload.amount_usdcx,
      merchant_address: CONFIG.merchantAddress,
    };

    res.header(PAYMENT_RESPONSE_HEADER, encodeHeader(paymentResponse));

    // Attach settlement data to req for route handler access
    (req as Request & { settlement: FacilitatorSettleResponse }).settlement =
      settlement;
    (
      req as Request & { paymentSignature: PaymentSignaturePayload }
    ).paymentSignature = signaturePayload;

    next();
  };
}

// ---------------------------------------------------------------------------
// EXPRESS APPLICATION
// ---------------------------------------------------------------------------

const app = express();

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(express.json());

// ── CORS: allow the Agent Command Center dashboard origin ────────────────────
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", process.env.DASHBOARD_ORIGIN ?? "*");
  res.header(
    "Access-Control-Allow-Headers",
    `Content-Type, ${PAYMENT_SIGNATURE_HEADER}, ${PAYMENT_RESPONSE_HEADER}`
  );
  res.header(
    "Access-Control-Expose-Headers",
    `${PAYMENT_REQUIRED_HEADER}, ${PAYMENT_RESPONSE_HEADER}`
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

// ── Rate limiting: 60 req/min per IP ────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too Many Requests", message: "Slow down — 60 req/min max" },
});
app.use(limiter);

// ---------------------------------------------------------------------------
// ROUTES
// ---------------------------------------------------------------------------

// ── Health check (public) ────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "lend402-merchant-api",
    network: CONFIG.network,
    merchant_address: CONFIG.merchantAddress,
    timestamp: new Date().toISOString(),
  });
});

// ── Protected premium data endpoint ─────────────────────────────────────────
// This route is guarded by requirePayment middleware.
// Any request without a valid payment-signature receives a 402 with a challenge.
// Any request with a valid + settled payment-signature receives premium data.
app.get(
  "/api/premium-data",
  requirePayment("premium-btc-market-data", CONFIG.premiumDataPriceUsdcx),
  (req: Request, res: Response) => {
    const settlement = (
      req as Request & { settlement: FacilitatorSettleResponse }
    ).settlement;
    const sig = (
      req as Request & { paymentSignature: PaymentSignaturePayload }
    ).paymentSignature;

    // In production this would call a real data vendor (Bloomberg, Coinmetrics, etc.)
    // Here we return a realistic synthetic payload to demonstrate the full flow.
    const responseBody: PremiumDataResponse = {
      data: {
        btc_price_usd: 97_842.15,
        sbtc_tvl_usd: 438_000_000,
        lend402_active_loans: 1_247,
        nakamoto_block_time_avg_sec: 4.83,
        timestamp: new Date().toISOString(),
        source: "lend402-premium-feed-v1",
      },
      meta: {
        agent_address: sig.agent_address,
        txid: settlement.txid,
        cost_usdcx: CONFIG.premiumDataPriceUsdcx,
      },
    };

    console.log(
      `[Merchant] Served premium data to ${sig.agent_address} | txid=${settlement.txid} | block=${settlement.block_height}`
    );

    res.status(200).json(responseBody);
  }
);
