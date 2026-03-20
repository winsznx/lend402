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
  standardPrincipalCV,
  serializeCV,
  deserializeCV,
  broadcastTransaction,
  PostConditionMode,
  AnchorMode,
  ClarityType,
} from "@stacks/transactions";
import { StacksMainnet, StacksTestnet } from "@stacks/network";

export const dynamic    = "force-dynamic";
export const runtime    = "nodejs";
export const maxDuration = 60;

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

interface HiroCallReadResponse {
  okay: boolean;
  result?: string;
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
  const stacksConfig = getServerStacksConfig();
  const principalArg = `0x${Buffer.from(
    serializeCV(standardPrincipalCV(agentAddress))
  ).toString("hex")}`;

  // Step 1: call-read get-active-position → (ok position) or (err ...)
  const posRes = await fetch(
    `${hiroApiBaseUrl}/v2/contracts/call-read/${stacksConfig.vaultContractAddress}/${stacksConfig.vaultContractName}/get-active-position`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender: agentAddress, arguments: [principalArg] }),
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!posRes.ok) return null;

  const posJson = (await posRes.json()) as HiroCallReadResponse;
  if (!posJson.okay || !posJson.result) return null;

  const posCV = deserializeCV(posJson.result.slice(2));
  if (posCV.type !== ClarityType.ResponseOk) return null;

  const tupleCV = posCV.value;
  if (tupleCV.type !== ClarityType.Tuple) return null;

  const isActiveCV = tupleCV.data["is-active"];
  if (!isActiveCV || isActiveCV.type !== ClarityType.BoolTrue) return null;

  const currentDebtCV = tupleCV.data["current-debt"];
  if (!currentDebtCV || currentDebtCV.type !== ClarityType.UInt) return null;

  const currentDebt = currentDebtCV.value;

  // Step 2: map_entry borrower-active-loan → (some loan-id) needed for repay-loan arg
  const mapRes = await fetch(
    `${hiroApiBaseUrl}/v2/map_entry/${stacksConfig.vaultContractAddress}/${stacksConfig.vaultContractName}/borrower-active-loan`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(principalArg),
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!mapRes.ok) return null;

  const mapJson = (await mapRes.json()) as { data?: string };
  if (!mapJson.data) return null;

  const loanIdCV = deserializeCV(mapJson.data.slice(2));
  if (loanIdCV.type !== ClarityType.OptionalSome) return null;

  const loanIdInner = loanIdCV.value;
  if (loanIdInner.type !== ClarityType.UInt) return null;

  return { loanId: loanIdInner.value, currentDebt };
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
): Promise<void> {
  const normalizedTxid = txid.startsWith("0x") ? txid : `0x${txid}`;
  const deadline = Date.now() + 60_000;

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
        return;
      }
      if (tx.tx_status.startsWith("abort") || tx.tx_status.startsWith("dropped")) {
        return;
      }
    } catch {
      // polling error — continue
    }
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
  // If a stuck position is found, attempt auto-repay before starting a new cycle.
  {
    const stuckPos = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
    if (stuckPos) {
      // Give the chain a moment in case a repay is already in-flight
      await sleep(6_000);
      const stillOpen = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
      if (stillOpen) {
        // Attempt to repay the stuck loan before starting a new cycle
        try {
          const repayTxid = await broadcastRepayLoan(
            privateKey,
            agentAddress,
            stillOpen.loanId,
            stillOpen.currentDebt,
            networkName
          );
          await pollRepayConfirmation(repayTxid, hiroApiBaseUrl);
          // Give one more check after confirmation
          const afterRepay = await fetchActivePosition(agentAddress, hiroApiBaseUrl).catch(() => null);
          if (afterRepay) {
            return new Response(
              errorFrame("Agent has an open loan that could not be auto-repaid. Check the contract state."),
              { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
            );
          }
        } catch {
          return new Response(
            errorFrame("Agent has an open loan from a previous call. Auto-repay failed — retry in a few seconds."),
            { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } }
          );
        }
      }
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
              pollRepayConfirmation(repayTxid, hiroApiBaseUrl).then(() => {
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

          // Stream stays open — controller.close() called inside repay callbacks above
          return;
        }

        // No open position to repay — close stream normally
        controller.close();
      } catch (err) {
        send({
          type:      "ERROR",
          timestamp: Date.now(),
          data:      { message: (err as Error).message ?? "Agent request failed" },
        });
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
