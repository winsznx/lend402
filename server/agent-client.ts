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

