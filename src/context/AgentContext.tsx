"use client";

// =============================================================================
// src/context/AgentContext.tsx
// Global state for the AI agent's treasury, loan lifecycle, and event stream.
// =============================================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  useState,
} from "react";
import { showConnect, UserSession, AppConfig } from "@stacks/connect";
import { StacksTestnet } from "@stacks/network";

// ---------------------------------------------------------------------------
// TYPES (mirrored from agent-client.ts — kept in sync manually or via shared pkg)
// ---------------------------------------------------------------------------

export type AgentEventType =
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

export interface AgentEvent {
  type: AgentEventType;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface TerminalLine {
  id: string;
  timestamp: number;
  level: "info" | "warn" | "success" | "error" | "system" | "confirm";
  text: string;
  data?: Record<string, unknown>;
}

export interface LoanPosition {
  loanId: string;
  principalUsdcx: number;    // 6 decimals (e.g. 500000 = $0.50)
  collateralSbtc: number;    // 8 decimals (satoshis)
  originationTime: number;   // unix ms
  txid: string;
  blockHeight: number;
  merchantAddress: string;
  netPaymentUsdcx: number;
  sbtcPriceUsd: number;      // human-readable (e.g. 97842.15)
}

export interface SimulatePreview {
  requiredCollateralSbtc: bigint;
  originationFeeUsdcx: bigint;
  netPaymentUsdcx: bigint;
  sbtcPriceUsd8: bigint;
  amountUsdcx: bigint;
}

export interface TreasuryState {
  /** sBTC balance (satoshis, 8 decimals) — starts populated, decreases as collateral is locked */
  sbtcBalance: bigint;
  /** USDCx balance (6 decimals) — starts at 0, agent borrows JIT */
  usdcxBalance: bigint;
  /** Active loan position, null when no debt outstanding */
  activePosition: LoanPosition | null;
  /** Preview from simulate-borrow, shown before tx confirmation */
  simulatePreview: SimulatePreview | null;
  /** Retrieved premium data payload */
  premiumData: Record<string, unknown> | null;
}

export type AgentPhase =
  | "IDLE"
  | "REQUESTING"
  | "INTERCEPTED"
  | "SIMULATING"
  | "BUILDING"
  | "SIGNING"
  | "BROADCASTING"
  | "CONFIRMING"
  | "CONFIRMED"
  | "ERROR";

export interface AgentState {
  walletAddress: string | null;
  isConnected: boolean;
  phase: AgentPhase;
  treasury: TreasuryState;
  terminalLines: TerminalLine[];
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// INITIAL STATE
// ---------------------------------------------------------------------------

const INITIAL_SBTC_BALANCE = BigInt("154700"); // 0.001547 sBTC (~$150 at $97k/BTC)

const INITIAL_STATE: AgentState = {
  walletAddress: null,
  isConnected: false,
  phase: "IDLE",
  treasury: {
    sbtcBalance: INITIAL_SBTC_BALANCE,
    usdcxBalance: BigInt(0),
    activePosition: null,
    simulatePreview: null,
    premiumData: null,
  },
  terminalLines: [
    {
      id: "boot-0",
      timestamp: Date.now(),
      level: "system",
      text: "LEND402 AGENT COMMAND CENTER v1.0.0 — Stacks Nakamoto Release",
    },
    {
      id: "boot-1",
      timestamp: Date.now() + 1,
      level: "system",
      text: "Protocol: x402 V2 | Network: stacks:2147483648 (testnet) | Vault: lend402-vault.clar",
    },
    {
      id: "boot-2",
      timestamp: Date.now() + 2,
      level: "info",
      text: 'Agent treasury initialized. Holding 0.001547 sBTC. USDCx: $0.00. Press "Trigger Agent" to begin.',
    },
  ],
  lastError: null,
};

// ---------------------------------------------------------------------------
// ACTIONS
// ---------------------------------------------------------------------------

type AgentAction =
  | { type: "WALLET_CONNECTED"; address: string }
  | { type: "WALLET_DISCONNECTED" }
  | { type: "SET_PHASE"; phase: AgentPhase }
  | { type: "PUSH_TERMINAL_LINE"; line: TerminalLine }
  | { type: "SET_SIMULATE_PREVIEW"; preview: SimulatePreview }
  | { type: "SET_ACTIVE_POSITION"; position: LoanPosition }
  | { type: "SET_PREMIUM_DATA"; data: Record<string, unknown> }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET_SESSION" };

// ---------------------------------------------------------------------------
// REDUCER
// ---------------------------------------------------------------------------

function agentReducer(state: AgentState, action: AgentAction): AgentState {
  switch (action.type) {
    case "WALLET_CONNECTED":
      return {
        ...state,
        walletAddress: action.address,
        isConnected: true,
      };

    case "WALLET_DISCONNECTED":
      return {
        ...state,
        walletAddress: null,
        isConnected: false,
      };

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    case "PUSH_TERMINAL_LINE":
      return {
        ...state,
        terminalLines: [...state.terminalLines, action.line],
      };

    case "SET_SIMULATE_PREVIEW":
      return {
        ...state,
        treasury: { ...state.treasury, simulatePreview: action.preview },
      };

    case "SET_ACTIVE_POSITION": {
      const pos = action.position;
      // Lock collateral from balance, debt is JIT-borrowed (never in wallet)
      const newSbtcBalance =
        state.treasury.sbtcBalance - BigInt(Math.round(pos.collateralSbtc));
      return {
        ...state,
        treasury: {
          ...state.treasury,
          sbtcBalance: newSbtcBalance < 0n ? 0n : newSbtcBalance,
          usdcxBalance: BigInt(0), // USDCx went directly to merchant
          activePosition: pos,
          simulatePreview: null,
        },
      };
    }

    case "SET_PREMIUM_DATA":
      return {
        ...state,
        treasury: { ...state.treasury, premiumData: action.data },
      };

    case "SET_ERROR":
      return {
        ...state,
        phase: "ERROR",
        lastError: action.error,
      };

    case "RESET_SESSION":
      return {
        ...INITIAL_STATE,
        walletAddress: state.walletAddress,
        isConnected: state.isConnected,
        treasury: {
          ...INITIAL_STATE.treasury,
          sbtcBalance: INITIAL_SBTC_BALANCE,
        },
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// CONTEXT
// ---------------------------------------------------------------------------

interface AgentContextValue {
  state: AgentState;
  connectWallet: () => void;
  disconnectWallet: () => void;
  triggerAgent: () => Promise<void>;
  resetSession: () => void;
  pushEvent: (event: AgentEvent) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

// ---------------------------------------------------------------------------
// EVENT → TERMINAL LINE MAPPER
// ---------------------------------------------------------------------------

function lineId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function eventToLines(event: AgentEvent): TerminalLine[] {
  const ts = event.timestamp;

  switch (event.type) {
    case "REQUEST_SENT":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[INFO] Requesting premium data from ${event.data.url ?? "merchant API"}...`,
          data: event.data,
        },
      ];

    case "PAYMENT_REQUIRED_RECEIVED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "warn",
          text: `[402]  Payment Required intercepted.`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "warn",
          text: `       Resource: "${event.data.resource}" | Cost: ${
            ((event.data.amount_usdcx as number) / 1_000_000).toFixed(2)
          } USDCx | Merchant: ${(event.data.merchant_address as string).slice(0, 12)}...`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 2,
          level: "info",
          text: `[INFO] Initiating Lend402 Flash Collateralization...`,
        },
      ];

    case "SIMULATE_BORROW_OK": {
      const collateralSats = Number(event.data.required_collateral_sbtc as string);
      const collateralBtc = (collateralSats / 1e8).toFixed(8);
      const priceRaw = Number(event.data.sbtc_price_usd8 as string);
      const priceUsd = (priceRaw / 1e8).toFixed(2);
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[CALC] simulate-borrow pre-flight complete:`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "info",
          text: `       sBTC price: $${priceUsd} | Collateral ratio: ${event.data.collateral_ratio_bps}bps (150%)`,
        },
        {
          id: lineId(),
          timestamp: ts + 2,
          level: "system",
          text: `       LOCKING ${collateralBtc} sBTC → ROUTING exact USDCx to merchant`,
        },
        {
          id: lineId(),
          timestamp: ts + 3,
          level: "system",
          text: `       PostConditionMode.DENY active — any deviation causes atomic on-chain abort.`,
        },
      ];
    }

    case "TX_BUILT":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[BUILD] borrow-and-pay contract-call payload constructed.`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "info",
          text: `        Args: amount_usdcx=${event.data.amount_usdcx} | collateral_sbtc=${event.data.collateral_sbtc} | merchant=${(event.data.merchant as string)?.slice(0, 12)}...`,
        },
      ];

    case "TX_SIGNED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[SIGN]  Payload signed with agent secp256k1 key. Byte length: ${event.data.byte_length}`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "info",
          text: `        Embedding into payment-signature header (base64)...`,
        },
      ];

    case "PAYMENT_SIGNATURE_ATTACHED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[SEND]  payment-signature header attached. Retrying request...`,
          data: event.data,
        },
      ];

    case "REQUEST_RETRIED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[RETRY] Forwarding signed payload → Merchant API → Facilitator → Stacks mempool...`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "info",
          text: `        Awaiting Nakamoto fast-block confirmation (~5 seconds)...`,
        },
      ];

    case "PAYMENT_CONFIRMED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "confirm",
          text: `[CONFIRMED] ✓ Nakamoto fast-block settlement verified.`,
          data: event.data,
        },
        {
          id: lineId(),
          timestamp: ts + 1,
          level: "confirm",
          text: `            TXID: ${event.data.txid} | Block: #${event.data.block_height}`,
        },
      ];

    case "DATA_RETRIEVED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "success",
          text: `[SUCCESS] Premium data retrieved. Payment settled. Agent treasury updated.`,
          data: event.data,
        },
      ];

    case "ERROR":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "error",
          text: `[ERROR] ${event.data.message ?? "Unknown error"}`,
          data: event.data,
        },
      ];

    default:
      return [];
  }
}
