// =============================================================================
// AGENT-CLIENT.TS
// Lend402 JIT Micro-Lending — AI Agent SDK
// x402 V2 Protocol / Stacks Nakamoto / Clarity 4
// =============================================================================
// This module wraps Axios with a 402 Payment Required interceptor.
// When a paywalled API rejects with 402, the interceptor:
//   1. Decodes the `payment-required` header to extract USDCx cost + merchant
//   2. Calls simulate-borrow (read-only) to determine required sBTC collateral
//   3. Builds a Stacks contract-call to lend402-vault::borrow-and-pay
//   4. Signs the serialized transaction with the agent's private key
//   5. Base64-encodes the signed payload into `payment-signature`
//   6. Retries the original request with the header attached
// =============================================================================

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  makeContractCall,
  broadcastTransaction,
  uintCV,
  principalCV,
  bufferCV,
  deserializeTransaction,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  createAssetInfo,
  makeContractFungiblePostCondition,
  makeStandardFungiblePostCondition,
  ContractCallOptions,
  StacksTransaction,
  TxBroadcastResult,
  TransactionVersion,
  SignedContractCallOptions,
} from "@stacks/transactions";
import { StacksMainnet, StacksTestnet, StacksNetwork } from "@stacks/network";
import { callReadOnlyFunction, cvToJSON } from "@stacks/transactions";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// TYPES & INTERFACES
// ---------------------------------------------------------------------------

/** CAIP-2 network identifiers as per x402 V2 spec */
export type Caip2NetworkId = "stacks:1" | "stacks:2147483648";

/** Decoded content of the `payment-required` header (base64 JSON) */
export interface PaymentRequiredPayload {
  /** CAIP-2 network identifier */
  network: Caip2NetworkId;
  /** USDCx amount required, in 6-decimal units (e.g. 1_000_000 = $1.00) */
  amount_usdcx: number;
  /** Stacks principal of the merchant receiving payment */
  merchant_address: string;
  /** Human-readable description of the resource being purchased */
  resource: string;
  /** Unix timestamp when this payment challenge was issued */
  issued_at: number;
  /** Unix timestamp after which this challenge expires */
  expires_at: number;
  /** Merchant's challenge nonce to prevent replay attacks */
  nonce: string;
}

/** Decoded content of the `payment-signature` header (base64 JSON) */
export interface PaymentSignaturePayload {
  /** Serialized, signed Stacks contract-call transaction (hex) */
  signed_tx_hex: string;
  /** Agent's Stacks address (for merchant verification) */
  agent_address: string;
  /** Echo of the merchant's nonce from PaymentRequiredPayload */
  nonce: string;
  /** CAIP-2 network */
  network: Caip2NetworkId;
  /** Unix timestamp when the signature was constructed */
  signed_at: number;
}

/** Response from the facilitator /settle endpoint */
export interface FacilitatorSettleResponse {
  /** Whether the Nakamoto fast-block confirmed the transaction */
  confirmed: boolean;
  /** Stacks transaction ID (hex) */
  txid: string;
  /** Block height of confirmation */
  block_height: number;
  /** Unix timestamp of block confirmation */
  confirmed_at: number;
}

/** Content of the `payment-response` header (base64 JSON) */
export interface PaymentResponsePayload {
  txid: string;
  network: Caip2NetworkId;
  block_height: number;
  confirmed_at: number;
  amount_usdcx: number;
  merchant_address: string;
}

/** Lend402 vault simulate-borrow read-only response (decoded from CV) */
interface SimulateBorrowResult {
  required_collateral_sbtc: bigint;
  origination_fee_usdcx: bigint;
  net_payment_usdcx: bigint;
  sbtc_price_usd8: bigint;
  usdcx_price_usd8: bigint;
  collateral_ratio_bps: bigint;
}

