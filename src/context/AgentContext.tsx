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
} from "react";
import {
  showConnect,
  showSignMessage,
  UserSession,
  AppConfig,
} from "@stacks/connect";
import {
  PUBLIC_CAIP2_NETWORK,
  PUBLIC_STACKS_NETWORK,
  PUBLIC_VAULT_CONTRACT_ID,
  PUBLIC_AGENT_ADDRESS,
} from "@/lib/public-config";
import { DEFAULT_SBTC_CONTRACT, getHiroApiBaseUrl } from "@/lib/network";

// ---------------------------------------------------------------------------
// TYPES (mirrored from agent-client.ts — kept in sync manually or via shared pkg)
// ---------------------------------------------------------------------------

export type AgentEventType =
  | "REQUEST_SENT"
  | "PAYMENT_REQUIRED_RECEIVED"
  | "SIMULATE_BORROW_OK"
  | "TX_BUILT"
  | "TX_SIGNED"
  | "PAYMENT_HEADER_ATTACHED"
  | "REQUEST_RETRIED"
  | "PAYMENT_CONFIRMED"
  | "DATA_RETRIEVED"
  | "REPAY_INITIATED"
  | "POSITION_CLOSED"
  | "VAULT_REGISTERED"
  | "VAULT_CALL_RECEIVED"
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
  isHydrated: boolean;
  phase: AgentPhase;
  treasury: TreasuryState;
  terminalLines: TerminalLine[];
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// INITIAL STATE
// ---------------------------------------------------------------------------

