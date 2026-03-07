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

const summaryCards = [
  {
    label: "Product",
    value: "x402 Payment + JIT Credit",
    detail: "Paid agent calls wrapped around Stacks-native settlement.",
    color: "#22d3ee",
  },
  {
    label: "Core Assets",
    value: "sBTC + USDCx",
    detail: "sBTC secures the credit path and USDCx handles priced API settlement.",
    color: "#f59e0b",
  },
  {
    label: "Deployment",
    value: "Vercel + Railway",
    detail: "Next.js on Vercel, Postgres and Redis on Railway, settlement on Stacks.",
    color: "#4ade80",
  },
  {
    label: "Target Network",
    value: PUBLIC_STACKS_NETWORK.toUpperCase(),
    detail: `CAIP-2 network id ${PUBLIC_CAIP2_NETWORK}.`,
    color: "#a78bfa",
  },
] as const;

const flowSteps = [
  {
    step: "01",
    title: "Provider registers an API vault",
    body: "The provider submits an origin URL, a per-call USDCx price, rate limits, and optional webhook details. Lend402 stores that vault in Postgres and exposes a wrapped payment-aware endpoint.",
  },
  {
    step: "02",
    title: "Agent hits the wrapped endpoint",
    body: "The gateway returns HTTP 402 with an x402 V2 challenge that specifies the Stacks network, the asset, the price, the payee, and the request resource.",
  },
  {
    step: "03",
    title: "Agent finances and signs the call",
    body: "The agent SDK runs a read-only collateral preview, falls back to a live DIA quote if the vault cache is cold, builds the Clarity borrow-and-pay transaction, attaches strict post-conditions, signs the transaction, and retries with the official x402 payment-signature header.",
  },
  {
    step: "04",
    title: "Gateway validates and settles",
    body: "Lend402 parses the payment payload, guards against replays and rate abuse, broadcasts the signed Stacks transaction, waits for confirmation, and records the call.",
  },
  {
    step: "05",
    title: "Origin response is released",
    body: "Once settlement confirms, the gateway forwards the request to the provider origin and returns the upstream response with an official x402 payment-response receipt header.",
  },
  {
    step: "06",
    title: "Provider dashboard reflects revenue",
    body: "Vault owners can review call counts, wrapped URLs, earnings, and recent payment activity from the dashboard surfaces inside the app.",
  },
] as const;

const stackComponents = [
  {
    title: "Clarity Vault",
    body: `The core contract is ${PUBLIC_VAULT_CONTRACT_ID}. It handles borrow-and-pay, liquidity accounting, collateral checks, cached DIA-backed quote paths, and provider-directed settlement.`,
  },
  {
    title: "Stacks Agent SDK",
    body: "The agent client intercepts 402 responses, computes borrowing requirements, builds the Stacks transaction, signs it, and retries the request with a valid x402 payload.",
  },
  {
    title: "Gateway and Proxy",
    body: "The Next.js gateway is both the x402 boundary and the payment-aware reverse proxy. It enforces payment, persists call metadata, and safely forwards the origin request.",
  },
  {
    title: "Postgres and Redis",
    body: "Postgres stores vaults and settled calls. Redis is used for rate limiting, replay protection, and settlement idempotency where low-latency lookups matter.",
  },
  {
    title: "Cache Warmer Route",
    body: "An authenticated internal route can submit refresh-price-cache on-chain from a dedicated relayer wallet so the contract's cached DIA quote stays warm for read-only paths.",
  },
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
  {
    title: "Innovation",
    verdict: "Strong",
    body: "The differentiator is not only x402 paywalls. Lend402 adds just-in-time credit, so an agent does not need to pre-hold the full payment asset for every call.",
  },
  {
    title: "Technical Implementation",
    verdict: "Strong, with remaining hardening work",
    body: "The flow spans Clarity, signed Stacks transactions, typed x402 payloads, DIA-backed pricing, settlement polling, Postgres persistence, Redis controls, and provider-facing operational tooling.",
  },
  {
    title: "Stacks Alignment",
    verdict: "Very strong",
    body: "The product depends on Stacks-specific primitives: Clarity, sBTC, USDCx, stacks.js tooling, Stacks network identifiers, and Stacks transaction semantics.",
  },
  {
    title: "User Experience",
    verdict: "Good and improving",
    body: "Providers get a registration path and dashboard, while agents interact with a single payment-aware endpoint. The next UX frontier is embedded wallets and lower-friction production onboarding.",
  },
  {
    title: "Impact Potential",
    verdict: "Strong",
    body: "This is infrastructure for agentic commerce on Stacks, not just a single end-user app. It can be reused across paid data APIs, inference endpoints, and autonomous tools.",
  },
] as const;

const truthfulStatus = [
  "The repo is Stacks-native end to end: Clarity, stacks.js tooling, sBTC-oriented collateral, and USDCx-oriented payment settlement are all part of the implemented design.",
  "The project now uses direct Postgres and is documented for Vercel plus Railway deployment.",
  "Read-only quote paths use a cached DIA oracle observation on-chain, and the agent SDK can fall back to a live DIA read-only quote when the cache is cold.",
  "The repo now includes an authenticated internal route that can submit refresh-price-cache from a dedicated relayer wallet.",
  "The repo now uses official x402-stacks V2 types and header helpers on the protocol surface, but keeps a custom vault-aware signer because the stock client helper signs direct token transfers rather than borrow-and-pay contract calls.",
  "Mainnet is the target, but live mainnet smoke tests and Clarinet mainnet execution simulation still need to be completed before calling the system fully production-verified.",
] as const;

