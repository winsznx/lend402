import Link from "next/link";
import React from "react";

// ---------------------------------------------------------------------------
// Static terminal — matches real AgentTerminal color conventions exactly
// ---------------------------------------------------------------------------

function StaticTerminal() {
  return (
    <div
      className="relative flex flex-col rounded-xl overflow-hidden w-full"
      style={{
        background: "linear-gradient(160deg, #090e1a 0%, #050810 100%)",
        border: "1px solid rgba(30,41,59,0.8)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Title bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid rgba(30,41,59,0.8)", background: "rgba(10,15,26,0.85)" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="font-mono text-[10px] tracking-widest text-slate-600 truncate">
            AGENT ACTIVITY LOG — lend402::borrow-and-pay
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold shrink-0 ml-3" style={{ color: "#4ade80" }}>
          ● LIVE
        </span>
      </div>

      {/* Log lines */}
      <div className="px-4 py-4 font-mono text-[12px] flex flex-col gap-2.5 leading-relaxed overflow-x-auto">
        <div className="flex gap-3">
          <span className="text-slate-700 shrink-0 tabular-nums select-none">11:31:01.197</span>
          <span className="text-white/40">——&nbsp; [REQUEST] GET https://gateway.lend402.xyz/v/abc123/prices/BTC-USD/spot</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-700 shrink-0 tabular-nums select-none">11:31:01.199</span>
          <span style={{ color: "#f59e0b" }}>——&nbsp; [402]&nbsp;&nbsp;&nbsp;&nbsp; Payment required · sBTC collateral path active</span>
        </div>
        <div className="flex gap-3">
          <span className="text-slate-700 shrink-0 tabular-nums select-none">11:31:06.441</span>
          <span style={{ color: "#4ade80" }}>——&nbsp; [CONFIRMED ✓] Block #142857 · TXID: 0x3f9a1c...e4b2 · +$0.50 USDCx settled</span>
        </div>
        <div className="flex gap-3 pt-1">
          <span className="text-slate-700 select-none">agent@lend402:~$</span>
          <span
            className="inline-block w-2 h-3.5 align-middle"
            style={{ backgroundColor: "#22d3ee", animation: "pulse 1.1s step-end infinite" }}
          />
        </div>
      </div>

      {/* Status bar */}
      <div
        className="flex items-center gap-4 px-4 py-2 shrink-0 font-mono text-[9px] tracking-widest"
        style={{ borderTop: "1px solid rgba(30,41,59,0.8)", background: "rgba(10,15,26,0.70)" }}
      >
        <span className="text-slate-700 uppercase">
          NETWORK <span style={{ color: "#22d3ee" }}>STACKS:1</span>
        </span>
        <span className="text-slate-700 uppercase">BLOCK ~5S</span>
        <span className="text-slate-700 uppercase">
          PROTO <span style={{ color: "#22d3ee" }}>X402 V2</span>
        </span>
        <span className="text-slate-800 uppercase ml-auto">NAKAMOTO RELEASE</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full">

      {/* ── 1. Hero ── */}
      <section className="relative w-full min-h-screen flex items-center justify-center pt-12 pb-24 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none" style={{ background: "rgba(34,211,238,0.08)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none" style={{ background: "rgba(245,158,11,0.06)" }} />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left */}
            <div className="flex flex-col gap-6 text-center lg:text-left">
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-500">
                x402 · sBTC · USDCx · STACKS:1
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
                The payment and credit rail for agentic APIs on Stacks.
              </h1>
              <p className="text-lg sm:text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Point Lend402 at any HTTPS endpoint. Agents pay from sBTC collateral without pre-loading stablecoins. Every settlement is an on-chain transaction ID.
              </p>
              <div className="flex justify-center lg:justify-start mt-2">
                <Link
                  href="/vault/new"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg font-semibold text-base transition-all"
                  style={{
                    background: "#22d3ee",
                    color: "#0a0a0a",
                    boxShadow: "0 0 24px rgba(34,211,238,0.35)",
                  }}
                >
                  Register an API vault →
                </Link>
              </div>
            </div>

            {/* Right — static terminal */}
            <div className="w-full">
              <StaticTerminal />
            </div>

          </div>
        </div>
      </section>

      {/* ── 2. Three-persona cards ── */}
      <section className="py-24 border-y border-slate-800/50" style={{ background: "rgba(9,14,26,0.5)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-12 tracking-tight text-center lg:text-left">
            Built for three different users.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {/* Card 1 — API Providers */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#22d3ee" }}>
                For API Providers
              </p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#22d3ee" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-100 leading-snug">Monetize any endpoint in 60 seconds</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Enter your origin URL and a price per call. Lend402 wraps it behind a payment-aware gateway. You receive USDCx directly in your Stacks wallet — no billing infrastructure, no API keys, no invoices.
              </p>
            </div>

            {/* Card 2 — Agent Operators */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#f59e0b" }}>
                For AI Agent Operators
              </p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#f59e0b" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-100 leading-snug">Pay from sBTC. Never pre-load stablecoins.</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Your agent holds sBTC as its treasury asset. When it hits a 402, Lend402 borrows the exact USDCx needed, settles on Stacks Nakamoto in under 10 seconds, and repays atomically. Zero idle stablecoin exposure at rest.
              </p>
            </div>

            {/* Card 3 — Enterprise */}
            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80 hover:border-slate-700 transition-colors">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#a78bfa" }}>
                For Enterprise
              </p>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#a78bfa" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-100 leading-snug">Every payment is cryptographically auditable</h3>
              <p className="text-slate-400 leading-relaxed text-[15px]">
                Each call produces a Stacks transaction ID verifiable on the public Hiro explorer. The blockchain is the receipt — no vendor billing records needed.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3. Six-step flow ── */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-4 tracking-tight">
              How a paid call moves through the system.
            </h2>
          </div>

          <div className="relative">
            {/* Desktop connector line */}
            <div className="hidden lg:block absolute top-7 left-[calc(100%/12)] right-[calc(100%/12)] h-px bg-slate-800" />

            <div className="flex flex-col lg:flex-row gap-8 lg:gap-0 justify-between relative z-10">
              {[
                { n: "1", label: "REQUEST",        desc: "Agent calls the wrapped gateway URL." },
                { n: "2", label: "402",             desc: "Gateway returns an x402 V2 challenge with payment requirements." },
                { n: "3", label: "LOCK sBTC",       desc: "Agent SDK locks sBTC collateral in the vault contract." },
                { n: "4", label: "BORROW USDCx JIT",desc: "USDCx is borrowed just-in-time against the locked collateral." },
                { n: "5", label: "PAY MERCHANT",    desc: "USDCx routes directly to the provider's Stacks wallet." },
                { n: "6", label: "CONFIRM",         desc: "Nakamoto fast-block confirms settlement in under 10 seconds." },
              ].map((item, i) => (
                <div key={item.n} className="flex flex-row lg:flex-col items-start lg:items-center text-left lg:text-center flex-1 relative group">
                  {i !== 5 && <div className="lg:hidden absolute top-14 bottom-[-1rem] left-7 w-px bg-slate-800" />}
                  <div
                    className="shrink-0 w-14 h-14 rounded-full border-2 border-white/[0.15] text-slate-400 flex items-center justify-center font-mono font-bold text-lg z-10 transition-all duration-200 lg:mb-8 group-hover:border-[#22d3ee] group-hover:text-[#22d3ee]"
                    style={{ background: "#050810", boxShadow: "0 0 15px rgba(0,0,0,0.5)" }}
                  >
                    {item.n}
                  </div>
                  <div className="ml-6 lg:ml-0 flex flex-col pt-3 lg:pt-0 pb-6 lg:pb-0 px-0 lg:px-2">
                    <h4 className="font-mono font-bold tracking-widest mb-2 uppercase text-xs" style={{ color: "#22d3ee" }}>
                      {item.label}
                    </h4>
                    <p className="text-[14px] text-slate-400 max-w-[180px] mx-auto leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Technical differentiation ── */}
      <section className="py-24 border-t border-slate-800/50" style={{ background: "rgba(9,14,26,0.5)" }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-12 tracking-tight">
            Three Stacks-native properties no other x402 implementation has.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            <div className="flex flex-col gap-3 p-6 rounded-xl bg-[#050810] border border-slate-800/80">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#f87171" }}>
                PostConditionMode.Deny
              </p>
              <h4 className="text-lg font-bold text-slate-200">Consensus-layer payment safety</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                sBTC collateral movement is enforced at the Stacks consensus layer, not the smart contract layer. If any declared amount differs from what executes, the entire transaction reverts. This is not available on Ethereum or Solana.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-6 rounded-xl bg-[#050810] border border-slate-800/80">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#f59e0b" }}>
                Atomic Borrow-and-Pay
              </p>
              <h4 className="text-lg font-bold text-slate-200">One contract call, five operations</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                A single Clarity function checks collateral ratio, locks sBTC, borrows USDCx, transfers it to the provider, and records the debt position. Everything succeeds or nothing moves.
              </p>
            </div>

            <div className="flex flex-col gap-3 p-6 rounded-xl bg-[#050810] border border-slate-800/80">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#22d3ee" }}>
                X402 V2 Compliant
              </p>
              <h4 className="text-lg font-bold text-slate-200">Beyond the baseline spec</h4>
              <p className="text-slate-400 text-[15px] leading-relaxed">
                Implements canonical payment-signature, payment-required, and payment-response headers with a payment-identifier tamper detection extension that validates txid integrity before broadcast.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. Architecture callout ── */}
      <section className="py-16 px-4 sm:px-8" style={{ background: "#0a0a0a" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">

            {/* Left — flow sentence */}
            <div>
              <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-600 mb-4">
                How a paid call moves
              </p>
              <div className="font-mono text-sm sm:text-base leading-relaxed flex flex-wrap gap-x-1 gap-y-1 items-center">
                {[
                  { text: "Agent SDK intercepts 402", color: "rgba(255,255,255,0.8)" },
                  { text: "→", color: "#22d3ee" },
                  { text: "simulate-borrow pre-flight", color: "#f59e0b" },
                  { text: "→", color: "#22d3ee" },
                  { text: "borrow-and-pay contract-call", color: "#f59e0b" },
                  { text: "→", color: "#22d3ee" },
                  { text: "PostConditionMode.DENY", color: "#f59e0b" },
                  { text: "→", color: "#22d3ee" },
                  { text: "Stacks mempool", color: "rgba(255,255,255,0.8)" },
                  { text: "→", color: "#22d3ee" },
                  { text: "Nakamoto fast-block", color: "#4ade80" },
                  { text: "→", color: "#22d3ee" },
                  { text: "payment-response header", color: "#22d3ee" },
                ].map((t, i) => (
                  <span key={i} style={{ color: t.color }}>{t.text}</span>
                ))}
              </div>
            </div>

            {/* Right — metrics */}
            <div className="flex flex-row lg:flex-col gap-8 lg:gap-6 shrink-0">
              <div>
                <p className="font-mono text-4xl font-black" style={{ color: "#22d3ee" }}>~5s</p>
                <p className="font-mono text-[11px] text-slate-500 mt-1">Nakamoto confirmation time</p>
              </div>
              <div>
                <p className="font-mono text-4xl font-black" style={{ color: "#f59e0b" }}>1 txid</p>
                <p className="font-mono text-[11px] text-slate-500 mt-1">per call, verifiable on Hiro explorer</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 6. Dual CTA band ── */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#22d3ee" }}>
                For API Providers
              </p>
              <h3 className="text-xl font-bold text-slate-100">
                Wrap any HTTPS endpoint behind x402 in under a minute.
              </h3>
              <div className="mt-2">
                <Link
                  href="/vault/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all"
                  style={{ background: "#22d3ee", color: "#0a0a0a", boxShadow: "0 0 20px rgba(34,211,238,0.25)" }}
                >
                  Register an API vault →
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-8 rounded-2xl bg-[#050810] border border-slate-800/80">
              <p className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: "#f59e0b" }}>
                For Agent Operators
              </p>
              <h3 className="text-xl font-bold text-slate-100">
                Test the full borrow-and-pay flow against a live vault.
              </h3>
              <div className="mt-2">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all border"
                  style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
                >
                  Open command center →
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