const INITIAL_STATE: AgentState = {
  walletAddress: null,
  isConnected: false,
  isHydrated: false,
  phase: "IDLE",
  treasury: {
    sbtcBalance: 0n,
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
      text: `Protocol: x402 V2 | Network: ${PUBLIC_CAIP2_NETWORK} (${PUBLIC_STACKS_NETWORK}) | Vault: ${
        PUBLIC_VAULT_CONTRACT_ID || "UNCONFIGURED"
      }`,
    },
    {
      id: "boot-2",
      timestamp: Date.now() + 2,
      level: "info",
      text: 'Agent treasury loading... USDCx: $0.00. Press "Trigger Agent" to begin.',
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
  | { type: "WALLET_HYDRATED" }
  | { type: "SET_PHASE"; phase: AgentPhase }
  | { type: "PUSH_TERMINAL_LINE"; line: TerminalLine }
  | { type: "SET_SIMULATE_PREVIEW"; preview: SimulatePreview }
  | { type: "SET_ACTIVE_POSITION"; position: LoanPosition | null }
  | { type: "SET_PREMIUM_DATA"; data: Record<string, unknown> }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_SBTC_BALANCE"; balance: bigint }
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
        isHydrated: true,
      };

    case "WALLET_DISCONNECTED":
      return {
        ...state,
        walletAddress: null,
        isConnected: false,
        isHydrated: true,
      };

    case "WALLET_HYDRATED":
      return { ...state, isHydrated: true };

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
      if (pos === null) {
        // POSITION_CLOSED — restore sBTC balance from live ref, clear debt
        return {
          ...state,
          phase: "IDLE",
          treasury: {
            ...state.treasury,
            activePosition: null,
            usdcxBalance: BigInt(0),
            simulatePreview: null,
          },
        };
      }
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

    case "SET_SBTC_BALANCE":
      return {
        ...state,
        treasury: { ...state.treasury, sbtcBalance: action.balance },
      };

    case "RESET_SESSION":
      return {
        ...INITIAL_STATE,
        walletAddress: state.walletAddress,
        isConnected: state.isConnected,
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
  requestSignature: (message: string) => Promise<{ signature: string; publicKey: string }>;
  triggerAgent: (targetUrl?: string) => Promise<void>;
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
          text: `[INFO] Requesting premium data from ${event.data.url ?? "vault gateway"}...`,
          data: event.data,
        },
      ];

    case "PAYMENT_REQUIRED_RECEIVED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "warn",
          text: `[402]  x402 V2 402 body received. Payment Required.`,
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
      const feeUsdcx = Number(event.data.origination_fee_usdcx as string);
      const netUsdcx = Number(event.data.net_payment_usdcx as string);
      const grossUsdcx = feeUsdcx + netUsdcx;
      const collateralUsd = ((collateralSats / 1e8) * (priceRaw / 1e8)).toFixed(2);
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
        {
          id: lineId(),
          timestamp: ts + 4,
          level: "info",
          text: `[BORROW] Flash loan: ${(grossUsdcx / 1e6).toFixed(6)} USDCx borrowed from LP pool`,
        },
        {
          id: lineId(),
          timestamp: ts + 5,
          level: "info",
          text: `         Fee:    0.30% = ${(feeUsdcx / 1e6).toFixed(6)} USDCx → protocol treasury`,
        },
        {
          id: lineId(),
          timestamp: ts + 6,
          level: "info",
          text: `         Net:    ${(netUsdcx / 1e6).toFixed(6)} USDCx → merchant on delivery`,
        },
        {
          id: lineId(),
          timestamp: ts + 7,
          level: "info",
          text: `         Collateral: ${collateralBtc} sBTC (≈ $${collateralUsd}) locked until repaid`,
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
          text: `        Encoding into payment-signature header (base64, x402Version:2)...`,
        },
      ];

    case "PAYMENT_HEADER_ATTACHED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[SEND]  payment-signature header (x402 V2) attached. Retrying request...`,
          data: event.data,
        },
      ];

    case "VAULT_REGISTERED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "success",
          text: `[VAULT] API Vault registered. ID: ${event.data.vaultId ?? event.data.vault_id ?? "—"} → ${event.data.wrappedUrl ?? "—"}`,
          data: event.data,
        },
      ];

    case "VAULT_CALL_RECEIVED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[VAULT] Incoming x402 call | Vault: ${event.data.vault_id ?? "—"} | Payer: ${(event.data.payer as string)?.slice(0, 12) ?? "—"}...`,
          data: event.data,
        },
      ];

    case "REQUEST_RETRIED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "info",
          text: `[RETRY] Forwarding signed payload → Gateway → Stacks mempool...`,
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

    case "DATA_RETRIEVED": {
      const pos = event.data.position as LoanPosition | undefined;
      const lines: TerminalLine[] = [
        {
          id: lineId(),
          timestamp: ts,
          level: "success",
          text: `[SUCCESS] Premium data retrieved. Payment settled. Agent treasury updated.`,
          data: event.data,
        },
      ];
      if (pos) {
        const collateralBtc = (pos.collateralSbtc / 1e8).toFixed(8);
        const collateralUsd = (pos.collateralSbtc / 1e8 * pos.sbtcPriceUsd).toFixed(2);
        const grossUsdcx = (pos.principalUsdcx / 1e6).toFixed(6);
        const feeUsdcx = ((pos.principalUsdcx - pos.netPaymentUsdcx) / 1e6).toFixed(6);
        const netUsdcx = (pos.netPaymentUsdcx / 1e6).toFixed(6);
        lines.push(
          {
            id: lineId(),
            timestamp: ts + 1,
            level: "confirm",
            text: `[LEDGER]  Position opened:`,
          },
          {
            id: lineId(),
            timestamp: ts + 2,
            level: "confirm",
            text: `          + ${collateralBtc} sBTC locked as collateral (≈ $${collateralUsd})`,
          },
          {
            id: lineId(),
            timestamp: ts + 3,
            level: "confirm",
            text: `          + ${grossUsdcx} USDCx borrowed from LP pool`,
          },
          {
            id: lineId(),
            timestamp: ts + 4,
            level: "confirm",
            text: `          → ${feeUsdcx} USDCx origination fee → protocol reserve`,
          },
          {
            id: lineId(),
            timestamp: ts + 5,
            level: "confirm",
            text: `          → ${netUsdcx} USDCx net paid to ${pos.merchantAddress.slice(0, 16)}...`,
          },
          {
            id: lineId(),
            timestamp: ts + 6,
            level: "confirm",
            text: `          Loan ID: ${pos.txid.slice(0, 18)}... | Block: #${pos.blockHeight}`,
          },
        );
      }
      return lines;
    }

    case "REPAY_INITIATED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "warn",
          text: (event.data.message as string) ??
            `[REPAY] Closing position — broadcasting repay-loan (Loan ID: ${event.data.loan_id ?? "?"})...`,
          data: event.data,
        },
      ];

    case "POSITION_CLOSED":
      return [
        {
          id: lineId(),
          timestamp: ts,
          level: "success",
          text: (event.data.message as string) ??
            `[CLOSED ✓] Position closed. sBTC collateral returned.`,
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

// ---------------------------------------------------------------------------
// STACKS WALLET SESSION
// ---------------------------------------------------------------------------

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

function getAppDetails() {
  const icon =
    typeof window !== "undefined"
      ? `${window.location.origin}/favicon.svg`
      : "https://lend402.xyz/favicon.svg";

  return {
    name: "Lend402 Command Center",
    icon,
  };
}

function getConnectedAddress(): string {
  const profile = userSession.loadUserData();
  const walletNetwork = PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return (
    profile.profile?.stxAddress?.[walletNetwork] ??
    profile.profile?.stxAddress?.mainnet ??
    profile.profile?.stxAddress?.testnet ??
    ""
  );
}

// ---------------------------------------------------------------------------
// PROVIDER
// ---------------------------------------------------------------------------

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, INITIAL_STATE);
  const isAgentRunning = useRef(false);
  const liveBalanceRef = useRef<bigint>(0n);

  // Re-hydrate wallet on mount
  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? localStorage.getItem("lend402-wallet-address")
      : null;
    if (stored) {
      dispatch({ type: "WALLET_CONNECTED", address: stored });
      return;
    }
    if (userSession.isUserSignedIn()) {
      const address = getConnectedAddress();
      if (address) {
        localStorage.setItem("lend402-wallet-address", address);
        dispatch({ type: "WALLET_CONNECTED", address });
        return;
      }
    }
    dispatch({ type: "WALLET_HYDRATED" });
  }, []);

  // Fetch real agent sBTC balance on mount
  useEffect(() => {
    if (!PUBLIC_AGENT_ADDRESS) return;
    const sbtcContractId = DEFAULT_SBTC_CONTRACT[PUBLIC_STACKS_NETWORK];
    const apiBase = getHiroApiBaseUrl(PUBLIC_STACKS_NETWORK);
    const tokenKey = `${sbtcContractId}::sbtc-token`;

    fetch(`${apiBase}/extended/v1/address/${PUBLIC_AGENT_ADDRESS}/balances`)
      .then((r) => r.json())
      .then((data: { fungible_tokens?: Record<string, { balance: string }> }) => {
        const raw = data.fungible_tokens?.[tokenKey]?.balance ?? "0";
        const balance = BigInt(raw);
        liveBalanceRef.current = balance;
        dispatch({ type: "SET_SBTC_BALANCE", balance });
        dispatch({
          type: "PUSH_TERMINAL_LINE",
          line: {
            id: "treasury-loaded",
            timestamp: Date.now(),
            level: "info",
            text: `Agent treasury initialized. Holding ${(Number(balance) / 1e8).toFixed(8)} sBTC. USDCx: $0.00. Press "Trigger Agent" to begin.`,
          },
        });
      })
      .catch(() => {});
  }, []);

  // ── Wallet connect ─────────────────────────────────────────────────────────
  const connectWallet = useCallback(() => {
    showConnect({
      appDetails: getAppDetails(),
      manifestPath: "/manifest.json",
      redirectTo:
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/",
      onFinish: () => {
        const address = getConnectedAddress();
        if (address) localStorage.setItem("lend402-wallet-address", address);
        dispatch({ type: "WALLET_CONNECTED", address });
      },
      onCancel: () => {
        dispatch({
          type: "PUSH_TERMINAL_LINE",
          line: {
            id: lineId(),
            timestamp: Date.now(),
            level: "warn",
            text: "[WALLET] Connection request cancelled or wallet did not respond.",
          },
        });
      },
      userSession,
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem("lend402-wallet-address");
    userSession.signUserOut("/");
    dispatch({ type: "WALLET_DISCONNECTED" });
  }, []);

  const requestSignature = useCallback(
    (message: string) =>
      new Promise<{ signature: string; publicKey: string }>((resolve, reject) => {
        if (!userSession.isUserSignedIn()) {
          reject(new Error("Connect a wallet before signing"));
          return;
        }

        type WalletProvider = {
          request: (
            method: string,
            params: Record<string, unknown>
          ) => Promise<{ result: { signature: string; publicKey: string } }>;
        };
        const injected = (window as Window & { LeatherProvider?: WalletProvider; StacksProvider?: WalletProvider })
          .LeatherProvider ?? (window as Window & { LeatherProvider?: WalletProvider; StacksProvider?: WalletProvider }).StacksProvider;

        if (injected) {
          injected
            .request("stx_signMessage", { message, network: PUBLIC_STACKS_NETWORK })
            .then((resp) => resolve(resp.result))
            .catch((err: unknown) => reject(err instanceof Error ? err : new Error("Signature cancelled")));
          return;
        }

        showSignMessage({
          message,
          appDetails: getAppDetails(),
          userSession,
          network: PUBLIC_STACKS_NETWORK,
          stxAddress: getConnectedAddress(),
          onFinish: (data) => resolve(data),
          onCancel: () => reject(new Error("Signature request cancelled")),
        });
      }),
    []
  );

  // ── Push raw AgentEvent (from agent-client onEvent callback) ───────────────
  const pushEvent = useCallback((event: AgentEvent) => {
    const lines = eventToLines(event);
    lines.forEach((line) => dispatch({ type: "PUSH_TERMINAL_LINE", line }));

    // Side-effects: update treasury state from events
    switch (event.type) {
      case "PAYMENT_REQUIRED_RECEIVED":
        dispatch({ type: "SET_PHASE", phase: "INTERCEPTED" });
        setTimeout(() => dispatch({ type: "SET_PHASE", phase: "SIMULATING" }), 400);
        break;

      case "TX_BUILT":
        dispatch({ type: "SET_PHASE", phase: "SIGNING" });
        break;

      case "SIMULATE_BORROW_OK":
        dispatch({
          type: "SET_SIMULATE_PREVIEW",
          preview: {
            requiredCollateralSbtc: BigInt(
              event.data.required_collateral_sbtc as string
            ),
            originationFeeUsdcx: BigInt(
              event.data.origination_fee_usdcx as string
            ),
            netPaymentUsdcx: BigInt(event.data.net_payment_usdcx as string),
            sbtcPriceUsd8: BigInt(event.data.sbtc_price_usd8 as string),
            amountUsdcx: BigInt(0),
          },
        });
        dispatch({ type: "SET_PHASE", phase: "BUILDING" });
        break;

      case "TX_SIGNED":
        dispatch({ type: "SET_PHASE", phase: "BROADCASTING" });
        break;

      case "REQUEST_RETRIED":
        dispatch({ type: "SET_PHASE", phase: "CONFIRMING" });
        break;

      case "PAYMENT_CONFIRMED":
        dispatch({ type: "SET_PHASE", phase: "CONFIRMED" });
        break;

      case "POSITION_CLOSED":
        dispatch({ type: "SET_ACTIVE_POSITION", position: null });
        break;

      case "ERROR":
        dispatch({
          type: "SET_ERROR",
          error: (event.data.message as string) ?? "Unknown error",
        });
        break;
    }
  }, []);

  // ── Trigger Agent: opens the SSE stream that runs the vault request ───────
  const triggerAgent = useCallback(async (targetUrl?: string) => {
    if (isAgentRunning.current) return;
    isAgentRunning.current = true;

    dispatch({ type: "SET_PHASE", phase: "REQUESTING" });

    try {
      const sseUrl = targetUrl
        ? `/api/trigger-agent?targetUrl=${encodeURIComponent(targetUrl)}`
        : "/api/trigger-agent";
      const evtSource = new EventSource(sseUrl);

      evtSource.onmessage = (e: MessageEvent<string>) => {
        try {
          const event: AgentEvent = JSON.parse(e.data);
          pushEvent(event);

          if (event.type === "DATA_RETRIEVED") {
            dispatch({
              type: "SET_PREMIUM_DATA",
              data: event.data,
            });

            // Build active position from the PAYMENT_CONFIRMED data cached in event
            const pos = event.data.position as LoanPosition | undefined;
            if (pos) {
              dispatch({ type: "SET_ACTIVE_POSITION", position: pos });
            }

            // Don't close yet — wait for POSITION_CLOSED which arrives after repay confirms
          }

          if (event.type === "POSITION_CLOSED") {
            evtSource.close();
            isAgentRunning.current = false;
          }

          if (event.type === "ERROR") {
            evtSource.close();
            isAgentRunning.current = false;
          }
        } catch {
          // malformed SSE frame — ignore
        }
      };

      evtSource.onerror = () => {
        evtSource.close();
        isAgentRunning.current = false;
        dispatch({
          type: "SET_ERROR",
          error: "SSE connection to /api/trigger-agent failed",
        });
      };
    } catch (err) {
      isAgentRunning.current = false;
      dispatch({
        type: "SET_ERROR",
        error: (err as Error).message,
      });
    }
  }, [pushEvent]);

  const resetSession = useCallback(() => {
    isAgentRunning.current = false;
    dispatch({ type: "RESET_SESSION" });
    if (liveBalanceRef.current > 0n) {
      dispatch({ type: "SET_SBTC_BALANCE", balance: liveBalanceRef.current });
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        state,
        connectWallet,
        disconnectWallet,
        requestSignature,
        triggerAgent,
        resetSession,
        pushEvent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// HOOK
// ---------------------------------------------------------------------------

export function useAgent(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error("useAgent must be used inside <AgentProvider>");
  return ctx;
}
