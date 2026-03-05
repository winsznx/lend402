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
