"use client";

import React, { useMemo, useState } from "react";
import { useAgent } from "@/context/AgentContext";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import { buildClientVaultRegistrationMessage } from "@/lib/client-messages";

interface Props {
  walletAddress: string | null;
}

interface RegistrationResult {
  vaultId: string;
  wrappedUrl: string;
  createdAt: string;
}

export default function VaultRegistrationForm({ walletAddress }: Props) {
  const { requestSignature, pushEvent } = useAgent();
  const [originUrl, setOriginUrl] = useState("");
  const [priceUsd, setPriceUsd] = useState("0.500");
  const [rateLimit, setRateLimit] = useState("60");
  const [resourceName, setResourceName] = useState("");
  const [description, setDescription] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const priceUsdcxPreview = useMemo(() => {
    const parsed = Number.parseFloat(priceUsd);
    if (!Number.isFinite(parsed)) return 0;
    return Math.round(parsed * 1_000_000);
  }, [priceUsd]);

  function validate(): boolean {
    const nextErrors: Record<string, string> = {};

    try {
      const parsed = new URL(originUrl);
      if (parsed.protocol !== "https:") {
        nextErrors.originUrl = "Origin URL must use HTTPS";
      }
      if (!parsed.hostname.includes(".")) {
        nextErrors.originUrl = "Origin URL must include a public hostname";
      }
    } catch {
      nextErrors.originUrl = "Origin URL is invalid";
    }

    const price = Number.parseFloat(priceUsd);
    if (!Number.isFinite(price) || price < 0.001 || price > 1000) {
      nextErrors.priceUsd = "Price must be between 0.001 and 1000";
    }

    const rate = Number.parseInt(rateLimit, 10);
    if (!Number.isInteger(rate) || rate < 1 || rate > 1000) {
      nextErrors.rateLimit = "Rate limit must be between 1 and 1000";
    }

    if (!resourceName.trim() || resourceName.length > 64) {
      nextErrors.resourceName = "Resource name is required and must be <= 64 characters";
    }

    if (description.length > 256) {
      nextErrors.description = "Description must be <= 256 characters";
    }

    if (webhookUrl.trim()) {
      try {
        const parsed = new URL(webhookUrl);
        if (parsed.protocol !== "https:") {
          nextErrors.webhookUrl = "Webhook URL must use HTTPS";
        }
      } catch {
        nextErrors.webhookUrl = "Webhook URL is invalid";
      }
    }

    if (!walletAddress) {
      nextErrors.wallet = "Connect your wallet before registering a vault";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setApiError(null);

    if (!validate() || !walletAddress) return;

    setSubmitting(true);

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const message = await buildClientVaultRegistrationMessage(originUrl, timestamp);
      const signed = await requestSignature(message);

      void signed.publicKey;

      const response = await fetch("/api/vault/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originUrl,
          priceUsdcx: priceUsdcxPreview,
          rateLimit: Number.parseInt(rateLimit, 10),
          resourceName: resourceName.trim(),
          description: description.trim() || null,
          webhookUrl: webhookUrl.trim() || null,
          providerAddress: walletAddress,
          signature: signed.signature,
          message,
        }),
      });

      const data = (await response.json()) as RegistrationResult & { error?: string };
      if (!response.ok) {
        setApiError(data.error ?? "Vault registration failed");
        return;
      }

      setResult(data);
      pushEvent({
        type: "VAULT_REGISTERED",
        timestamp: Date.now(),
        data: data as unknown as Record<string, unknown>,
      });
    } catch (error) {
      setApiError((error as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <GlassCard accentColor="#4ade80">
        <div className="px-6 py-6 flex flex-col gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-emerald-500 uppercase mb-1">
              Vault Registered
            </p>
            <p className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
              Wrapped URL
            </p>
          </div>

          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
            <p className="font-mono text-[11px] text-emerald-500 break-all">
              {result.wrappedUrl}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigator.clipboard.writeText(result.wrappedUrl)}
            >
              Copy URL
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.assign("/vault/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-5">
        <div>
          <h2 className="font-mono text-sm font-black text-slate-900 dark:text-slate-100 mb-1">
            Register API Vault
          </h2>
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600 leading-relaxed">
            Register an HTTPS origin, sign with Stacks Connect, and publish a wrapped URL that agents can pay with sBTC-backed x402 requests.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
              Origin URL
            </span>
            <input
              type="url"
              value={originUrl}
              onChange={(e) => setOriginUrl(e.target.value)}
              placeholder="https://api.example.com/prices"
              className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
            />
            {errors.originUrl ? <span className="font-mono text-[10px] text-red-400">{errors.originUrl}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
              Resource Name
            </span>
            <input
              type="text"
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder="Live BTC/USD Price"
              maxLength={64}
              className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
            />
            {errors.resourceName ? <span className="font-mono text-[10px] text-red-400">{errors.resourceName}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
              Price (USD)
            </span>
            <input
              type="number"
              min="0.001"
              max="1000"
              step="0.001"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
            />
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-600">
              {priceUsdcxPreview.toLocaleString()} micro-USDCx
            </span>
            {errors.priceUsd ? <span className="font-mono text-[10px] text-red-400">{errors.priceUsd}</span> : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
              Rate Limit
            </span>
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
              className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
            />
            {errors.rateLimit ? <span className="font-mono text-[10px] text-red-400">{errors.rateLimit}</span> : null}
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={256}
            placeholder="Real-time spot price data from Coinbase"
            className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
          />
          {errors.description ? <span className="font-mono text-[10px] text-red-400">{errors.description}</span> : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] tracking-widest text-slate-400 uppercase">
            Webhook URL (Optional)
          </span>
          <input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://example.com/hooks/lend402"
            className="font-mono text-xs rounded-lg px-3 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60"
          />
          {errors.webhookUrl ? <span className="font-mono text-[10px] text-red-400">{errors.webhookUrl}</span> : null}
        </label>

        {errors.wallet ? <p className="font-mono text-[10px] text-amber-500">{errors.wallet}</p> : null}
        {apiError ? <p className="font-mono text-[10px] text-red-400">{apiError}</p> : null}

        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-600">
            Registration is authenticated with a Stacks wallet signature.
          </p>
          <Button type="submit" variant="primary" size="md" disabled={submitting || !walletAddress}>
            {submitting ? "Signing..." : "Register Vault"}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
}
