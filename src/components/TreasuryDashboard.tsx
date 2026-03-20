"use client";

// =============================================================================
// src/components/TreasuryDashboard.tsx
// Agent treasury state: balances, simulate-borrow pre-flight guarantee card,
// active loan position with TXID explorer link, and premium data payload.
//
// Design: GlassCard panels + neo-brutalist accents. Full dark/light mode.
// PostConditionMode.DENY guarantee surfaced prominently before tx broadcast.
// =============================================================================

import React, { useMemo } from "react";
import { useAgent, LoanPosition, SimulatePreview } from "@/context/AgentContext";
import GlassCard from "@/components/ui/GlassCard";
import { Pill } from "@/components/ui/Chip";
import { getExplorerTxUrl, PUBLIC_AGENT_ADDRESS } from "@/lib/public-config";

// ---------------------------------------------------------------------------
// FORMATTERS
// ---------------------------------------------------------------------------

function formatSbtc(sats: bigint): string {
  return (Number(sats) / 1e8).toFixed(8);
}

function formatUsdcx(micro: bigint | number): string {
  const v = typeof micro === "bigint" ? Number(micro) : micro;
  return (v / 1_000_000).toFixed(2);
}

function explorerUrl(txid: string): string {
  return getExplorerTxUrl(txid);
}

function truncateTxid(txid: string): string {
  return txid.length > 16 ? `${txid.slice(0, 8)}…${txid.slice(-8)}` : txid;
}

// ---------------------------------------------------------------------------
// SECTION HEADER (internal)
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="font-mono text-[9px] tracking-widest font-black text-slate-400 dark:text-slate-600 uppercase">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BALANCE TILE
// ---------------------------------------------------------------------------

interface BalanceTileProps {
  asset: "sBTC" | "USDCx";
  amount: string;
  subtext: string;
  accentColor: string;
  badge?: "LOCKED" | "JIT" | null;
}

