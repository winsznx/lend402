"use client";

// =============================================================================
// src/app/vault/new/page.tsx
// Register a new API Vault page
// =============================================================================

import React from "react";
import { AgentProvider, useAgent } from "@/context/AgentContext";
import VaultRegistrationForm from "@/components/VaultRegistrationForm";
import Button from "@/components/ui/Button";
import Link from "next/link";

function NewVaultContent() {
  const { state, connectWallet } = useAgent();

  return (
    <div
      className="min-h-screen flex flex-col font-mono
        bg-slate-50 dark:bg-slate-950
        text-slate-900 dark:text-slate-100"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 20% 10%, rgba(14,165,233,0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, rgba(167,139,250,0.05) 0%, transparent 50%)
        `,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-screen-md mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-[11px] font-black tracking-[0.12em] text-amber-500 dark:text-amber-400 hover:text-amber-600 transition-colors">
              LEND402
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-[10px] tracking-widest text-slate-400 dark:text-slate-600 uppercase">
              API Vault
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-[10px] tracking-widest text-slate-500 dark:text-slate-500 uppercase">
              Register
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/docs">
              <Button variant="ghost" size="sm">Docs</Button>
            </Link>
            <Link href="/vault/dashboard">
              <Button variant="ghost" size="sm">My Vaults</Button>
            </Link>
            {!state.isConnected && (
              <Button variant="primary" size="sm" onClick={connectWallet}>
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-md mx-auto w-full px-4 py-8 flex flex-col gap-6">
        {/* Page title */}
        <div>
          <h1 className="font-mono text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1.5">
            Register API Vault
          </h1>
          <p className="font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
            Point Lend402 at any HTTPS API. Agents call the wrapped endpoint with x402 and Lend402
            handles the Stacks-side payment path: sBTC collateral, USDCx borrow, settlement, and
            payout to the provider.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: "01", label: "Register", desc: "Enter your API URL and price per call" },
            { step: "02", label: "Share", desc: "Give agents your vault gateway URL" },
            { step: "03", label: "Earn", desc: "Get paid in USDCx per API call" },
          ].map((s) => (
            <div key={s.step} className="rounded-xl border border-slate-200/80 dark:border-slate-800/60 px-4 py-3.5 bg-white/40 dark:bg-slate-900/30">
              <p className="font-mono text-[9px] tracking-widest text-slate-400 dark:text-slate-600 uppercase mb-1">{s.step}</p>
              <p className="font-mono text-xs font-black text-slate-800 dark:text-slate-200 mb-0.5">{s.label}</p>
              <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Registration form */}
        <VaultRegistrationForm walletAddress={state.walletAddress} />
      </main>
    </div>
  );
}

export default function NewVaultPage() {
  return (
    <AgentProvider>
      <NewVaultContent />
    </AgentProvider>
  );
}
