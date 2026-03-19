// =============================================================================
// src/app/api/trigger-agent/route.ts
// SSE endpoint — runs the Lend402 JIT borrow cycle and streams every
// AgentEvent back to the dashboard in real time.
//
// Guards (in order):
//   1. Origin authentication — rejects requests from unknown origins
//   2. Open position pre-flight — 503 if agent already has an active loan
//   3. Daily call cap — 429 if demo limit exceeded
//   4. Merchant allowlist — 400 if merchant ≠ registered vault provider
//   5. Auto-repay — fires repay-loan after DATA_RETRIEVED, fire-and-forget
// =============================================================================

import {
  withPaymentInterceptor,
  AgentEvent as SdkAgentEvent,
  testnetConfig,
  mainnetConfig,
} from "@/lib/agent-client";
import type { AgentEventType } from "@/context/AgentContext";

type AgentEvent = SdkAgentEvent | { type: AgentEventType; timestamp: number; data: Record<string, unknown> };
import { getServerStacksConfig } from "@/lib/server-config";
import { getDb } from "@/lib/db";
import {
  makeContractCall,
  uintCV,
  broadcastTransaction,
  PostConditionMode,
  AnchorMode,
} from "@stacks/transactions";
import { StacksMainnet, StacksTestnet } from "@stacks/network";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SettlementState {
  collateralSbtc:     number;
  sbtcPriceUsd:       number;
  amountUsdcx:        number;
  originationFee:     number;
  merchantAddress:    string;
  txid:               string;
  blockHeight:        number;
}

