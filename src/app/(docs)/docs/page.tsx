import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  PUBLIC_CAIP2_NETWORK,
  PUBLIC_STACKS_NETWORK,
  PUBLIC_VAULT_CONTRACT_ID,
} from "@/lib/public-config";

export const metadata: Metadata = {
  title: "Lend402 Docs",
  description:
    "Detailed project documentation for Lend402: architecture, Stacks alignment, deployment, judging criteria, and current production status.",
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const summaryCards = [
  { label: "Product",        value: "x402 Payment + JIT Credit",   detail: "Paid agent calls wrapped around Stacks-native settlement.",           color: "#22d3ee" },
  { label: "Core Assets",    value: "sBTC + USDCx",                detail: "sBTC secures the credit path and USDCx handles priced API settlement.", color: "#f59e0b" },
  { label: "Deployment",     value: "Vercel + Railway",             detail: "Next.js on Vercel, Postgres and Redis on Railway, settlement on Stacks.", color: "#4ade80" },
  { label: "Target Network", value: PUBLIC_STACKS_NETWORK.toUpperCase(), detail: `CAIP-2 network id ${PUBLIC_CAIP2_NETWORK}.`,                  color: "#a78bfa" },
] as const;

const flowSteps = [
  { step: "01", title: "Provider registers an API vault",    body: "The provider submits an origin URL, a per-call USDCx price, rate limits, and optional webhook details. Lend402 stores that vault in Postgres and exposes a wrapped payment-aware endpoint." },
  { step: "02", title: "Agent hits the wrapped endpoint",    body: "The gateway returns HTTP 402 with an x402 V2 challenge that specifies the Stacks network, the asset, the price, the payee, and the request resource." },
  { step: "03", title: "Agent finances and signs the call",  body: "The agent SDK runs a read-only collateral preview, falls back to a live DIA quote if the vault cache is cold, builds the Clarity borrow-and-pay transaction, attaches strict post-conditions, signs the transaction, and retries with the official x402 payment-signature header." },
  { step: "04", title: "Gateway validates and settles",      body: "Lend402 parses the payment payload, guards against replays and rate abuse, broadcasts the signed Stacks transaction, waits for confirmation, and records the call." },
  { step: "05", title: "Origin response is released",        body: "Once settlement confirms, the gateway forwards the request to the provider origin and returns the upstream response with an official x402 payment-response receipt header." },
  { step: "06", title: "Provider dashboard reflects revenue", body: "Vault owners can review call counts, wrapped URLs, earnings, and recent payment activity from the dashboard surfaces inside the app." },
] as const;

const stackComponents = [
  { title: "Clarity Vault",      body: `The core contract is ${PUBLIC_VAULT_CONTRACT_ID}. It handles borrow-and-pay, liquidity accounting, collateral checks, cached DIA-backed quote paths, and provider-directed settlement.` },
  { title: "Stacks Agent SDK",   body: "The agent client intercepts 402 responses, computes borrowing requirements, builds the Stacks transaction, signs it, and retries the request with a valid x402 payload." },
  { title: "Gateway and Proxy",  body: "The Next.js gateway is both the x402 boundary and the payment-aware reverse proxy. It enforces payment, persists call metadata, and safely forwards the origin request." },
  { title: "Postgres and Redis", body: "Postgres stores vaults and settled calls. Redis is used for rate limiting, replay protection, and settlement idempotency where low-latency lookups matter." },
  { title: "Cache Warmer Route", body: "An authenticated internal route can submit refresh-price-cache on-chain from a dedicated relayer wallet so the contract's cached DIA quote stays warm for read-only paths." },
] as const;

const securityPoints = [
  "Clarity contract settlement instead of off-chain balance mutation.",
  "PostConditionMode.Deny on the agent-built transaction.",
  "Replay protection and idempotent settlement tracking in Redis.",
  "SSRF filtering on provider origin and webhook URLs.",
  "Wallet-authenticated vault registration and dashboard access.",
  "Recorded settlement receipts and txid-level traceability to Hiro Explorer.",
] as const;

const judgingCriteria = [
  { title: "Innovation",             verdict: "Strong",                          body: "The differentiator is not only x402 paywalls. Lend402 adds just-in-time credit, so an agent does not need to pre-hold the full payment asset for every call." },
  { title: "Technical Implementation", verdict: "Strong, with remaining hardening work", body: "The flow spans Clarity, signed Stacks transactions, typed x402 payloads, DIA-backed pricing, settlement polling, Postgres persistence, Redis controls, and provider-facing operational tooling." },
  { title: "Stacks Alignment",       verdict: "Very strong",                     body: "The product depends on Stacks-specific primitives: Clarity, sBTC, USDCx, stacks.js tooling, Stacks network identifiers, and Stacks transaction semantics." },
  { title: "User Experience",        verdict: "Good and improving",              body: "Providers get a registration path and dashboard, while agents interact with a single payment-aware endpoint. The next UX frontier is embedded wallets and lower-friction production onboarding." },
  { title: "Impact Potential",       verdict: "Strong",                          body: "This is infrastructure for agentic commerce on Stacks, not just a single end-user app. It can be reused across paid data APIs, inference endpoints, and autonomous tools." },
] as const;

const truthfulStatus = [
  "The repo is Stacks-native end to end: Clarity, stacks.js tooling, sBTC-oriented collateral, and USDCx-oriented payment settlement are all part of the implemented design.",
  "The project now uses direct Postgres and is documented for Vercel plus Railway deployment.",
  "Read-only quote paths use a cached DIA oracle observation on-chain, and the agent SDK can fall back to a live DIA read-only quote when the cache is cold.",
  "The repo now includes an authenticated internal route that can submit refresh-price-cache from a dedicated relayer wallet.",
  "The repo now uses official x402-stacks V2 types and header helpers on the protocol surface, but keeps a custom vault-aware signer because the stock client helper signs direct token transfers rather than borrow-and-pay contract calls.",
  "The end-to-end flow has been confirmed on Stacks mainnet — borrow-and-pay executed and settled on-chain, with sBTC collateral locked, USDCx delivered to the merchant, and a Bitcoin-anchored confirmation recorded on Hiro Explorer.",
] as const;

const sdkExports = [
  { name: "withPaymentInterceptor(config, axiosConfig?)", desc: "Returns an Axios instance with the 402 interceptor attached. Runs simulate-borrow, signs borrow-and-pay with PostConditionMode.Deny, and retries the original request transparently." },
  { name: "mainnetConfig()", desc: "Partial AgentClientConfig for Stacks mainnet (stacks:1). Includes StacksMainnet network object and canonical sBTC and USDCx contract addresses. Spread with your privateKey, agentAddress, and vault contract details." },
  { name: "testnetConfig()", desc: "Same as mainnetConfig() but targeting stacks:2147483648 with the corresponding testnet contract addresses." },
  { name: "AgentClientConfig", desc: "TypeScript interface for the full interceptor configuration — privateKey, agentAddress, network, caip2Network, vault and token contract details, plus optional timeoutMs, maxPaymentRetries, and onEvent callback." },
  { name: "AgentEvent", desc: "Structured event emitted at each stage: REQUEST_SENT · PAYMENT_REQUIRED_RECEIVED · SIMULATE_BORROW_OK · TX_BUILT · TX_SIGNED · PAYMENT_HEADER_ATTACHED · REQUEST_RETRIED · PAYMENT_CONFIRMED · DATA_RETRIEVED · ERROR." },
] as const;

const repoMap = [
  { title: "contracts/lend402-vault-v5.clar",                    body: "The deployed lending and settlement contract." },
  { title: "packages/agent-sdk/src/",                            body: "The standalone npm SDK — interceptor, types, network helpers, and x402 utils." },
  { title: "src/app/api/v/[vault_id]/[[...path]]/route.ts",      body: "The payment gateway, settlement boundary, and origin proxy." },
  { title: "src/app/(app)/vault/*",                               body: "Provider registration and dashboard pages." },
  { title: "database/migrations/*",                               body: "Postgres schema and migration history." },
] as const;

const apiEndpoints = [
  { method: "GET",  path: "/v/{vault_id}/{path}", status: "402 / 200", description: "Payment gateway. Returns 402 challenge without payment-signature; forwards to origin and returns 200 with payment-response header after settlement." },
  { method: "POST", path: "/api/vaults",          status: "201",       description: "Register a new API vault. Requires authenticated wallet signature. Returns vault_id and wrapped gateway URL." },
  { method: "GET",  path: "/api/vaults",          status: "200",       description: "List vaults for the authenticated wallet address. Returns vault metadata and per-vault call counts." },
  { method: "POST", path: "/api/internal/refresh-price-cache", status: "200", description: "Authenticated internal route. Submits a refresh-price-cache transaction to warm the on-chain DIA oracle cache." },
] as const;

// ---------------------------------------------------------------------------
// Sequence diagram — static HTML rendering of the README mermaid diagram
// ---------------------------------------------------------------------------

type MessageType = "req" | "res-402" | "res-200" | "internal" | "note";

interface Message {
  type: MessageType;
  from?: string;
  to?: string;
  label: string;
}

const PARTICIPANTS: Record<string, { label: string; color: string }> = {
  agent:    { label: "Agent",              color: "#22d3ee" },
  gateway:  { label: "Gateway",            color: "#a78bfa" },
  redis:    { label: "Redis",              color: "#f87171" },
  stacks:   { label: "Stacks Mempool",     color: "#4ade80" },
  contract: { label: "lend402-vault.clar", color: "#f59e0b" },
  origin:   { label: "Origin API",         color: "#94a3b8" },
};

const SEQUENCE: Message[] = [
  { type: "req",     from: "agent",   to: "gateway",  label: "GET /v/{vault_id}/path" },
  { type: "internal",from: "gateway", to: "redis",    label: "checkGlobalRateLimit() · checkAndIncrRateLimit(challenge)" },
  { type: "res-402", from: "gateway", to: "agent",    label: "402 Payment Required · payment-required header (x402Version: 2)" },
  { type: "note",    label: "Agent: parse accepts[0] · simulate-borrow (read-only Clarity) · build borrow-and-pay tx · PostConditionMode.Deny · sign with agent key" },
  { type: "req",     from: "agent",   to: "gateway",  label: "GET /v/{vault_id}/path · payment-signature header" },
  { type: "internal",from: "gateway", to: "gateway",  label: "parsePaymentSignatureHeader() · verifyXPayment() · validateBorrowAndPayTransaction()" },
  { type: "internal",from: "gateway", to: "redis",    label: "getSettled(txid) — replay check · checkAndIncrRateLimit(rate)" },
  { type: "req",     from: "gateway", to: "stacks",   label: "broadcastTransaction(signedTx)" },
  { type: "req",     from: "stacks",  to: "contract", label: "borrow-and-pay(amount, merchant, collateral)" },
  { type: "internal",from: "contract",to: "contract", label: "fetch-live-sbtc-price() · 150% collateral ratio check · transfer sBTC in · transfer USDCx out to merchant" },
  { type: "note",    label: "Gateway: poll /extended/v1/tx/{txid} every 2s until tx_status == 'success'" },
  { type: "internal",from: "gateway", to: "redis",    label: "setSettled(txid, { blockHeight, payer })" },
  { type: "req",     from: "gateway", to: "origin",   label: "Forward request (payment headers stripped) + x-lend402-* injected" },
  { type: "res-200", from: "origin",  to: "gateway",  label: "200 OK + response body" },
  { type: "res-200", from: "gateway", to: "agent",    label: "200 OK + payment-response header · { success, txid, blockHeight }" },
];

function SequenceDiagram() {
  return (
    <div id="sequence" className="scroll-mt-24 overflow-x-auto rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 dark:border-slate-800/70">
      <p className="mb-4 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
        Payment Sequence
      </p>
      <div className="flex flex-col gap-2 min-w-[540px]">
        {SEQUENCE.map((msg, i) => {
          if (msg.type === "note") {
            return (
              <div
                key={i}
                className="mx-4 my-1 rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-2.5 font-mono text-[10px] leading-5 text-amber-300/90"
              >
                {msg.label}
              </div>
            );
          }

          const fromP = msg.from ? PARTICIPANTS[msg.from] : null;
          const toP   = msg.to   ? PARTICIPANTS[msg.to]   : null;
          const isSelf = msg.from === msg.to;

          const arrowColor =
            msg.type === "res-402" ? "#f87171"
            : msg.type === "res-200" ? "#4ade80"
            : msg.type === "internal" ? "#64748b"
            : "#94a3b8";

          return (
            <div key={i} className="flex items-start gap-3">
              {/* From badge */}
              <div
                className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[9px] font-black tracking-wide border min-w-[110px] text-center"
                style={{
                  color: fromP?.color ?? "#94a3b8",
                  borderColor: `${fromP?.color ?? "#94a3b8"}40`,
                  background: `${fromP?.color ?? "#94a3b8"}10`,
                }}
              >
                {fromP?.label ?? "—"}
              </div>

              {/* Arrow + label */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px" style={{ background: arrowColor, opacity: 0.5 }} />
                  <span className="shrink-0 font-mono text-[9px]" style={{ color: arrowColor }}>
                    {isSelf ? "↩" : msg.type === "res-402" || msg.type === "res-200" ? "←" : "→"}
                  </span>
                  {!isSelf && (
                    <div className="flex-1 h-px" style={{ background: arrowColor, opacity: 0.5 }} />
                  )}
                </div>
                <p className="mt-0.5 font-mono text-[10px] leading-5 text-slate-400 truncate" title={msg.label}>
                  {msg.label}
                </p>
              </div>

              {/* To badge */}
              {!isSelf && (
                <div
                  className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[9px] font-black tracking-wide border min-w-[110px] text-center"
                  style={{
                    color: toP?.color ?? "#94a3b8",
                    borderColor: `${toP?.color ?? "#94a3b8"}40`,
                    background: `${toP?.color ?? "#94a3b8"}10`,
                  }}
                >
                  {toP?.label ?? "—"}
                </div>
              )}
              {isSelf && <div className="shrink-0 min-w-[110px]" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  id,
  eyebrow,
  title,
  children,
  judging = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
  judging?: boolean;
}) {
  return (
    <section
      id={id}
      className={[
        "scroll-mt-20 rounded-[28px] border p-6 backdrop-blur-xl md:p-7",
        judging
          ? "border-amber-400/30 bg-amber-400/5 dark:bg-amber-400/8"
          : "border-slate-200/80 bg-white/70 dark:border-slate-800/70 dark:bg-slate-900/45",
      ].join(" ")}
    >
      <p
        className={[
          "mb-2 font-mono text-[10px] font-black uppercase tracking-[0.22em]",
          judging ? "text-amber-600 dark:text-amber-400" : "text-cyan-600 dark:text-cyan-400",
        ].join(" ")}
      >
        {eyebrow}
      </p>
      <h2 className="mb-4 max-w-3xl font-mono text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocsPage() {
  return (
    <div
      className="flex flex-col gap-6"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 12% 0%, rgba(14,165,233,0.06) 0%, transparent 52%),
          radial-gradient(ellipse at 88% 100%, rgba(245,158,11,0.05) 0%, transparent 50%)
        `,
      }}
    >
      {/* ── Reader Guide — persistent info card above all sections ── */}
      <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 dark:border-slate-800/70">
        <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">
          Reader Guide
        </p>
        <div className="grid gap-3 sm:grid-cols-3 font-mono text-[11px] leading-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3">
            <p className="mb-1 font-black text-white text-xs">Normal reader</p>
            <p className="text-slate-400">Focus on Overview, How It Works, and Deployment.</p>
          </div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3">
            <p className="mb-1 font-black text-amber-300 text-xs">Judge</p>
            <p className="text-slate-400">Read Stacks Alignment, Security, and Judging Criteria first.</p>
          </div>
          <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-4 py-3">
            <p className="mb-1 font-black text-cyan-300 text-xs">Builder</p>
            <p className="text-slate-400">Inspect API Reference, Deployment, and Truthful Status.</p>
          </div>
        </div>
      </div>

      {/* ── Overview ── */}
      <section
        id="overview"
        className="scroll-mt-20 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/70 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/50 md:p-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_300px]">
          <div className="max-w-3xl">
            <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-400">
              Lend402 Overview
            </p>
            <h1 className="mb-4 font-mono text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-[2.4rem] md:leading-[1.05]">
              The Stacks-native payment and credit rail for agentic APIs.
            </h1>
            <p className="max-w-2xl font-mono text-[13px] leading-7 text-slate-600 dark:text-slate-300">
              Lend402 is the closest thing to Stripe for agentic API calls on Stacks. A provider wraps an
              endpoint behind x402, an agent receives an HTTP 402 challenge, and the request is financed
              and settled on Stacks with sBTC-backed USDCx before the origin response is returned.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["x402 V2", "Clarity", "sBTC", "USDCx", "Railway Postgres", "Railway Redis"].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-slate-200/80 bg-slate-100/80 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* One-sentence pitch card */}
          <div id="pitch" className="scroll-mt-20 rounded-[24px] border border-amber-400/30 bg-amber-400/8 p-5 dark:bg-amber-400/10">
            <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
              One-Sentence Pitch
            </p>
            <p className="font-mono text-[13px] leading-7 text-slate-700 dark:text-slate-200">
              Lend402 lets an AI agent pay for a request the moment it needs it, using Stacks as the
              settlement layer and sBTC-backed credit instead of API keys and monthly billing.
            </p>
            <div className="mt-5 space-y-2 border-t border-amber-500/20 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Quick Links
              </p>
              <Link href="/app" className="block font-mono text-[11px] font-bold text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                Open command center
              </Link>
              <Link href="/vault/new" className="block font-mono text-[11px] font-bold text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                Register a paid API vault
              </Link>
              <Link href="/vault/dashboard" className="block font-mono text-[11px] font-bold text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
                View provider dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-[24px] border border-slate-200/80 bg-white/70 p-5 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/45"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {card.label}
              </p>
              <p className="font-mono text-lg font-black" style={{ color: card.color }}>
                {card.value}
              </p>
              <p className="mt-2 font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <Section id="how-it-works" eyebrow="End-to-End Flow" title="How a paid request moves through the system">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {flowSteps.map((item) => (
            <div
              key={item.step}
              className="rounded-[24px] border border-slate-200/80 bg-white/55 p-5 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/35"
            >
              <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-400">
                {item.step}
              </p>
              <h3 className="mb-2 font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                {item.title}
              </h3>
              <p className="font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Sequence diagram */}
        <div className="mt-6">
          <SequenceDiagram />
        </div>
      </Section>

      {/* ── Stacks Alignment ── */}
      <Section id="stacks-alignment" eyebrow="Stacks Alignment" title="Why this product belongs on Stacks">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4 font-mono text-[12px] leading-7 text-slate-600 dark:text-slate-300">
            <p>
              Lend402 is not a generic API paywall lightly renamed for a Bitcoin hackathon. The
              core value proposition depends on Stacks-specific primitives.
            </p>
            <p>
              The borrow-and-pay path is written in Clarity. The settlement asset path is framed
              around sBTC collateral and USDCx-denominated pricing. The agent and gateway speak
              Stacks network identifiers, build Stacks transactions, and rely on Stacks tooling
              for signing, verification, and broadcast.
            </p>
            <p>
              That means the system is aligned with the exact judging language around Clarity,
              sBTC, USDCx, stacks.js, and broader Stacks dev tooling. The idea is not just that
              the UI mentions those primitives; the runtime flow depends on them.
            </p>
          </div>

          <div id="component-map" className="scroll-mt-20 grid gap-3">
            {stackComponents.map((component) => (
              <div
                key={component.title}
                className="rounded-[22px] border border-slate-200/80 bg-white/60 p-4 dark:border-slate-800/70 dark:bg-slate-900/35"
              >
                <h3 className="mb-1 font-mono text-[12px] font-black text-slate-900 dark:text-slate-100">
                  {component.title}
                </h3>
                <p className="font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                  {component.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Security ── */}
      <Section id="security" eyebrow="Security Model" title="Controls already in the codebase">
        <div className="grid gap-3 md:grid-cols-2">
          {securityPoints.map((point) => (
            <div
              key={point}
              className="rounded-[20px] border border-slate-200/80 bg-white/55 px-4 py-3 font-mono text-[11px] leading-6 text-slate-600 dark:border-slate-800/70 dark:bg-slate-950/30 dark:text-slate-300"
            >
              {point}
            </div>
          ))}
        </div>
      </Section>

      {/* ── Deployment ── */}
      <Section id="deployment" eyebrow="Deployment" title="How the product is currently meant to run">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/55 p-5 dark:border-slate-800/70 dark:bg-slate-950/30">
            <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              Recommended Topology
            </p>
            <div className="space-y-2 font-mono text-[11px] leading-6 text-slate-600 dark:text-slate-300">
              <p>Vercel hosts the Next.js frontend and API routes.</p>
              <p>Railway Postgres stores vault registrations, calls, and dashboard data.</p>
              <p>Railway Redis handles rate limiting, replay protection, and settlement idempotency.</p>
              <p>Stacks mainnet is the intended settlement layer.</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white/55 p-5 dark:border-slate-800/70 dark:bg-slate-950/30">
            <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
              Operational Notes
            </p>
            <div className="space-y-2 font-mono text-[11px] leading-6 text-slate-600 dark:text-slate-300">
              <p>The schema now lives under <span className="font-black">database/migrations</span>.</p>
              <p>Environment variables use <span className="font-black">DATABASE_URL</span> and <span className="font-black">REDIS_URL</span>.</p>
              <p>Railway service references follow the <span className="font-black">${"{ServiceName.VAR_NAME}"}</span> pattern.</p>
              <p>Mainnet is the default stance; testnet is only for explicit validation work.</p>
            </div>
          </div>
        </div>

        <div id="repo-map" className="scroll-mt-20 mt-4 rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 dark:border-slate-800/70">
          <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
            Repository Map
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {repoMap.map((item) => (
              <div key={item.title} className="rounded-[18px] border border-slate-800 bg-slate-900/80 p-4">
                <p className="font-mono text-[11px] font-black text-white">{item.title}</p>
                <p className="mt-1 font-mono text-[10px] leading-6 text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── API Reference ── */}
      <Section id="api-reference" eyebrow="API Reference" title="Gateway and management endpoints">
        <div className="flex flex-col gap-3">
          {apiEndpoints.map((ep) => (
            <div
              key={ep.path}
              className="rounded-[22px] border border-slate-200/80 bg-white/55 p-4 dark:border-slate-800/70 dark:bg-slate-950/30"
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span
                  className={[
                    "font-mono text-[10px] font-black tracking-wider px-2 py-0.5 rounded-md",
                    ep.method === "GET"
                      ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  ].join(" ")}
                >
                  {ep.method}
                </span>
                <code className="font-mono text-[12px] font-bold text-slate-800 dark:text-slate-200">
                  {ep.path}
                </code>
                <span className="font-mono text-[10px] text-slate-400">
                  {ep.status}
                </span>
              </div>
              <p className="font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                {ep.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-white/55 p-5 dark:border-slate-800/70 dark:bg-slate-950/30">
          <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            x402 Headers
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { header: "payment-required",  dir: "← Response", color: "#f87171", desc: "Base64 JSON challenge. Contains x402Version, resource, and accepts[]." },
              { header: "payment-signature", dir: "→ Request",  color: "#22d3ee", desc: "Base64 JSON payment. Contains signed transaction hex and accepted option." },
              { header: "payment-response",  dir: "← Response", color: "#4ade80", desc: "Base64 JSON receipt. Contains txid, blockHeight, payer, and success flag." },
            ].map((h) => (
              <div key={h.header} className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3">
                <code className="font-mono text-[10px] font-black block mb-1" style={{ color: h.color }}>
                  {h.header}
                </code>
                <p className="font-mono text-[9px] text-slate-400 mb-1">{h.dir}</p>
                <p className="font-mono text-[10px] leading-5 text-slate-500 dark:text-slate-400">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Agent SDK ── */}
      <Section id="agent-sdk" eyebrow="Agent SDK" title="npm install @winsznx/lend402">
        <div className="space-y-4 font-mono text-[12px] leading-7 text-slate-600 dark:text-slate-300 mb-5">
          <p>
            The payment interceptor is published as a standalone npm package so any AI agent can
            integrate JIT micro-lending without depending on the full Lend402 repo. Install it,
            spread <code className="text-cyan-600 dark:text-cyan-400">mainnetConfig()</code>, add your private key and vault address, and every
            HTTP 402 your agent hits is automatically financed and retried in a single{" "}
            <code className="text-cyan-600 dark:text-cyan-400">await</code>.
          </p>
          <p>
            On a failed borrow or signing error the interceptor throws — the
            vault&apos;s{" "}
            <code className="text-amber-600 dark:text-amber-400">PostConditionMode.Deny</code> guarantee
            means no funds move. The agent&apos;s treasury is unchanged on any error path.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {sdkExports.map((item) => (
            <div
              key={item.name}
              className="rounded-[22px] border border-slate-200/80 bg-white/55 p-4 dark:border-slate-800/70 dark:bg-slate-950/30"
            >
              <code className="block mb-2 font-mono text-[11px] font-black text-cyan-700 dark:text-cyan-400 break-all">
                {item.name}
              </code>
              <p className="font-mono text-[10px] leading-6 text-slate-500 dark:text-slate-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-[22px] border border-slate-200/80 bg-slate-950 p-4 dark:border-slate-800/70">
          <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
            Install
          </p>
          <code className="font-mono text-[12px] text-slate-300">
            npm install @winsznx/lend402
          </code>
          <div className="mt-3 border-t border-slate-800 pt-3">
            <a
              href="https://www.npmjs.com/package/@winsznx/lend402"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              npmjs.com/package/@winsznx/lend402 →
            </a>
          </div>
        </div>
      </Section>

      {/* ── Judging Criteria ── visually distinct with amber tint */}
      <Section id="judging" eyebrow="Judging Criteria" title="How the current codebase aligns, truthfully" judging>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {judgingCriteria.map((item) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-amber-400/25 bg-white/60 p-5 dark:border-amber-400/20 dark:bg-amber-400/5"
            >
              <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-600 dark:text-amber-500">
                {item.title}
              </p>
              <p className="mb-2 font-mono text-[12px] font-black text-slate-900 dark:text-slate-100">
                {item.verdict}
              </p>
              <p className="font-mono text-[11px] leading-6 text-slate-500 dark:text-slate-400">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Truthful Status ── */}
      <Section id="truthful-status" eyebrow="Truthful Status" title="What is already strong and what still needs work">
        <div className="grid gap-3">
          {truthfulStatus.map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-amber-400/25 bg-amber-400/8 px-5 py-4 font-mono text-[11px] leading-6 text-slate-700 dark:bg-amber-400/10 dark:text-slate-200"
            >
              {item}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