const repoMap = [
  {
    title: "contracts/lend402-vault.clar",
    body: "The lending and settlement contract.",
  },
  {
    title: "server/agent-client.ts",
    body: "The Stacks payment client used by the agent path.",
  },
  {
    title: "src/app/api/v/[vault_id]/[...path]/route.ts",
    body: "The payment gateway, settlement boundary, and origin proxy.",
  },
  {
    title: "src/app/vault/*",
    body: "Provider registration and dashboard pages.",
  },
  {
    title: "database/migrations/*",
    body: "Postgres schema and migration history.",
  },
] as const;

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[28px] border border-slate-200/80 bg-white/70 p-6 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/45 md:p-7">
      <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400">
        {eyebrow}
      </p>
      <h2 className="mb-4 max-w-3xl font-mono text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <main
      className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 12% 0%, rgba(14,165,233,0.08) 0%, transparent 52%),
          radial-gradient(ellipse at 88% 100%, rgba(245,158,11,0.07) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 40%, rgba(167,139,250,0.05) 0%, transparent 58%)
        `,
      }}
    >
      <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/85">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="font-mono text-[11px] font-black tracking-[0.12em] text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            >
              LEND402
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
              Project Documentation
            </span>
          </div>

          <div className="hidden items-center gap-1 md:flex">
            <Link href="/vault/new" className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              Register API
            </Link>
            <Link href="/vault/dashboard" className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200">
              My Vaults
            </Link>
            <a
              href="https://docs.stacks.co"
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Stacks Docs
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-screen-xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/70 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-900/50 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_320px]">
            <div className="max-w-3xl">
              <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-400">
                Lend402 Overview
              </p>
              <h1 className="mb-4 font-mono text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-[2.4rem] md:leading-[1.05]">
                The Stacks-native payment and credit rail for agentic APIs.
              </h1>
              <p className="max-w-2xl font-mono text-[13px] leading-7 text-slate-600 dark:text-slate-300">
                The shortest serious framing is this: Lend402 is the closest thing to Stripe for
                agentic API calls on Stacks. A provider wraps an endpoint behind x402, an agent
                receives an HTTP 402 challenge, and the request can be financed and settled on
                Stacks with sBTC-backed USDCx before the origin response is returned.
              </p>
              <p className="mt-4 max-w-2xl font-mono text-[12px] leading-7 text-slate-500 dark:text-slate-400">
                The project is designed for readers with very different goals: normal users trying
                to understand the product, technical judges auditing Stacks alignment, and builders
                who want to inspect the architecture and deployment model.
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

            <div className="rounded-[24px] border border-amber-400/30 bg-amber-400/8 p-5 dark:bg-amber-400/10">
              <p className="mb-2 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                One-Sentence Pitch
              </p>
              <p className="font-mono text-[13px] leading-7 text-slate-700 dark:text-slate-200">
                Lend402 lets an AI agent pay for a request the moment it needs it, using Stacks as
                the settlement layer and sBTC-backed credit instead of API keys and monthly billing.
              </p>

              <div className="mt-5 space-y-2 border-t border-amber-500/20 pt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Quick Links
                </p>
                <Link href="/" className="block font-mono text-[11px] font-bold text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200">
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
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Summary", "#summary"],
            ["Flow", "#flow"],
            ["Stacks Fit", "#stacks-fit"],
            ["Deployment", "#deployment"],
            ["Judging", "#judging"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              className="rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 transition-colors hover:border-cyan-400/40 hover:text-slate-900 dark:border-slate-800/70 dark:bg-slate-900/35 dark:text-slate-400 dark:hover:border-cyan-400/40 dark:hover:text-slate-100"
            >
              {label}
            </a>
          ))}
        </div>

        <Section id="summary" eyebrow="Executive Summary" title="What Lend402 is actually building">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4 font-mono text-[12px] leading-7 text-slate-600 dark:text-slate-300">
              <p>
                Lend402 is infrastructure for agentic commerce. It lets a provider monetize an API
                using x402, and it gives the calling agent a way to settle that request on Stacks
                without depending on API keys, invoices, or traditional billing middleware.
              </p>
              <p>
                The system is more than a paywall. Its distinguishing feature is the credit layer:
                an agent can hold sBTC as treasury collateral and borrow exactly the USDCx needed
                for the call at execution time. That means capital does not need to sit pre-funded
                in every asset for every endpoint.
              </p>
              <p>
                The current product includes a command center for the agent experience, a provider
                vault registration flow, a provider dashboard, a Clarity settlement contract, a
                Stacks-native gateway, and a Railway-friendly operational backend.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 dark:border-slate-800/70">
              <p className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400">
                Reader Guide
              </p>
              <div className="space-y-3 font-mono text-[11px] leading-6 text-slate-300">
                <p>
                  <span className="font-black text-white">Normal reader:</span> focus on the summary,
                  flow, and deployment sections.
                </p>
                <p>
                  <span className="font-black text-white">Judge:</span> read the Stacks fit, security,
                  and judging sections first.
                </p>
                <p>
                  <span className="font-black text-white">Builder:</span> inspect the component map,
                  deployment model, and truthful status notes.
                </p>
              </div>
            </div>
          </div>
        </Section>

        <Section id="flow" eyebrow="End-to-End Flow" title="How a paid request moves through the system">
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
        </Section>

        <Section id="stacks-fit" eyebrow="Stacks Alignment" title="Why this product belongs on Stacks">
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

            <div className="grid gap-3">
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

          <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-slate-950 p-5 dark:border-slate-800/70">
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

        <Section id="judging" eyebrow="Judging Criteria" title="How the current codebase aligns, truthfully">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {judgingCriteria.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-slate-200/80 bg-white/60 p-5 dark:border-slate-800/70 dark:bg-slate-900/35"
              >
                <p className="mb-1 font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
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

        <Section id="status" eyebrow="Truthful Status" title="What is already strong and what still needs work">
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
    </main>
  );
}