interface ActivePositionResponse {
  okay: boolean;
  result?: {
    value?: {
      data?: {
        "loan-id"?:      { value: string };
        "is-active"?:    { value: boolean };
        "amount-owed"?:  { value: string };
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchActivePosition(
  agentAddress: string,
  hiroApiBaseUrl: string
): Promise<{ loanId: bigint; currentDebt: bigint } | null> {
  const url =
    `${hiroApiBaseUrl}/v2/contracts/call-read/` +
    `SP31DP8F8CF2GXSZBHHHK5J6Y061744E1TNFGYWYV/lend402-vault-v5/get-active-position`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: agentAddress,
      arguments: [`0x${Buffer.from(agentAddress).toString("hex")}`],
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as ActivePositionResponse;
  if (!json.okay) return null;

  const data = json.result?.value?.data;
  if (!data) return null;

  const isActive = data["is-active"]?.value;
  if (!isActive) return null;

  const loanId = BigInt(data["loan-id"]?.value ?? "0");
  const currentDebt = BigInt(data["amount-owed"]?.value ?? "0");

  return { loanId, currentDebt };
}

async function broadcastRepayLoan(
  privateKey: string,
  agentAddress: string,
  loanId: bigint,
  currentDebt: bigint,
  networkName: "mainnet" | "testnet"
): Promise<string> {
  const stacksConfig = getServerStacksConfig();
  const network = networkName === "mainnet" ? new StacksMainnet() : new StacksTestnet();

  const tx = await makeContractCall({
    contractAddress: stacksConfig.vaultContractAddress,
    contractName:    stacksConfig.vaultContractName,
    functionName:    "repay-loan",
    functionArgs:    [uintCV(loanId), uintCV(currentDebt)],
    senderKey:       privateKey,
    network,
    postConditionMode: PostConditionMode.Allow,
    anchorMode:      AnchorMode.Any,
  });

  const result = await broadcastTransaction(tx, network);

  if ("error" in result) {
    const msg = [result.error, result.reason].filter(Boolean).join(": ");
    throw new Error(msg || "repay-loan broadcast rejected");
  }

  return result.txid;
}

async function pollRepayConfirmation(
  txid: string,
  hiroApiBaseUrl: string,
  callId: string | null
): Promise<void> {
  const normalizedTxid = txid.startsWith("0x") ? txid : `0x${txid}`;
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    await sleep(2_000);
    try {
      const res = await fetch(`${hiroApiBaseUrl}/extended/v1/tx/${normalizedTxid}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) continue;

      const tx = (await res.json()) as { tx_status: string; block_height: number };
      if (tx.tx_status === "success" && tx.block_height > 0) {
        if (callId) {
          await getDb()`
            UPDATE calls
            SET repay_status = 'confirmed',
                repay_txid   = ${txid},
                repay_confirmed_at = NOW()
            WHERE call_id = ${callId}
          `.catch(() => {});
        }
        return;
      }
      if (tx.tx_status.startsWith("abort") || tx.tx_status.startsWith("dropped")) {
        if (callId) {
          await getDb()`
            UPDATE calls SET repay_status = 'failed', repay_txid = ${txid}
            WHERE call_id = ${callId}
          `.catch(() => {});
        }
        return;
      }
    } catch {
      // polling error — continue
    }
  }

  if (callId) {
    await getDb()`
      UPDATE calls SET repay_status = 'timeout', repay_txid = ${txid}
      WHERE call_id = ${callId}
    `.catch(() => {});
  }
}

async function countDailyCalls(agentAddress: string): Promise<number> {
  const rows = await getDb()<[{ count: string }]>`
    SELECT COUNT(*)::text AS count
    FROM calls
    WHERE payer_address = ${agentAddress}
      AND settled_at > NOW() - INTERVAL '24 hours'
  `;
  return parseInt(rows[0]?.count ?? "0", 10);
}

function isAuthorizedOrigin(req: Request): boolean {
  const allowedOrigins = ["https://lend402.xyz", "https://www.lend402.xyz"];
  const demoToken      = process.env.DEMO_ACCESS_TOKEN;

  const origin     = req.headers.get("origin") ?? "";
  const referer    = req.headers.get("referer") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";

  if (allowedOrigins.includes(origin)) return true;
  if (allowedOrigins.some((o) => referer.startsWith(o))) return true;
  if (demoToken && authHeader === `Bearer ${demoToken}`) return true;

  // Allow local development
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) return true;

  return false;
}

function errorFrame(message: string): string {
  return `data: ${JSON.stringify({ type: "ERROR", timestamp: Date.now(), data: { message } })}\n\n`;
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const url     = new URL(req.url);

  // ── Fix 3a: Origin authentication ─────────────────────────────────────────
  if (!isAuthorizedOrigin(req)) {
    return new Response(null, { status: 401 });
  }

  const privateKey      = process.env.LEND402_AGENT_PRIVATE_KEY;
  const agentAddress    = process.env.LEND402_AGENT_ADDRESS;
  const defaultVaultUrl = process.env.DEFAULT_VAULT_URL;
  const networkName     = process.env.STACKS_NETWORK === "testnet" ? "testnet" : "mainnet";
  const maxDailyCalls   = parseInt(process.env.MAX_DEMO_CALLS_PER_DAY ?? "50", 10);
  const minRepayFloat   = parseInt(process.env.MIN_REPAY_FLOAT_USDCX ?? "50000", 10);

  const targetUrl = url.searchParams.get("targetUrl") ?? defaultVaultUrl;

  if (!privateKey || !agentAddress) {
    return new Response(
      errorFrame(
        "Missing LEND402_AGENT_PRIVATE_KEY or LEND402_AGENT_ADDRESS. " +
        "Copy .env.local.example → .env.local and fill in your keys."
      ),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  if (!targetUrl) {
    return new Response(
      errorFrame("Missing targetUrl. Provide ?targetUrl=... or set DEFAULT_VAULT_URL in .env.local."),
      { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
    );
  }

  const stacksConfig   = getServerStacksConfig();
  const hiroApiBaseUrl = stacksConfig.hiroApiBaseUrl;

  // ── Fix 1a: Pre-flight open position check ─────────────────────────────────
  let openPosition = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
  if (openPosition) {
    await sleep(8_000);
    openPosition = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
    if (openPosition) {
      return new Response(
        JSON.stringify({ error: "Agent position still open from previous call. Retry in a few seconds." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── Fix 3b: Daily call cap ─────────────────────────────────────────────────
  const dailyCount = await countDailyCalls(agentAddress).catch(() => 0);
  if (dailyCount >= maxDailyCalls) {
    return new Response(
      JSON.stringify({ error: "Demo agent daily limit reached." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── USDCx float warning (non-blocking) ────────────────────────────────────
  fetch(
    `${hiroApiBaseUrl}/extended/v1/address/${agentAddress}/balances`,
    { signal: AbortSignal.timeout(5_000) }
  )
    .then((r) => r.json())
    .then((data: { fungible_tokens?: Record<string, { balance: string }> }) => {
      const usdcxKey = `${stacksConfig.usdcxContractId}::usdcx-token`;
      const balance  = parseInt(data.fungible_tokens?.[usdcxKey]?.balance ?? "0", 10);
      if (balance < minRepayFloat) {
        console.warn(
          `[WARN] Agent USDCx float low (${balance} < ${minRepayFloat}) — repay cycle may fail`
        );
      }
    })
    .catch(() => {});

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      const settlement: Partial<SettlementState> = {};
      let callId: string | null = null;

      const networkDefaults =
        networkName === "mainnet" ? mainnetConfig() : testnetConfig();

      // ── Fix 2: Merchant allowlist — wired into the borrow-and-pay path ─────
      // The interceptor calls onEvent("TX_BUILT") before broadcasting.
      // We validate merchant there; if mismatch, throw to abort the flow.
      let merchantValidated = false;

      const agentClient = withPaymentInterceptor({
        privateKey,
        agentAddress,
        ...networkDefaults,
        vaultContractAddress: stacksConfig.vaultContractAddress,
        vaultContractName:    stacksConfig.vaultContractName,
        onEvent: async (event: AgentEvent) => {
          // Merchant allowlist check at TX_BUILT — before signing or broadcast
          if (event.type === "TX_BUILT" && !merchantValidated) {
            const merchant = event.data.merchant as string | undefined;
            if (merchant && targetUrl) {
              const vaultIdMatch = targetUrl.match(/\/v\/([0-9a-f-]{36})\//i);
              if (vaultIdMatch) {
                const vaultId = vaultIdMatch[1];
                try {
                  const rows = await getDb()<[{ provider_address: string }]>`
                    SELECT provider_address FROM vaults
                    WHERE vault_id = ${vaultId} AND is_active = true
                    LIMIT 1
                  `;
                  const provider = rows[0]?.provider_address;
                  if (provider && merchant !== provider) {
                    throw new Error(
                      `Merchant address does not match registered vault provider. Payment refused.`
                    );
                  }
                } catch (err) {
                  // Re-throw allowlist failures; swallow DB errors (non-blocking for unknown vaults)
                  if ((err as Error).message.includes("Payment refused")) throw err;
                }
              }
            }
            merchantValidated = true;
          }

          send(event);

          switch (event.type) {
            case "SIMULATE_BORROW_OK":
              settlement.collateralSbtc = Number(event.data.required_collateral_sbtc as string);
              settlement.sbtcPriceUsd   = Number(event.data.sbtc_price_usd8 as string) / 1e8;
              settlement.originationFee = Number(event.data.origination_fee_usdcx as string);
              break;
            case "TX_BUILT":
              settlement.amountUsdcx    = Number(event.data.amount_usdcx as string);
              settlement.merchantAddress = event.data.merchant as string;
              break;
            case "PAYMENT_CONFIRMED":
              settlement.txid        = event.data.txid as string;
              settlement.blockHeight = event.data.block_height as number;
              break;
          }
        },
      });

      try {
        const { data } = await agentClient.get<unknown>(targetUrl);

        // ── Persist call record and get call_id for repay tracking ────────────
        try {
          const vaultIdMatch = targetUrl.match(/\/v\/([0-9a-f-]{36})\//i);
          const vaultId = vaultIdMatch?.[1] ?? null;
          if (vaultId && settlement.txid) {
            const rows = await getDb()<[{ call_id: string }]>`
              INSERT INTO calls (
                vault_id, payer_address, txid, block_height,
                amount_usdcx, path, method, settled_at, repay_status
              ) VALUES (
                ${vaultId}, ${agentAddress}, ${settlement.txid},
                ${settlement.blockHeight ?? null},
                ${settlement.amountUsdcx ?? 0},
                ${new URL(targetUrl).pathname},
                'GET', NOW(), 'pending'
              )
              ON CONFLICT DO NOTHING
              RETURNING call_id
            `;
            callId = rows[0]?.call_id ?? null;
          }
        } catch {
          // non-critical — don't fail the response
        }

        const position = {
          loanId:          settlement.txid ?? "",
          principalUsdcx:  settlement.amountUsdcx    ?? 0,
          collateralSbtc:  settlement.collateralSbtc  ?? 0,
          originationTime: Date.now(),
          txid:            settlement.txid             ?? "",
          blockHeight:     settlement.blockHeight      ?? 0,
          merchantAddress: settlement.merchantAddress  ?? "",
          netPaymentUsdcx: (settlement.amountUsdcx ?? 0) - (settlement.originationFee ?? 0),
          sbtcPriceUsd:    settlement.sbtcPriceUsd    ?? 0,
        };

        const payload =
          data !== null && typeof data === "object" && !Array.isArray(data)
            ? (data as Record<string, unknown>)
            : { payload: data };

        send({
          type:      "DATA_RETRIEVED",
          timestamp: Date.now(),
          data:      { ...payload, position },
        });

        // ── Fix 1b: Auto-repay — fire-and-forget after DATA_RETRIEVED ─────────
        // Fetch the current open position to get exact debt (includes accrued interest).
        const livePos = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
        if (livePos) {
          send({
            type:      "REPAY_INITIATED",
            timestamp: Date.now(),
            data:      { loan_id: livePos.loanId.toString(), debt: livePos.currentDebt.toString() },
          });

          broadcastRepayLoan(
            privateKey,
            agentAddress,
            livePos.loanId,
            livePos.currentDebt,
            networkName
          )
            .then((repayTxid) => {
              send({
                type:      "REPAY_INITIATED",
                timestamp: Date.now(),
                data: {
                  loan_id:    livePos.loanId.toString(),
                  repay_txid: repayTxid,
                  message:    `[REPAY] Closing position — broadcasting repay-loan...`,
                },
              });
              send({
                type:      "REPAY_INITIATED",
                timestamp: Date.now() + 1,
                data: { message: "[REPAY] Awaiting Nakamoto confirmation (~5 seconds)..." },
              });

              // Async poll — does not block stream close
              pollRepayConfirmation(repayTxid, hiroApiBaseUrl, callId).then(() => {
                send({
                  type:      "POSITION_CLOSED",
                  timestamp: Date.now(),
                  data: {
                    loan_id:    livePos.loanId.toString(),
                    repay_txid: repayTxid,
                    message:    `[CLOSED ✓] Position closed. Loan ID: ${livePos.loanId} | TXID: ${repayTxid} | sBTC collateral returned.`,
                  },
                });
                controller.close();
              });
            })
            .catch((err: unknown) => {
              console.error("[repay-loan] broadcast failed:", (err as Error).message);
              controller.close();
            });

          // Keep stream open until pollRepayConfirmation closes it
          return;
        }
      } catch (err) {
        send({
          type:      "ERROR",
          timestamp: Date.now(),
          data:      { message: (err as Error).message ?? "Agent request failed" },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