/** Configuration for the Lend402AgentClient */
export interface AgentClientConfig {
  /** Agent's Stacks private key (hex, 32 bytes) */
  privateKey: string;
  /** Agent's Stacks address */
  agentAddress: string;
  /** Stacks network to use */
  network: StacksNetwork;
  /** CAIP-2 network identifier */
  caip2Network: Caip2NetworkId;
  /** Deployed lend402-vault contract address */
  vaultContractAddress: string;
  /** lend402-vault contract name */
  vaultContractName: string;
  /** sBTC SIP-010 contract address */
  sbtcContractAddress: string;
  /** sBTC token contract name */
  sbtcContractName: string;
  /** USDCx SIP-010 contract address */
  usdcxContractAddress: string;
  /** USDCx token contract name */
  usdcxContractName: string;
  /** Optional: override axios instance timeout in ms (default: 30000) */
  timeoutMs?: number;
  /** Optional: maximum retries on 402 (default: 1 — retry exactly once) */
  maxPaymentRetries?: number;
  /** Optional: callback for real-time event streaming to the dashboard */
  onEvent?: (event: AgentEvent) => void;
}

/** Structured event emitted at each stage of the JIT loan lifecycle */
export interface AgentEvent {
  type:
    | "REQUEST_SENT"
    | "PAYMENT_REQUIRED_RECEIVED"
    | "SIMULATE_BORROW_OK"
    | "TX_BUILT"
    | "TX_SIGNED"
    | "PAYMENT_SIGNATURE_ATTACHED"
    | "REQUEST_RETRIED"
    | "PAYMENT_CONFIRMED"
    | "DATA_RETRIEVED"
    | "ERROR";
  timestamp: number;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

const PAYMENT_REQUIRED_HEADER = "payment-required";
const PAYMENT_SIGNATURE_HEADER = "payment-signature";
const PAYMENT_RESPONSE_HEADER = "payment-response";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 1;

// ---------------------------------------------------------------------------
// HELPER UTILITIES
// ---------------------------------------------------------------------------

/**
 * Base64-encode a JSON-serializable object into a header-safe string.
 */
function encodeHeader<T>(payload: T): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

/**
 * Decode a base64-encoded JSON header value.
 */
function decodeHeader<T>(headerValue: string): T {
  return JSON.parse(Buffer.from(headerValue, "base64").toString("utf8")) as T;
}

/**
 * Emit a structured event if a callback is registered.
 */
function emit(
  onEvent: AgentClientConfig["onEvent"],
  type: AgentEvent["type"],
  data: Record<string, unknown>
): void {
  if (onEvent) {
    onEvent({ type, timestamp: Date.now(), data });
  }
}

// ---------------------------------------------------------------------------
// STACKS READ-ONLY: simulate-borrow
// ---------------------------------------------------------------------------

/**
 * Calls the read-only `simulate-borrow` function on lend402-vault to determine
 * exact sBTC collateral required and net USDCx payment for a given borrow amount.
 *
 * This MUST be called before building the contract-call to ensure the collateral
 * argument matches the on-chain 150% ratio check exactly.
 */
async function simulateBorrow(
  amountUsdcx: bigint,
  config: AgentClientConfig
): Promise<SimulateBorrowResult> {
  const result = await callReadOnlyFunction({
    contractAddress: config.vaultContractAddress,
    contractName: config.vaultContractName,
    functionName: "simulate-borrow",
    functionArgs: [uintCV(amountUsdcx)],
    network: config.network,
    senderAddress: config.agentAddress,
  });

  const json = cvToJSON(result);

  // Unwrap the (ok { ... }) response
  if (json.type !== "(ok tuple)" && !json.success) {
    throw new Error(
      `simulate-borrow returned error: ${JSON.stringify(json.value)}`
    );
  }

  const v = json.value as Record<string, { value: string }>;

  return {
    required_collateral_sbtc: BigInt(v["required-collateral-sbtc"].value),
    origination_fee_usdcx: BigInt(v["origination-fee-usdcx"].value),
    net_payment_usdcx: BigInt(v["net-payment-usdcx"].value),
    sbtc_price_usd8: BigInt(v["sbtc-price-usd8"].value),
    usdcx_price_usd8: BigInt(v["usdcx-price-usd8"].value),
    collateral_ratio_bps: BigInt(v["collateral-ratio-bps"].value),
  };
}

// ---------------------------------------------------------------------------
// STACKS TX BUILDER: borrow-and-pay
// ---------------------------------------------------------------------------

/**
 * Builds and signs a Stacks contract-call transaction targeting
 * `lend402-vault::borrow-and-pay`.
 *
 * Post-conditions are set to guarantee:
 *   - Exactly `collateralSbtc` sBTC leaves the agent's wallet
 *   - Exactly `netPayment` USDCx leaves the vault to the merchant
 *
 * These post-conditions cause the transaction to abort if the contract
 * attempts to move different amounts than declared, providing cryptographic
 * guarantees to the merchant and the agent.
 */
async function buildAndSignBorrowAndPay(
  amountUsdcx: bigint,
  merchantAddress: string,
  collateralSbtc: bigint,
  netPayment: bigint,
  config: AgentClientConfig
): Promise<StacksTransaction> {
  const sbtcAssetInfo = createAssetInfo(
    config.sbtcContractAddress,
    config.sbtcContractName,
    "sbtc"
  );

  const usdcxAssetInfo = createAssetInfo(
    config.usdcxContractAddress,
    config.usdcxContractName,
    "usdc"
  );

  const txOptions: SignedContractCallOptions = {
    contractAddress: config.vaultContractAddress,
    contractName: config.vaultContractName,
    functionName: "borrow-and-pay",
    functionArgs: [
      uintCV(amountUsdcx),
      principalCV(merchantAddress),
      uintCV(collateralSbtc),
    ],
    // AnchorMode.Any: compatible with both microblocks and Nakamoto fast-blocks
    anchorMode: AnchorMode.Any,
    // PostConditionMode.Deny: revert if ANY unspecified token movement occurs
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      // 1. Agent sends exactly collateralSbtc sBTC to the vault
      makeStandardFungiblePostCondition(
        config.agentAddress,
        FungibleConditionCode.Equal,
        collateralSbtc,
        sbtcAssetInfo
      ),
      // 2. Vault sends exactly netPayment USDCx to the merchant
      makeContractFungiblePostCondition(
        config.vaultContractAddress,
        config.vaultContractName,
        FungibleConditionCode.Equal,
        netPayment,
        usdcxAssetInfo
      ),
    ],
    senderKey: config.privateKey,
    network: config.network,
    // fee: auto-estimated by Stacks.js via RPC
    fee: 2000n, // 2000 μSTX (~$0.001) — fast-block priority fee
  };

