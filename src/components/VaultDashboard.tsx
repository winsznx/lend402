"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@/context/AgentContext";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { buildClientDashboardAccessMessage } from "@/lib/client-messages";

interface DashboardCall {
  callId: string;
  settledAt: string;
  payerAddress: string;
  txid: string;
  txidDisplay: string;
  explorerUrl: string;
  amountUsdcx: number;
  originStatus: number | null;
  status: "success" | "origin_error";
}

interface VaultEntry {
  vaultId: string;
  providerAddress: string;
  resourceName: string;
  description: string | null;
  wrappedUrl: string;
  priceUsdcx: number;
  rateLimit: number;
  totalCalls: number;
  totalEarnedUsdcx: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  recentCalls: DashboardCall[];
}

interface Props {
  walletAddress: string | null;
}

const STORAGE_KEY = "lend402-dashboard-auth";

function formatUsdcx(amount: number): string {
  return (amount / 1_000_000).toFixed(3);
}

export default function VaultDashboard({ walletAddress }: Props) {
  const { requestSignature, pushEvent } = useAgent();
  const [vaults, setVaults] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const knownCallIds = useRef<Set<string>>(new Set());

  const totalRevenue = useMemo(
    () => vaults.reduce((sum, vault) => sum + vault.totalEarnedUsdcx, 0),
    [vaults]
  );

  const getAuthHeaders = useCallback(async () => {
    if (!walletAddress) {
      throw new Error("Connect a wallet to access the dashboard");
    }

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          address: string;
          signature: string;
          message: string;
          timestamp: number;
        };

        if (
          parsed.address === walletAddress &&
          Date.now() - parsed.timestamp < 60 * 60 * 1000
        ) {
          return {
            "x-wallet-address": parsed.address,
            "x-wallet-signature": parsed.signature,
            "x-wallet-message": parsed.message,
          };
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const message = buildClientDashboardAccessMessage(walletAddress, timestamp);
    const signature = await requestSignature(message);
    const payload = {
      address: walletAddress,
      signature: signature.signature,
      message,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return {
      "x-wallet-address": walletAddress,
      "x-wallet-signature": signature.signature,
      "x-wallet-message": message,
    };
  }, [requestSignature, walletAddress]);

  const fetchVaults = useCallback(async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch("/api/vault/dashboard", { headers });
      const data = (await response.json()) as {
        vaults?: VaultEntry[];
        error?: string;
      };

      if (!response.ok) {
        setError(data.error ?? "Failed to load dashboard");
        return;
      }

      const nextVaults = data.vaults ?? [];
      for (const vault of nextVaults) {
        for (const call of vault.recentCalls) {
          if (!knownCallIds.current.has(call.callId)) {
            knownCallIds.current.add(call.callId);
            if (vaults.length > 0) {
              pushEvent({
                type: "VAULT_CALL_RECEIVED",
                timestamp: Date.now(),
                data: {
                  vaultId: vault.vaultId,
                  payer: call.payerAddress,
                  txid: call.txid,
                  amountUsdcx: call.amountUsdcx,
                },
              });
            }
          }
        }
      }

      setVaults(nextVaults);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, pushEvent, vaults.length, walletAddress]);

  useEffect(() => {
    void fetchVaults();
  }, [fetchVaults]);

  useEffect(() => {
    if (!walletAddress) return;
    const id = window.setInterval(() => {
      void fetchVaults();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [fetchVaults, walletAddress]);

  if (!walletAddress) {
    return (
      <GlassCard>
        <div className="px-6 py-8 text-center">
          <p className="font-mono text-xs text-slate-500">
            Connect a Stacks wallet to view your vaults.
          </p>
        </div>
      </GlassCard>
    );
  }

  if (loading && vaults.length === 0) {
    return (
      <GlassCard>
        <div className="px-6 py-8 text-center">
          <p className="font-mono text-xs text-slate-500">Loading vault dashboard...</p>
        </div>
      </GlassCard>
    );
  }

  if (error) {
    return (
      <GlassCard accentColor="#f87171">
        <div className="px-6 py-6 flex flex-col gap-3">
          <p className="font-mono text-xs text-red-400">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => void fetchVaults()}>
            Retry
          </Button>
        </div>
      </GlassCard>
    );
  }

  if (vaults.length === 0) {
    return (
      <GlassCard>
        <div className="px-6 py-8 text-center">
          <p className="font-mono text-xs text-slate-500">No vaults registered yet.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassCard>
        <div className="px-6 py-4 grid grid-cols-3 gap-4">
          <div>
            <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Vaults</p>
            <p className="font-mono text-base font-black text-cyan-500">{vaults.length}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Total Calls</p>
            <p className="font-mono text-base font-black text-violet-500">
              {vaults.reduce((sum, vault) => sum + vault.totalCalls, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Revenue</p>
            <p className="font-mono text-base font-black text-emerald-500">
              {formatUsdcx(totalRevenue)} USDCx
            </p>
          </div>
        </div>
      </GlassCard>

      {vaults.map((vault) => (
        <GlassCard key={vault.vaultId}>
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                  {vault.resourceName}
                </p>
                <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600 mt-1">
                  {vault.description ?? "No description provided"}
                </p>
              </div>
              <Chip
                label="STATUS"
                value={vault.isActive ? "ACTIVE" : "PAUSED"}
                color={vault.isActive ? "#4ade80" : "#f87171"}
                live={vault.isActive}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Price</p>
                <p className="font-mono text-sm font-black text-amber-500">
                  {formatUsdcx(vault.priceUsdcx)} USDCx
                </p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Rate Limit</p>
                <p className="font-mono text-sm font-black text-cyan-500">{vault.rateLimit}/min</p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Calls</p>
                <p className="font-mono text-sm font-black text-violet-500">{vault.totalCalls}</p>
              </div>
              <div>
                <p className="font-mono text-[9px] tracking-widest text-slate-400 uppercase mb-1">Earned</p>
                <p className="font-mono text-sm font-black text-emerald-500">
                  {formatUsdcx(vault.totalEarnedUsdcx)} USDCx
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-3 bg-slate-100/60 dark:bg-slate-800/30">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-slate-500 shrink-0">WRAPPED URL</span>
                <span className="font-mono text-[11px] text-cyan-500 truncate flex-1">
                  {vault.wrappedUrl}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(vault.wrappedUrl);
                    setCopied(vault.vaultId);
                    window.setTimeout(() => setCopied(null), 1500);
                  }}
                >
                  {copied === vault.vaultId ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            {vault.recentCalls.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
                  Recent Calls
                </p>
                {vault.recentCalls.map((call) => (
                  <a
                    key={call.callId}
                    href={call.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 bg-white/40 dark:bg-slate-900/20"
                  >
                    <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {new Date(call.settledAt).toLocaleString()} · {call.txidDisplay}
                    </p>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600 mt-1">
                      {call.payerAddress.slice(0, 8)}... · +{formatUsdcx(call.amountUsdcx)} USDCx · {call.status}
                    </p>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
