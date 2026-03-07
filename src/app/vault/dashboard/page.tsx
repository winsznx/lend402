"use client";

// =============================================================================
// src/app/vault/dashboard/page.tsx
// API Vault owner dashboard — shows all registered vaults + call stats
// =============================================================================

import React from "react";
import { AgentProvider, useAgent } from "@/context/AgentContext";
import VaultDashboard from "@/components/VaultDashboard";
import Button from "@/components/ui/Button";
import Link from "next/link";

function VaultDashboardContent() {
  const { state, connectWallet } = useAgent();

  return (
    <div
      className="min-h-screen flex flex-col font-mono
        bg-slate-50 dark:bg-slate-950
        text-slate-900 dark:text-slate-100"
      style={{
        backgroundImage: `
          radial-gradient(ellipse at 15% 0%, rgba(14,165,233,0.05) 0%, transparent 55%),
          radial-gradient(ellipse at 85% 100%, rgba(167,139,250,0.04) 0%, transparent 55%)
        `,
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/60">
        <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-mono text-[11px] font-black tracking-[0.12em] text-amber-500 dark:text-amber-400 hover:text-amber-600 transition-colors">
              LEND402
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="font-mono text-[10px] tracking-widest text-slate-400 dark:text-slate-600 uppercase">
              API Vault Dashboard
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/docs">
              <Button variant="ghost" size="sm">Docs</Button>
            </Link>
            <Link href="/vault/new">
              <Button variant="primary" size="sm">+ New Vault</Button>
            </Link>
            {!state.isConnected && (
              <Button variant="ghost" size="sm" onClick={connectWallet}>
                Connect Wallet
              </Button>
            )}
            {state.isConnected && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                bg-emerald-400/10 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 5px #4ade80" }} />
                <span className="font-mono text-[10px] font-bold text-emerald-400">
                  {state.walletAddress!.slice(0, 6)}…{state.walletAddress!.slice(-4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-lg mx-auto w-full px-4 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-lg font-black tracking-tight text-slate-900 dark:text-slate-100 mb-1.5">
              My API Vaults
            </h1>
            <p className="font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
              Monitor wrapped endpoints, paid call volume, and USDCx earnings from x402 traffic.
            </p>
          </div>
          {!state.isConnected && (
            <Button variant="primary" size="md" onClick={connectWallet}>
              Connect Wallet to View
            </Button>
          )}
        </div>

        <VaultDashboard walletAddress={state.walletAddress} />
      </main>
    </div>
  );
}

export default function VaultDashboardPage() {
  return (
    <AgentProvider>
      <VaultDashboardContent />
    </AgentProvider>
  );
}