  const tx = await makeContractCall(txOptions);
  return tx;
}

// ---------------------------------------------------------------------------
// THE INTERCEPTOR
// ---------------------------------------------------------------------------

/**
 * Attaches the Lend402 x402 payment interceptor to an Axios instance.
 *
 * The interceptor catches HTTP 402 responses, extracts the payment challenge,
 * performs the JIT borrow, signs the contract-call, and retries the original
 * request with the `payment-signature` header attached.
 */
function attachPaymentInterceptor(
  axiosInstance: AxiosInstance,
  config: AgentClientConfig
): void {
  const maxRetries = config.maxPaymentRetries ?? DEFAULT_MAX_RETRIES;

  axiosInstance.interceptors.response.use(
    // Pass-through successful responses
    (response: AxiosResponse) => {
      // If the response carries a payment-response header, decode and log it
      const paymentResponseHeader =
        response.headers[PAYMENT_RESPONSE_HEADER];
      if (paymentResponseHeader) {
        const pr = decodeHeader<PaymentResponsePayload>(paymentResponseHeader);
        emit(config.onEvent, "PAYMENT_CONFIRMED", {
          txid: pr.txid,
          block_height: pr.block_height,
          confirmed_at: pr.confirmed_at,
          amount_usdcx: pr.amount_usdcx,
        });
      }
      return response;
    },

    // Handle errors — intercept 402s
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) throw error;

      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _paymentRetryCount?: number;
      };

      // Only intercept HTTP 402
      if (error.response?.status !== 402) throw error;

      // Guard against infinite retry loops
      const retryCount = originalRequest._paymentRetryCount ?? 0;
      if (retryCount >= maxRetries) {
        throw new Error(
          `Lend402: max payment retries (${maxRetries}) exceeded for ${originalRequest.url}`
        );
      }
      originalRequest._paymentRetryCount = retryCount + 1;

      // ── Stage 1: Decode the payment-required challenge ──────────────────
      const paymentRequiredRaw =
        error.response.headers[PAYMENT_REQUIRED_HEADER];
      if (!paymentRequiredRaw) {
        throw new Error(
          "Lend402: 402 response missing `payment-required` header"
        );
      }

      const challenge = decodeHeader<PaymentRequiredPayload>(paymentRequiredRaw);

      emit(config.onEvent, "PAYMENT_REQUIRED_RECEIVED", {
        resource: challenge.resource,
        amount_usdcx: challenge.amount_usdcx,
        merchant_address: challenge.merchant_address,
        network: challenge.network,
        nonce: challenge.nonce,
        expires_at: challenge.expires_at,
      });

      // Validate challenge hasn't expired
      const nowSec = Math.floor(Date.now() / 1000);
      if (nowSec > challenge.expires_at) {
        throw new Error(
          `Lend402: payment-required challenge expired at ${challenge.expires_at}`
        );
      }

      // Validate network matches agent config
      if (challenge.network !== config.caip2Network) {
        throw new Error(
          `Lend402: network mismatch — agent is on ${config.caip2Network}, merchant requires ${challenge.network}`
        );
      }

      const amountUsdcx = BigInt(challenge.amount_usdcx);

      // ── Stage 2: Simulate borrow to get exact collateral requirement ─────
      let simulation: SimulateBorrowResult;
      try {
        simulation = await simulateBorrow(amountUsdcx, config);
      } catch (simErr) {
        throw new Error(
          `Lend402: simulate-borrow failed: ${(simErr as Error).message}`
        );
      }

      emit(config.onEvent, "SIMULATE_BORROW_OK", {
        required_collateral_sbtc: simulation.required_collateral_sbtc.toString(),
        origination_fee_usdcx: simulation.origination_fee_usdcx.toString(),
        net_payment_usdcx: simulation.net_payment_usdcx.toString(),
        sbtc_price_usd8: simulation.sbtc_price_usd8.toString(),
        collateral_ratio_bps: simulation.collateral_ratio_bps.toString(),
      });

      // ── Stage 3: Build the contract-call transaction ─────────────────────
      let signedTx: StacksTransaction;
      try {
        signedTx = await buildAndSignBorrowAndPay(
          amountUsdcx,
          challenge.merchant_address,
          simulation.required_collateral_sbtc,
          simulation.net_payment_usdcx,
          config
        );
      } catch (buildErr) {
        throw new Error(
          `Lend402: failed to build borrow-and-pay tx: ${(buildErr as Error).message}`
        );
      }

      emit(config.onEvent, "TX_BUILT", {
        amount_usdcx: amountUsdcx.toString(),
        collateral_sbtc: simulation.required_collateral_sbtc.toString(),
        merchant: challenge.merchant_address,
      });

      // ── Stage 4: Serialize the signed transaction ───────────────────────
      const serialized = Buffer.from(signedTx.serialize()).toString("hex");

      emit(config.onEvent, "TX_SIGNED", {
        tx_hex_preview: serialized.slice(0, 32) + "…",
        byte_length: serialized.length / 2,
      });

      // ── Stage 5: Encode into payment-signature header ───────────────────
      const signaturePayload: PaymentSignaturePayload = {
        signed_tx_hex: serialized,
        agent_address: config.agentAddress,
        nonce: challenge.nonce,
        network: config.caip2Network,
        signed_at: Math.floor(Date.now() / 1000),
      };

      const encodedSignature = encodeHeader(signaturePayload);

      emit(config.onEvent, "PAYMENT_SIGNATURE_ATTACHED", {
        nonce: challenge.nonce,
        signed_at: signaturePayload.signed_at,
        agent_address: config.agentAddress,
      });

      // ── Stage 6: Retry original request with payment-signature ───────────
      if (!originalRequest.headers) {
        originalRequest.headers = {} as InternalAxiosRequestConfig["headers"];
      }
      originalRequest.headers[PAYMENT_SIGNATURE_HEADER] = encodedSignature;

      emit(config.onEvent, "REQUEST_RETRIED", {
        url: originalRequest.url,
        retry_count: originalRequest._paymentRetryCount,
      });

      return axiosInstance(originalRequest);
    }
  );
}