function BalanceTile({ asset, amount, subtext, accentColor, badge }: BalanceTileProps) {
  return (
    <GlassCard accentColor={accentColor} className="p-4">
      <div className="flex items-start justify-between mb-3">
        {/* Asset icon + name */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black font-mono"
            style={{ background: `${accentColor}18`, color: accentColor }}
          >
            {asset === "sBTC" ? "₿" : "$"}
          </div>
          <span className="font-mono text-[10px] tracking-widest font-bold text-slate-500 dark:text-slate-500 uppercase">
            {asset}
          </span>
        </div>

        {badge === "LOCKED" && (
          <Pill label="LOCKED" color="#f59e0b" />
        )}
        {badge === "JIT" && (
          <Pill label="JIT" color="#22d3ee" live />
        )}
      </div>

      <div
        className="font-mono text-2xl font-black tabular-nums leading-none mb-1.5"
        style={{ color: accentColor, letterSpacing: "-0.03em" }}
      >
        {amount}
      </div>

      <p className="font-mono text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        {subtext}
      </p>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// ROW — used inside position/preview cards
// ---------------------------------------------------------------------------

function DataRow({
  label,
  value,
  valueColor,
  mono = true,
}: {
  label: string;
  value: string;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
      <span className="font-mono text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-widest">
        {label}
      </span>
      <span
        className="font-mono text-[11px] font-bold tabular-nums"
        style={valueColor ? { color: valueColor } : undefined}
      >
        <span className={!valueColor ? "text-slate-600 dark:text-slate-400" : ""}>{value}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SIMULATE PREVIEW CARD — PostCondition guarantee prominently displayed
// ---------------------------------------------------------------------------

function SimulatePreviewCard({ preview }: { preview: SimulatePreview }) {
  const collateralBtc = formatSbtc(preview.requiredCollateralSbtc);
  const netUsdcx = formatUsdcx(preview.netPaymentUsdcx);
  const feeUsdcx = formatUsdcx(preview.originationFeeUsdcx);
  const priceUsd = (Number(preview.sbtcPriceUsd8) / 1e8).toFixed(2);

  return (
    <GlassCard accentColor="#a78bfa">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/30"
        style={{ background: "rgba(167,139,250,0.05)" }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
          style={{ backgroundColor: "#a78bfa", boxShadow: "0 0 6px #a78bfa" }}
        />
        <span className="font-mono text-[10px] font-black tracking-widest text-violet-500 dark:text-violet-400 uppercase">
          Simulate-Borrow Pre-Flight
        </span>
      </div>

      {/* Atomic formula */}
      <div className="px-4 pt-4 pb-3">
        <div
          className="rounded-lg px-3 py-2.5 mb-4 font-mono text-[11px] leading-relaxed"
          style={{
            background: "rgba(167,139,250,0.06)",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
        >
          <span className="text-slate-500 dark:text-slate-600">LOCK </span>
          <span className="font-black text-amber-500 dark:text-amber-400">{collateralBtc} sBTC</span>
          <span className="text-slate-500 dark:text-slate-600"> → ROUTE </span>
          <span className="font-black text-cyan-500 dark:text-cyan-400">{netUsdcx} USDCx</span>
          <span className="text-slate-500 dark:text-slate-600"> → MERCHANT</span>
        </div>

        {/* Invariants */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Col. Ratio",    value: "150%",         color: "#4ade80" },
            { label: "Orig. Fee",     value: `${feeUsdcx} USDCx`, color: "#f59e0b" },
            { label: "sBTC Price",    value: `$${priceUsd}`, color: "#94a3b8" },
            { label: "Net Payment",   value: `${netUsdcx} USDCx`, color: "#22d3ee" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40"
            >
              <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">
                {item.label}
              </p>
              <p
                className="font-mono text-sm font-black tabular-nums"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* PostCondition guarantee banner — critical trust signal */}
        <div
          className="rounded-lg px-3 py-3 flex items-start gap-2.5"
          style={{
            background: "rgba(248,113,113,0.06)",
            border: "1px solid rgba(248,113,113,0.25)",
          }}
        >
          <svg
            className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p className="font-mono text-[10px] leading-relaxed text-red-500 dark:text-red-400">
            <span className="font-black">PostConditionMode.DENY</span> — Any deviation from
            declared transfer amounts causes an atomic on-chain abort.
            The vault cannot move a single satoshi more than stated.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// ACTIVE POSITION CARD
// ---------------------------------------------------------------------------

function ActivePositionCard({ position }: { position: LoanPosition }) {
  const collateralBtc = (position.collateralSbtc / 1e8).toFixed(8);
  const debtUsdcx = formatUsdcx(position.principalUsdcx);
  const colRatio =
    position.principalUsdcx > 0
      ? (
          (((position.collateralSbtc / 1e8) * position.sbtcPriceUsd) /
            (position.principalUsdcx / 1e6)) *
          100
        ).toFixed(1)
      : "∞";

  const collateralUsd = (
    (position.collateralSbtc / 1e8) * position.sbtcPriceUsd
  ).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  const settledAt = new Date(position.originationTime).toLocaleTimeString();

  return (
    <GlassCard accentColor="#22d3ee">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/30"
        style={{ background: "rgba(34,211,238,0.04)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }}
          />
          <span className="font-mono text-[10px] font-black tracking-widest text-cyan-500 dark:text-cyan-400 uppercase">
            Active Debt Position
          </span>
        </div>
        <Pill label="NAKAMOTO CONFIRMED" color="#4ade80" live />
      </div>

      {/* Debt + Collateral highlight tiles */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3 mb-4">
        <div
          className="rounded-lg p-3 border border-slate-200 dark:border-slate-700/40"
          style={{ background: "rgba(248,113,113,0.05)" }}
        >
          <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">
            Debt Outstanding
          </p>
          <p className="font-mono text-xl font-black tabular-nums text-red-500 dark:text-red-400 leading-none">
            {debtUsdcx}
          </p>
          <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 mt-1">USDCx</p>
        </div>

        <div
          className="rounded-lg p-3 border border-slate-200 dark:border-slate-700/40"
          style={{ background: "rgba(245,158,11,0.05)" }}
        >
          <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">
            Locked Collateral
          </p>
          <p className="font-mono text-xl font-black tabular-nums text-amber-500 dark:text-amber-400 leading-none">
            {collateralBtc}
          </p>
          <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 mt-1">
            sBTC ≈ {collateralUsd}
          </p>
        </div>
      </div>

      {/* Position details */}
      <div className="px-4 pb-2">
        <DataRow
          label="Collateral Ratio"
          value={`${colRatio}%`}
          valueColor={Number(colRatio) >= 200 ? "#4ade80" : Number(colRatio) >= 150 ? "#f59e0b" : "#f87171"}
        />
        <DataRow
          label="Min Required"
          value="150.0%"
          valueColor="#64748b"
        />
        <DataRow
          label="Merchant Paid"
          value={`${position.merchantAddress.slice(0, 8)}…${position.merchantAddress.slice(-6)}`}
        />
        <DataRow
          label="Settled At"
          value={`${settledAt} · Block #${position.blockHeight}`}
        />
      </div>

      {/* TXID — cryptographic on-chain proof */}
      <div className="px-4 pb-4">
        <a
          href={explorerUrl(position.txid)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl px-3.5 py-3 group transition-all duration-200
            bg-cyan-50 border-2 border-slate-900 hover:-translate-x-0.5 hover:-translate-y-0.5
            shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
            active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
            dark:bg-cyan-500/8 dark:border-cyan-500/40 dark:hover:border-cyan-400
            dark:shadow-[3px_3px_0px_0px_rgba(34,211,238,0.35)] dark:hover:shadow-[4px_4px_0px_0px_rgba(34,211,238,0.45)]"
        >
          <div>
            <p className="font-mono text-[10px] font-black tracking-widest text-slate-900 dark:text-cyan-300 uppercase mb-0.5">
              Verify on Stacks Explorer →
            </p>
            <p className="font-mono text-[9px] text-slate-500 dark:text-cyan-700">
              TXID: {truncateTxid(position.txid)}
            </p>
          </div>
          <svg
            className="w-4 h-4 text-slate-700 dark:text-cyan-400 transition-transform group-hover:translate-x-0.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// PREMIUM DATA CARD
// ---------------------------------------------------------------------------

const CELL_COLORS = ["#f59e0b", "#a78bfa", "#22d3ee", "#4ade80", "#f97316", "#ec4899"];

// Keys injected by the gateway that are not part of the origin's response.
const GATEWAY_INTERNAL_KEYS = new Set(["position"]);

function formatPrimitiveValue(value: string | number | boolean | null): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

function isPrimitive(v: unknown): v is string | number | boolean | null {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

function PremiumDataCard({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([k]) => !GATEWAY_INTERNAL_KEYS.has(k));

  const primitiveEntries = entries.filter(([, v]) => isPrimitive(v)) as [string, string | number | boolean | null][];
  const complexEntries   = entries.filter(([, v]) => !isPrimitive(v));

  return (
    <GlassCard accentColor="#4ade80">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <svg
            className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="font-mono text-[10px] font-black tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
            Premium Data Retrieved
          </span>
        </div>

        {primitiveEntries.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            {primitiveEntries.map(([key, value], i) => (
              <div
                key={key}
                className="rounded-lg px-2.5 py-2 bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40"
              >
                <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1 truncate">
                  {key}
                </p>
                <p
                  className="font-mono text-sm font-black tabular-nums break-all"
                  style={{ color: CELL_COLORS[i % CELL_COLORS.length] }}
                >
                  {formatPrimitiveValue(value)}
                </p>
              </div>
            ))}
          </div>
        )}

        {complexEntries.map(([key, value]) => {
          const isObjArray =
            Array.isArray(value) &&
            value.length > 0 &&
            typeof value[0] === "object" &&
            value[0] !== null;

          return (
            <div
              key={key}
              className="mb-2 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 overflow-hidden"
            >
              <p className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest px-2.5 pt-2 pb-1">
                {key} {Array.isArray(value) ? `(${(value as unknown[]).length})` : ""}
              </p>
              {isObjArray ? (
                <div className="flex flex-col gap-1.5 px-2.5 pb-2.5">
                  {(value as Record<string, unknown>[]).map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-md bg-white/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30 px-2.5 py-2 overflow-hidden"
                    >
                      {Object.entries(item).map(([k, v], i) => {
                        const displayValue = Array.isArray(v)
                          ? (v as unknown[]).map(String).join(", ")
                          : isPrimitive(v)
                          ? String(formatPrimitiveValue(v))
                          : JSON.stringify(v);
                        return (
                          <div key={k} className="grid grid-cols-[auto_1fr] gap-x-2 items-baseline py-0.5 min-w-0">
                            <span className="font-mono text-[9px] text-slate-400 dark:text-slate-600 uppercase tracking-widest whitespace-nowrap">
                              {k}
                            </span>
                            <span
                              className="font-mono text-[10px] font-semibold truncate text-right overflow-hidden"
                              style={{ color: CELL_COLORS[i % CELL_COLORS.length] }}
                              title={displayValue}
                            >
                              {displayValue}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="font-mono text-[10px] text-slate-600 dark:text-slate-400 px-2.5 pb-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(value, null, 2)}
                </pre>
              )}
            </div>
          );
        })}

        {entries.length === 0 && (
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600">
            (empty response)
          </p>
        )}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// IDLE PLACEHOLDER
// ---------------------------------------------------------------------------

function IdlePlaceholder() {
  return (
    <GlassCard>
      <div className="px-4 py-6 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-slate-400 dark:text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx={12} cy={12} r={10} />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-slate-400 dark:text-slate-600">
          Agent holds sBTC only — zero USDCx exposure until a paywall is hit.
        </p>
        <p className="font-mono text-[11px] mt-2 text-slate-500 dark:text-slate-500">
          Click <span className="font-black text-slate-600 dark:text-slate-400">Trigger Agent</span> to initiate a JIT borrow.
        </p>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// MAIN COMPONENT
// ---------------------------------------------------------------------------

export default function TreasuryDashboard() {
  const { state } = useAgent();
  const { treasury, walletAddress, phase } = state;
  const { sbtcBalance, usdcxBalance, activePosition, simulatePreview, premiumData, settlementTxids } = treasury;

  const sbtcDisplay  = formatSbtc(sbtcBalance);
  const usdcxDisplay = `$${formatUsdcx(usdcxBalance)}`;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Wallet badge ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl
        bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl
        border border-slate-200/70 dark:border-slate-700/30">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor: PUBLIC_AGENT_ADDRESS ? "#4ade80" : "#475569",
              boxShadow: PUBLIC_AGENT_ADDRESS ? "0 0 6px #4ade80" : "none",
            }}
          />
          <span className="font-mono text-[10px] tracking-widest text-slate-400 dark:text-slate-600 uppercase">
            Agent Wallet
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500 dark:text-slate-500">
          {PUBLIC_AGENT_ADDRESS
            ? `${PUBLIC_AGENT_ADDRESS.slice(0, 8)}…${PUBLIC_AGENT_ADDRESS.slice(-6)}`
            : "NOT CONFIGURED"}
        </span>
      </div>

      {/* ── Treasury balances ── */}
      <div>
        <SectionHeader label="Treasury Balances" />
        <div className="grid grid-cols-2 gap-3">
          <BalanceTile
            asset="sBTC"
            amount={sbtcDisplay}
            subtext={
              activePosition
                ? `${formatSbtc(BigInt(Math.round(activePosition.collateralSbtc)))} locked`
                : "Bitcoin-backed asset"
            }
            accentColor="#f59e0b"
            badge={activePosition ? "LOCKED" : null}
          />
          <BalanceTile
            asset="USDCx"
            amount={usdcxDisplay}
            subtext={
              activePosition
                ? `${formatUsdcx(activePosition.principalUsdcx)} borrowed JIT`
                : "Borrowed just-in-time"
            }
            accentColor="#22d3ee"
            badge={activePosition ? "JIT" : null}
          />
        </div>
      </div>

      {/* ── Pre-flight preview (BUILDING / SIGNING phase) ── */}
      {simulatePreview && !activePosition && (
        <div>
          <SectionHeader label="Pre-Flight Guarantees" />
          <SimulatePreviewCard preview={simulatePreview} />
        </div>
      )}

      {/* ── Active loan position ── */}
      {activePosition && (
        <div>
          <SectionHeader label="Loan Position · Cryptographic Proof" />
          <ActivePositionCard position={activePosition} />
        </div>
      )}

      {/* ── Premium data payload ── */}
      {premiumData && Object.keys(premiumData).filter(k => !GATEWAY_INTERNAL_KEYS.has(k)).length > 0 && (
        <div>
          <SectionHeader label="Retrieved Data" />
          <PremiumDataCard data={premiumData} />
        </div>
      )}

      {/* ── Settlement proof — both txids after full cycle ── */}
      {settlementTxids && (
        <div>
          <SectionHeader label="Settlement" />
          <div className="flex flex-col gap-2">
            <a
              href={explorerUrl(settlementTxids.borrowTxid)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-xl px-3.5 py-3 group transition-all duration-200
                bg-cyan-50 border-2 border-slate-900 hover:-translate-x-0.5 hover:-translate-y-0.5
                shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                dark:bg-cyan-500/8 dark:border-cyan-500/40 dark:hover:border-cyan-400
                dark:shadow-[3px_3px_0px_0px_rgba(34,211,238,0.35)] dark:hover:shadow-[4px_4px_0px_0px_rgba(34,211,238,0.45)]"
            >
              <div>
                <p className="font-mono text-[10px] font-black tracking-widest text-slate-900 dark:text-cyan-300 uppercase mb-0.5">
                  Borrow-and-Pay →
                </p>
                <p className="font-mono text-[9px] text-slate-500 dark:text-cyan-700">
                  TXID: {truncateTxid(settlementTxids.borrowTxid)}
                </p>
              </div>
              <svg className="w-4 h-4 text-slate-400 dark:text-cyan-600 group-hover:text-slate-700 dark:group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            {settlementTxids.repayTxid && (
              <a
                href={explorerUrl(settlementTxids.repayTxid)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl px-3.5 py-3 group transition-all duration-200
                  bg-emerald-50 border-2 border-slate-900 hover:-translate-x-0.5 hover:-translate-y-0.5
                  shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
                  dark:bg-emerald-500/8 dark:border-emerald-500/40 dark:hover:border-emerald-400
                  dark:shadow-[3px_3px_0px_0px_rgba(74,222,128,0.35)] dark:hover:shadow-[4px_4px_0px_0px_rgba(74,222,128,0.45)]"
              >
                <div>
                  <p className="font-mono text-[10px] font-black tracking-widest text-slate-900 dark:text-emerald-300 uppercase mb-0.5">
                    Repay-Loan →
                  </p>
                  <p className="font-mono text-[9px] text-slate-500 dark:text-emerald-700">
                    TXID: {truncateTxid(settlementTxids.repayTxid)}
                  </p>
                </div>
                <svg className="w-4 h-4 text-slate-400 dark:text-emerald-600 group-hover:text-slate-700 dark:group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Idle placeholder ── */}
      {phase === "IDLE" && !activePosition && !settlementTxids && <IdlePlaceholder />}
    </div>
  );
}
