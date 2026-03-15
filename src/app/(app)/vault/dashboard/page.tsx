"use client";

// =============================================================================
// src/app/(app)/vault/dashboard/page.tsx
// API Vault owner dashboard — shows all registered vaults + call stats
// =============================================================================

import React from "react";
import { useAgent } from "@/context/AgentContext";
import VaultDashboard from "@/components/VaultDashboard";
import Button from "@/components/ui/Button";

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
  return <VaultDashboardContent />;
}