// ---------------------------------------------------------------------------
// PUBLIC FACTORY: withPaymentInterceptor
// ---------------------------------------------------------------------------

/**
 * Creates a pre-configured Axios instance with the Lend402 x402 payment
 * interceptor attached.
 *
 * Usage:
 * ```typescript
 * const agent = withPaymentInterceptor({
 *   privateKey: process.env.AGENT_PRIVATE_KEY!,
 *   agentAddress: "SP1AGENT...",
 *   network: new StacksMainnet(),
 *   caip2Network: "stacks:1",
 *   vaultContractAddress: "SP3VAULT...",
 *   vaultContractName: "lend402-vault",
 *   sbtcContractAddress: "SP2PABAF9...",
 *   sbtcContractName: "sbtc-token",
 *   usdcxContractAddress: "SP3K8BC0P...",
 *   usdcxContractName: "usdc-token",
 *   onEvent: (event) => dashboard.push(event),
 * });
 *
 * // This call will auto-pay any 402 it hits via Lend402 JIT borrow
 * const { data } = await agent.get("https://api.dataprovider.com/premium");
 * ```
 */
export function withPaymentInterceptor(
  config: AgentClientConfig,
  axiosConfig?: AxiosRequestConfig
): AxiosInstance {
  const instance = axios.create({
    timeout: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ...axiosConfig,
  });

  // Emit on every outbound request for dashboard logging
  instance.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    emit(config.onEvent, "REQUEST_SENT", { url: req.url, method: req.method });
    return req;
  });

  attachPaymentInterceptor(instance, config);
  return instance;
}

