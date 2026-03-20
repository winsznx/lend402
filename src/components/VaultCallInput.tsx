"use client";

import React, { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { PUBLIC_GATEWAY_BASE_URL } from "@/lib/public-config";

interface Props {
  onTrigger?: (targetUrl: string) => void;
}

function resolveVaultUrl(input: string, path: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const normalizedPath = path.trim()
    ? path.trim().startsWith("/")
      ? path.trim()
      : `/${path.trim()}`
    : "/";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return `${trimmed.replace(/\/+$/, "")}${normalizedPath === "/" ? "/" : normalizedPath}`;
  }

  const base = PUBLIC_GATEWAY_BASE_URL || window.location.origin;
  return `${base}/v/${trimmed.replace(/^\/+|\/+$/g, "")}${normalizedPath}`;
}

export default function VaultCallInput({ onTrigger }: Props) {
  const [vaultIdOrUrl, setVaultIdOrUrl] = useState("");
  const [pathSuffix, setPathSuffix] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const resolved = resolveVaultUrl(vaultIdOrUrl, pathSuffix);
    if (!resolved) {
      setError("Enter a vault ID or wrapped URL");
      return;
    }

    try {
      new URL(resolved);
    } catch {
      setError("Resolved vault URL is invalid");
      return;
    }

    onTrigger?.(resolved);
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="px-4 py-4 flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_240px_auto] gap-2">
          <input
            type="text"
            value={vaultIdOrUrl}
            onChange={(e) => setVaultIdOrUrl(e.target.value)}
            placeholder="vault_id or https://gateway.../v/{id}/"
            className="font-mono text-[11px] rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
          />
          <input
            type="text"
            value={pathSuffix}
            onChange={(e) => setPathSuffix(e.target.value)}
            placeholder="/prices/BTC-USD/spot"
            className="font-mono text-[11px] rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
          />
          <Button type="submit" variant="ghost" size="sm">
            Set Target
          </Button>
        </div>
        {error ? <p className="font-mono text-[10px] text-red-400">{error}</p> : null}
        <p className="font-mono text-[9px] text-slate-500 dark:text-slate-600">
          Use a provider vault URL to test the end-to-end payment flow through the public gateway path.
        </p>
      </form>
    </GlassCard>
  );
}
