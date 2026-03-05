"use client";

// =============================================================================
// src/app/page.tsx
// Lend402 — Agent Command Center
// Design: Glassmorphism panels + Neo-brutalist interactive elements.
// Theme:  Full dark/light mode via Tailwind dark: modifier.
// Font:   JetBrains Mono (monospace) + Syne (display heading)
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { AgentProvider, useAgent } from "@/context/AgentContext";
import AgentTerminal from "@/components/AgentTerminal";
import TreasuryDashboard from "@/components/TreasuryDashboard";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { Chip, Pill } from "@/components/ui/Chip";

// ---------------------------------------------------------------------------
// THEME PROVIDER — manages dark class on <html> with localStorage persistence
// ---------------------------------------------------------------------------

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lend402-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  // Prevent flash of wrong theme on initial render
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950" aria-hidden />
    );
  }

  return <>{children}</>;
}

function useTheme() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("lend402-theme");
    setIsDark(stored !== "light");
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("lend402-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  return { isDark, toggle };
}

// ---------------------------------------------------------------------------
// THEME TOGGLE ICON
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
        border border-slate-200 bg-white/60 text-slate-600 hover:border-slate-400 hover:text-slate-900
        dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-slate-200"
    >
      {isDark ? (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx={12} cy={12} r={4} />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// HEADER
// ---------------------------------------------------------------------------

function Header() {
  const { state, connectWallet, disconnectWallet } = useAgent();
  const [now, setNow] = useState("");

  useEffect(() => {
    const tick = () =>
      setNow(new Date().toUTCString().replace("GMT", "UTC").replace(/ \d{4} /, " "));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50">
      {/* Glassmorphism strip */}
      <div className="bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">

          {/* ── Left: Wordmark + protocol chips ── */}
          <div className="flex items-center gap-3">
            {/* Logo badge */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
              bg-amber-400/10 border border-amber-400/30
              dark:bg-amber-400/8 dark:border-amber-400/20">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }}
              />
              <span className="font-mono text-[11px] font-black tracking-[0.12em] text-amber-600 dark:text-amber-400">
                LEND402
              </span>
            </div>

            <span className="text-slate-300 dark:text-slate-700 text-sm select-none">/</span>

            <span className="font-mono text-[10px] tracking-[0.12em] text-slate-400 dark:text-slate-600 uppercase hidden sm:block">
              Agent Command Center
            </span>

            {/* Protocol chips — visible on md+ */}
            <div className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
              <Chip label="CHAIN" value="NAKAMOTO" color="#a78bfa" />
              <Chip label="PROTOCOL" value="x402 V2" color="#f59e0b" />
              <Chip label="NETWORK" value="TESTNET" color="#22d3ee" live />
            </div>
          </div>

          {/* ── Right: clock + wallet + theme ── */}
          <div className="flex items-center gap-2 md:gap-3">
            {now && (
              <span className="font-mono text-[10px] tabular-nums text-slate-400 dark:text-slate-600 hidden xl:block">
                {now}
              </span>
            )}

            {state.isConnected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                  bg-emerald-400/10 border border-emerald-400/30
                  dark:bg-emerald-400/8 dark:border-emerald-400/20">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: "#4ade80", boxShadow: "0 0 5px #4ade80" }}
                  />
                  <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {state.walletAddress!.slice(0, 6)}…{state.walletAddress!.slice(-4)}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={disconnectWallet}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={connectWallet}>
                Connect Wallet
              </Button>
            )}

            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// METRICS BAR
// ---------------------------------------------------------------------------

function MetricsBar() {
  const { state } = useAgent();
  const { treasury } = state;

  const sbtcBtc = (Number(treasury.sbtcBalance) / 1e8).toFixed(6);
  const hasPos = !!treasury.activePosition;
  const colRatio = hasPos
    ? (
        (((treasury.activePosition!.collateralSbtc / 1e8) * treasury.activePosition!.sbtcPriceUsd) /
          (treasury.activePosition!.principalUsdcx / 1e6)) *
        100
      ).toFixed(1) + "%"
    : "—";

  const metrics = [
    {
      label: "sBTC BALANCE",
      value: `${sbtcBtc}`,
      unit: "sBTC",
      sub: "agent treasury",
      accent: "#f59e0b",
      icon: "₿",
    },
    {
      label: "USDCx DEBT",
      value: hasPos ? `$${(treasury.activePosition!.principalUsdcx / 1e6).toFixed(2)}` : "$0.00",
      unit: "USDCx",
      sub: "just-in-time borrow",
      accent: "#f87171",
      icon: "$",
    },
    {
      label: "COL. RATIO",
      value: colRatio,
      unit: "",
      sub: "min 150% enforced",
      accent: "#4ade80",
      icon: "◈",
    },
    {
      label: "BLOCK TIME",
      value: "~5",
      unit: "SEC",
      sub: "nakamoto fast-block",
      accent: "#22d3ee",
      icon: "⚡",
    },
  ] as const;

  return (
    <div className="border-b border-slate-200/80 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/60">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200/70 dark:divide-slate-800/60">
          {metrics.map((m) => (
            <div key={m.label} className="px-4 md:px-6 py-3 flex items-center gap-3">
              {/* Icon badge */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold font-mono shrink-0"
                style={{ background: `${m.accent}14`, color: m.accent }}
              >
                {m.icon}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-600 uppercase mb-0.5">
                  {m.label}
                </p>
                <p
                  className="font-mono text-base font-black tabular-nums leading-none"
                  style={{ color: m.accent }}
                >
                  {m.value}
                  {m.unit && (
                    <span
                      className="text-[10px] font-medium ml-1"
                      style={{ color: `${m.accent}80` }}
                    >
                      {m.unit}
                    </span>
                  )}
                </p>
                <p className="font-mono text-[9px] text-slate-400 dark:text-slate-700 mt-0.5 truncate">
                  {m.sub}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FLOW DIAGRAM
// ---------------------------------------------------------------------------

function FlowDiagram() {
  const { state } = useAgent();
  const { phase } = state;

  const steps = [
    { id: "REQUEST",   label: "REQUEST",  sub: "Agent → API",      active: phase === "REQUESTING" },
    { id: "INTERCEPT", label: "402",      sub: "Intercepted",      active: phase === "INTERCEPTED" || phase === "SIMULATING" },
    { id: "COLLATERAL",label: "LOCK sBTC",sub: "Vault collateral", active: phase === "BUILDING" || phase === "SIGNING" },
    { id: "BORROW",    label: "BORROW",   sub: "USDCx JIT",        active: phase === "BROADCASTING" },
    { id: "PAY",       label: "PAY",      sub: "Merchant",         active: phase === "CONFIRMING" },
    { id: "CONFIRM",   label: "CONFIRM",  sub: "Fast-block",       active: phase === "CONFIRMED" },
  ] as const;

  const completedOrder = [
    "INTERCEPTED", "SIMULATING", "BUILDING", "SIGNING",
    "BROADCASTING", "CONFIRMING", "CONFIRMED",
  ];

  return (
    <GlassCard>
      <div className="px-4 py-4">
        <div className="flex items-center overflow-x-auto gap-0.5 pb-1">
          {steps.map((step, i) => {
            const cIdx = completedOrder.indexOf(phase as string);
            const sIdx = completedOrder.indexOf(step.id as string);
            const isCompleted = phase !== "IDLE" && cIdx >= sIdx && cIdx !== -1;
            const isActive = step.active;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-0 px-1">
                  {/* Circle */}
                  <div
                    className={
                      `w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono font-black transition-all duration-500 ` +
                      (isActive || isCompleted ? "" : "text-slate-400 dark:text-slate-700")
                    }
                    style={{
                      background: isActive
                        ? "rgba(34,211,238,0.15)"
                        : isCompleted
                        ? "rgba(74,222,128,0.10)"
                        : undefined,
                      border: `2px solid ${
                        isActive
                          ? "#22d3ee"
                          : isCompleted
                          ? "#4ade80"
                          : "rgba(226,232,240,0.15)"
                      }`,
                      color: isActive ? "#22d3ee" : isCompleted ? "#4ade80" : undefined,
                      boxShadow: isActive ? "0 0 16px rgba(34,211,238,0.25)" : "none",
                    }}
                  >
                    {isCompleted && !isActive ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <p
                    className="font-mono font-black text-center leading-none"
                    style={{
                      fontSize: "9px",
                      letterSpacing: "0.06em",
                      color: isActive ? "#22d3ee" : isCompleted ? "#4ade80" : undefined,
                    }}
                    // Fallback Tailwind color when not active/completed
                    data-inactive={!isActive && !isCompleted ? "true" : undefined}
                  >
                    <span className={!isActive && !isCompleted ? "text-slate-400 dark:text-slate-600" : ""}>
                      {step.label}
                    </span>
                  </p>
                  <p className="font-mono text-center text-slate-400 dark:text-slate-700" style={{ fontSize: "8px" }}>
                    {step.sub}
                  </p>
                </div>

                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-px transition-all duration-700 min-w-[12px] ${
                      !isCompleted ? "bg-slate-200 dark:bg-slate-800" : ""
                    }`}
                    style={
                      isCompleted
                        ? { background: "linear-gradient(90deg, #4ade8060, #4ade8030)" }
                        : undefined
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// TRIGGER BUTTON (primary action)
// ---------------------------------------------------------------------------

function TriggerButton() {
  const { state, triggerAgent, resetSession } = useAgent();
  const { phase } = state;

  const isIdle     = phase === "IDLE";
  const isRunning  = phase !== "IDLE" && phase !== "CONFIRMED" && phase !== "ERROR";
  const isDone     = phase === "CONFIRMED";
  const isError    = phase === "ERROR";

  return (
    <div className="flex items-center gap-2.5">
      {(isDone || isError) && (
        <Button variant="ghost" size="md" onClick={resetSession}>
          Reset Session
        </Button>
      )}

      <button
        onClick={isIdle ? triggerAgent : undefined}
        disabled={isRunning}
        className={[
          "relative inline-flex items-center gap-2.5 px-6 py-3 rounded-lg",
          "font-mono text-xs font-black tracking-[0.1em] uppercase",
          "transition-all duration-200 overflow-hidden",
          isRunning ? "cursor-not-allowed opacity-80" : "cursor-pointer",
          // Light mode: neo-brutalist
          isDone
            ? "bg-emerald-400 border-2 border-slate-950 text-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            : isError
            ? "bg-red-400 border-2 border-slate-950 text-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            : isRunning
            ? "bg-cyan-400/80 border-2 border-slate-950 text-slate-950"
            : "bg-cyan-400 border-2 border-slate-950 text-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
          // Dark mode overrides
          isDone
            ? "dark:bg-emerald-500/10 dark:border-emerald-400 dark:text-emerald-300 dark:shadow-[3px_3px_0px_0px_rgba(74,222,128,0.4)]"
            : isError
            ? "dark:bg-red-500/10 dark:border-red-400 dark:text-red-300 dark:shadow-[3px_3px_0px_0px_rgba(248,113,113,0.4)]"
            : isRunning
            ? "dark:bg-cyan-500/10 dark:border-cyan-500/50 dark:text-cyan-400"
            : "dark:bg-cyan-500/10 dark:border-cyan-400 dark:text-cyan-300 dark:shadow-[3px_3px_0px_0px_rgba(34,211,238,0.4)] dark:hover:-translate-x-0.5 dark:hover:-translate-y-0.5 dark:hover:shadow-[4px_4px_0px_0px_rgba(34,211,238,0.5)] dark:active:translate-x-0.5 dark:active:translate-y-0.5 dark:active:shadow-none",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Animated shimmer sweep on hover (idle only) */}
        {isIdle && (
          <div
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
            }}
            aria-hidden
          />
        )}

        {/* Status icon */}
        {isRunning ? (
          <svg className="w-4 h-4 animate-spin relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <circle cx={12} cy={12} r={10} strokeOpacity={0.25} />
            <path d="M22 12a10 10 0 00-10-10" strokeLinecap="round" />
          </svg>
        ) : isDone ? (
          <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : isError ? (
          <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        )}

        <span className="relative z-10">
          {isRunning ? "Agent Running..." : isDone ? "Settlement Complete" : isError ? "Error — Reset to Retry" : "Trigger Agent"}
        </span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ERROR BANNER
// ---------------------------------------------------------------------------

function ErrorBanner() {
  const { state } = useAgent();
  if (state.phase !== "ERROR" || !state.lastError) return null;

  return (
    <GlassCard accentColor="#f87171" className="border-red-300/40 dark:border-red-500/30">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-red-400/20 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-xs font-bold text-red-600 dark:text-red-400 mb-0.5">
            AGENT ERROR
          </p>
          <p className="font-mono text-xs text-red-500/80 dark:text-red-500/70">
            {state.lastError}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// CONTRACT REFERENCE BAR
// ---------------------------------------------------------------------------

function ContractRefBar() {
  const refs = [
    { label: "VAULT CONTRACT", value: "lend402-vault.clar", color: "#a78bfa" },
    { label: "FUNCTION",       value: "borrow-and-pay",    color: "#f59e0b" },
    { label: "POST-CONDITIONS",value: "PostConditionMode.DENY", color: "#f87171" },
  ] as const;

  return (
    <GlassCard>
      <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {refs.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <span className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-600 uppercase">
              {r.label}
            </span>
            <span
              className="font-mono text-[11px] font-bold"
              style={{ color: r.color }}
            >
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// SECTION LABEL
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-widest font-black text-slate-400 dark:text-slate-600 uppercase">
        {children}
      </span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ARCHITECTURE FOOTNOTE
// ---------------------------------------------------------------------------

function ArchitectureFootnote() {
  return (
    <GlassCard>
      <div className="px-5 py-4">
        <p className="font-mono text-[10px] leading-relaxed text-slate-500 dark:text-slate-600">
          <span className="text-slate-600 dark:text-slate-500 font-bold">ARCHITECTURE: </span>
          Agent SDK intercepts 402 → calls{" "}
          <span className="text-violet-500 dark:text-violet-400 font-bold">simulate-borrow</span>
          {" "}(read-only pre-flight) → builds{" "}
          <span className="text-amber-500 dark:text-amber-400 font-bold">borrow-and-pay</span>
          {" "}contract-call with strict{" "}
          <span className="text-red-500 dark:text-red-400 font-bold">PostConditionMode.DENY</span>
          {" "}→ signs with agent key → Merchant API validates nonce → Facilitator broadcasts to
          Stacks mempool →{" "}
          <span className="text-cyan-500 dark:text-cyan-400 font-bold">Nakamoto fast-block</span>
          {" "}confirms sBTC lock + USDCx route in{" "}
          <span className="text-cyan-500 dark:text-cyan-400 font-bold">&lt;10 seconds</span>
          {" "}→ merchant grants access + returns{" "}
          <span className="text-emerald-500 dark:text-emerald-400 font-bold">payment-response</span>
          {" "}header.
        </p>
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// MAIN DASHBOARD
// ---------------------------------------------------------------------------

function CommandCenterDashboard() {
  return (
    <div
      className="min-h-screen flex flex-col font-mono
        bg-slate-50 dark:bg-slate-950
        text-slate-900 dark:text-slate-100"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 15% 0%, rgba(14,165,233,0.06) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 100%, rgba(167,139,250,0.05) 0%, transparent 55%)
        `,
      }}
    >
      {/* Noise texture overlay — very subtle */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <Header />
      <MetricsBar />

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-6 py-6 flex flex-col gap-5">

        {/* ── Top row: title + trigger button ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="max-w-lg">
            <h1 className="font-mono text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1.5">
              Agent Command Center
            </h1>
            <p className="font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
              Monitor your AI agent's JIT credit lifecycle on the Stacks blockchain.
              sBTC collateral → USDCx borrow → merchant payment — in a single Nakamoto fast-block.
            </p>
          </div>
          <TriggerButton />
        </div>

        {/* ── Flow diagram ── */}
        <FlowDiagram />

        {/* ── Error banner (conditional) ── */}
        <ErrorBanner />

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">

          {/* Left: Terminal + contract ref */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Live Activity Feed</SectionLabel>
            <AgentTerminal />
            <ContractRefBar />
          </div>

          {/* Right: Treasury */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Treasury State</SectionLabel>
            <TreasuryDashboard />
          </div>
        </div>

        <ArchitectureFootnote />

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/60
        bg-white/40 dark:bg-slate-950/60 backdrop-blur-sm">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 h-11 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-700 uppercase">
            Lend402 — JIT Micro-Lending for AI Agents · Stacks Nakamoto Release
          </span>
          <div className="flex items-center gap-4">
            <a
              href="https://docs.stacks.co"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-500 transition-colors uppercase"
            >
              Stacks Docs
            </a>
            <a
              href="https://explorer.hiro.so"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-700 hover:text-slate-600 dark:hover:text-slate-500 transition-colors uppercase"
            >
              Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ROOT — wraps with AgentProvider + ThemeProvider
// ---------------------------------------------------------------------------

export default function Page() {
  return (
    <ThemeProvider>
      <AgentProvider>
        <CommandCenterDashboard />
      </AgentProvider>
    </ThemeProvider>
  );
}