// ---------------------------------------------------------------------------
// STANDALONE EXPORT: broadcastSignedTx
// ---------------------------------------------------------------------------

/**
 * Broadcasts a signed Stacks transaction to the network and returns the txid.
 * Used by the Facilitator node — exported here for shared use.
 */
export async function broadcastSignedTx(
  signedTxHex: string,
  network: StacksNetwork
): Promise<TxBroadcastResult> {
  const tx = deserializeTransaction(signedTxHex);
  const result = await broadcastTransaction(tx, network);
  return result;
}

// ---------------------------------------------------------------------------
// NETWORK FACTORY HELPERS
// ---------------------------------------------------------------------------

export function mainnetConfig(
  privateKey: string,
  agentAddress: string
): Pick<AgentClientConfig, "network" | "caip2Network" | "vaultContractAddress" | "vaultContractName" | "sbtcContractAddress" | "sbtcContractName" | "usdcxContractAddress" | "usdcxContractName"> {
  return {
    network: new StacksMainnet(),
    caip2Network: "stacks:1",
    vaultContractAddress: "SP3VAULT000LEND402MAINNETADDRESS",
    vaultContractName: "lend402-vault",
    sbtcContractAddress: "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9",
    sbtcContractName: "sbtc-token",
    usdcxContractAddress: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9",
    usdcxContractName: "usdc-token",
  };
}

export function testnetConfig(): Pick<AgentClientConfig, "network" | "caip2Network" | "vaultContractAddress" | "vaultContractName" | "sbtcContractAddress" | "sbtcContractName" | "usdcxContractAddress" | "usdcxContractName"> {
  return {
    network: new StacksTestnet(),
    caip2Network: "stacks:2147483648",
    vaultContractAddress: "ST3VAULT000LEND402TESTNETADDRESS",
    vaultContractName: "lend402-vault",
    sbtcContractAddress: "ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4CB2WDX",
    sbtcContractName: "sbtc-token",
    usdcxContractAddress: "ST3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3CB2W5",
    usdcxContractName: "usdc-token",
  };
}
