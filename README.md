# Lend402: Zero-Click Agentic Credit

**Buidl Battle #2 Submission | Stacks Nakamoto Release | Clarity 4**

Lend402 is a Just-In-Time (JIT) micro-lending protocol engineered for autonomous AI agents. It bridges the gap between Bitcoin's pristine collateral (sBTC) and the internet's demand for stable payment rails (USDCx) using the x402 protocol.

## ⚠️ The Problem: The Agentic Liquidity Mismatch

AI agents increasingly use the x402 protocol to bypass rigid API keys and pay for data, compute, and web services autonomously `[2]`. These APIs strictly demand stablecoins like USDCx to maintain predictable fiat margins. However, enterprise agents and DAOs hold their treasuries in appreciating assets like sBTC. Forcing an agent to continuously liquidate Bitcoin to fund micro-transactions incurs extreme friction, opportunity cost, and taxable events.

## 💡 The Solution: Atomic HTTP Credit

Lend402 acts as an invisible credit bridge. When an agent hits a paywalled API, the SDK intercepts the `402 Payment Required` response, dynamically constructs an atomic Stacks transaction to lock sBTC and borrow the exact USDCx amount required, and routes the payment to the merchant—all settled in a single Nakamoto fast-block `[3]`.

## 🏗️ System Architecture & Design Decisions

### 1. Clarity 4 Smart Contract (`lend402-vault.clar`)

* **Precision Interest Accrual:** Utilizes Clarity 4's new `block-time` function to calculate loan yield based on exact real-time rather than legacy block counts ``.
* **Native USDCx & sBTC via SIP-010:** Strict integration with Circle's xReserve USDCx and non-custodial sBTC via dynamic SIP-010 traits `[4]`.
* **Absolute Atomicity:** The `borrow-and-pay` function uses consecutive `unwrap!` statements for the sBTC lock and USDCx payment. Any failure instantly reverts the entire state, preventing ghost loans.

### 2. TypeScript Agent SDK (`agent-client.ts`)

* **simulate-borrow Pre-flight:** Before signing, the SDK calls a read-only contract function to mathematically guarantee the 150% collateral ratio is met, preventing on-chain oracle race conditions.
* **Dual PostConditionMode.Deny:** We enforce two absolute post-conditions: (1) exactly `X` sBTC leaves the agent, and (2) exactly `Y` USDCx hits the merchant ``. Any deviation triggers an atomic abort.
* **x402-stacks Integration:** Built natively on top of the `x402-stacks` library utilizing the `withPaymentInterceptor` pattern for Axios `[5]`.

### 3. Express Middleware & Facilitator (`merchant-api.ts`)

* **Facilitator Isolation:** The merchant server validates the `payment-signature` but holds zero access to the Stacks node. It uses HMAC-SHA256 to securely forward the payload to an isolated Facilitator node, structurally eliminating double-spend risks `[6]`.

### 4. Agent Command Center (Next.js App Router)

* **Server-Sent Events (SSE):** Consumes the `AgentEvent` stream in real-time, mapping perfectly to Stacks' sub-10-second Nakamoto finality without heavy WebSocket polling ``.
* **Cryptographic Transparency:** The `SimulatePreviewCard` permanently displays the `PostConditionMode.Deny` invariant guarantees to the human operator before any transaction is broadcast.

---