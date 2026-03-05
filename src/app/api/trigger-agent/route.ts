// =============================================================================
// src/app/api/trigger-agent/route.ts
// SSE endpoint — runs the Lend402 JIT borrow cycle and streams every
// AgentEvent back to the dashboard in real time.
//
// Flow:
//   Dashboard opens EventSource("/api/trigger-agent")
//   → This route instantiates withPaymentInterceptor()
//   → Makes a real GET to MERCHANT_API_URL/api/premium-data
//   → Agent-client intercepts the 402, runs simulate-borrow, builds +
//     signs borrow-and-pay, attaches payment-signature, retries
//   → Each lifecycle step fires onEvent() → SSE frame → dashboard
//   → After PAYMENT_CONFIRMED the route emits DATA_RETRIEVED with the
//     premium payload + LoanPosition for the treasury panel
//   → Stream closes; EventSource in AgentContext detects DATA_RETRIEVED
//     and calls evtSource.close()
//
// Required env vars (see .env.local.example):
//   LEND402_AGENT_PRIVATE_KEY   hex private key (no 0x prefix)
//   LEND402_AGENT_ADDRESS       Stacks address of the agent wallet
//   MERCHANT_API_URL            URL of the running merchant-api server
//   STACKS_NETWORK              "testnet" | "mainnet"  (default: testnet)
// =============================================================================

import { withPaymentInterceptor, AgentEvent, testnetConfig, mainnetConfig } from "@/lib/agent-client";
import { StacksTestnet, StacksMainnet } from "@stacks/network";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs"; // Required: @stacks/transactions needs Node.js crypto

// ---------------------------------------------------------------------------
// Type for accumulated event state — used to construct the LoanPosition
// once all events have fired.
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

// ---------------------------------------------------------------------------
// GET — stream events to the dashboard
// ---------------------------------------------------------------------------

export async function GET() {
  const encoder = new TextEncoder();

  const privateKey    = process.env.LEND402_AGENT_PRIVATE_KEY;
  const agentAddress  = process.env.LEND402_AGENT_ADDRESS;
  const merchantUrl   = process.env.MERCHANT_API_URL ?? "http://localhost:3001";
  const networkName   = process.env.STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

  // ── Env guard ──────────────────────────────────────────────────────────────
  if (!privateKey || !agentAddress) {
    const errFrame = JSON.stringify({
      type:      "ERROR",
      timestamp: Date.now(),
      data: {
        message:
          "Missing LEND402_AGENT_PRIVATE_KEY or LEND402_AGENT_ADDRESS. " +
          "Copy .env.local.example → .env.local and fill in your keys.",
      },
    });
    return new Response(`data: ${errFrame}\n\n`, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AgentEvent) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      // ── Accumulate cross-event data for LoanPosition construction ──────────
      const settlement: Partial<SettlementState> = {};

      // ── Network config ─────────────────────────────────────────────────────
      const networkConfig =
        networkName === "mainnet"
          ? mainnetConfig(privateKey, agentAddress)
          : testnetConfig();

      // ── Build agent client with real Stacks.js interceptor ─────────────────
      const agentClient = withPaymentInterceptor({
        privateKey,
        agentAddress,
        ...networkConfig,
        onEvent: (event: AgentEvent) => {
          send(event);

          // Harvest values needed for the treasury position display
          switch (event.type) {
            case "SIMULATE_BORROW_OK":
              settlement.collateralSbtc  = Number(event.data.required_collateral_sbtc as string);
              settlement.sbtcPriceUsd    = Number(event.data.sbtc_price_usd8 as string) / 1e8;
              settlement.originationFee  = Number(event.data.origination_fee_usdcx as string);
              break;
            case "TX_BUILT":
              settlement.amountUsdcx     = Number(event.data.amount_usdcx as string);
              settlement.merchantAddress = event.data.merchant as string;
              break;
            case "PAYMENT_CONFIRMED":
              settlement.txid            = event.data.txid as string;
              settlement.blockHeight     = event.data.block_height as number;
              break;
          }
        },
      });

      try {
        // ── Make the actual paywalled request ───────────────────────────────
        // The interceptor handles the 402 → borrow → retry lifecycle.
        // If the merchant grants access, we get the premium data in `data`.
        const { data } = await agentClient.get<{
          data: Record<string, unknown>;
          meta: { agent_address: string; txid: string; cost_usdcx: number };
        }>(`${merchantUrl}/api/premium-data`);

        // ── Build LoanPosition for the treasury panel ───────────────────────
        const position = {
          loanId:          settlement.txid ?? data.meta.txid,
          principalUsdcx:  settlement.amountUsdcx         ?? 0,
          collateralSbtc:  settlement.collateralSbtc       ?? 0,
          originationTime: Date.now(),
          txid:            settlement.txid                 ?? data.meta.txid,
          blockHeight:     settlement.blockHeight          ?? 0,
          merchantAddress: settlement.merchantAddress      ?? "",
          netPaymentUsdcx: (settlement.amountUsdcx ?? 0) - (settlement.originationFee ?? 0),
          sbtcPriceUsd:    settlement.sbtcPriceUsd         ?? 0,
        };

        // ── Emit DATA_RETRIEVED — AgentContext closes the EventSource on this
        send({
          type:      "DATA_RETRIEVED",
          timestamp: Date.now(),
          data:      { ...data.data, position },
        });
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
