Lend402 API Vault — Product Requirements Document
Version: 1.0.0
Status: Approved for Engineering
Network: Stacks Mainnet (stacks:1) — production target
Protocol Baseline: x402 V2 (normative reference: Section 0)

Table of Contents
Problem Statement
User Personas & Jobs-To-Be-Done
Feature Scope — Complete Flow Specification
Technical Architecture
API Contract Specification
UI/UX Component Specification
Security & Trust Model
x402 V2 Compliance Checklist
Launch & Pitch Strategy
1. Problem Statement
1.1 Why API Keys Fail for AI Agent Payments
The API key model was designed for human-operated software in 1990s web architectures. It assumes a human creates an account, a human manages key rotation, and a human pays invoices. AI agents operating autonomously at scale break every one of these assumptions.

No wallet, no OAuth, no identity. An AI agent is a process, not a user. Giving it an API key requires a human operator to provision credentials in advance, store them securely in environment variables, and rotate them when compromised. In multi-agent systems with hundreds of concurrent agent instances, each calling dozens of external APIs, credential management becomes a full-time engineering role. The API key model scales in cost with the number of providers, not with usage volume.

Key rotation overhead. When a key is leaked — through a log file, a debug trace, or a compromised CI environment — the provider must issue a new key, the operator must update secrets in every deployment environment, and the agent must restart. This human-in-the-loop dependency is incompatible with 24/7 autonomous agent operation.

No per-call settlement proof. API keys produce monthly invoices, not cryptographic receipts. When an agent makes 10,000 calls to a data provider in a weekend, the operator learns the cost three to four weeks later. There is no on-chain record tying a specific agent action to a specific payment. For enterprise operators building auditable AI pipelines, this is not acceptable.

No micro-payment denomination. API key billing is monthly batch. A data provider charging $0.001 per call cannot economically bill via invoice — the processing cost of the invoice exceeds the revenue at low volumes. Stripe's minimum invoice threshold is $0.50. At $0.001 per call, a provider needs 500 calls before they receive a single payment, creating credit risk on the provider side and preventing experimentation with sub-cent pricing.

1.2 Why Subscription Billing Fails for Agent Micro-Calls
Subscription billing was designed for predictable human consumption patterns. AI agents are spiky, burst-oriented, and non-linear. A single agent pipeline can make zero calls for three hours and 50,000 calls in the next ten minutes during a batch job.

Impractical at micro-value. The LLM API market is projected to reach $150 billion by 2030, growing at approximately 35% per year. The median AI agent API call — for real-time data, vector search, or specialized inference — is valued under $0.10. At $0.001 per call, a monthly subscription requires the provider to front-load credit for millions of calls the agent may or may not make. Unused credits are a recurring negotiation. Overage charges require manual top-up by a human operator.

Credit risk for the provider. Monthly billing means the provider delivers value for 30 days before receiving payment. For new agents from unknown operators, this is unsecured credit exposure. Providers respond by requiring prepayment deposits, building collections workflows, or simply rejecting small customers — all of which kill the long tail of agent-powered use cases.

No composability. Subscription billing is bilateral — one subscription per provider. An agent calling 40 different data providers needs 40 subscriptions, 40 billing relationships, 40 invoices, and 40 cancellation flows when the pipeline is deprecated. This does not scale.

1.3 Why x402 V2 + Lend402 JIT Borrow Is the Correct Solution
x402 V2 is an open HTTP payment protocol that converts a resource request into an atomic payment flow using a standard HTTP 402 response. The Lend402 extension adds JIT borrowing, enabling agents that hold sBTC — Bitcoin's appreciating asset — to pay USDCx-denominated APIs without pre-loading stablecoins.

No API key management. The payment credential is the agent's secp256k1 private key, which it already holds for wallet operations. There is no registration with the provider, no key issuance, and no rotation. The cryptographic identity is the payment identity.

Atomic per-call settlement on Stacks Nakamoto. Nakamoto fast-blocks confirm in approximately 5 seconds. The borrow-and-pay contract call in lend402-vault.clar executes atomically: collateral is locked, USDCx is borrowed, and USDCx is transferred to the provider in a single transaction. Either everything succeeds or nothing moves. PostConditionMode.DENY ensures the on-chain settlement amount exactly matches what was declared in the payment header — no rounding, no slippage, no fees beyond the declared origination fee.

Agent holds sBTC, not idle USDCx. Bitcoin (via sBTC) is an appreciating asset. Holding idle USDCx to pre-fund API access is a carry cost — the agent forgoes BTC appreciation. With Lend402, the agent holds sBTC as its treasury asset, borrows USDCx exactly when needed, and repays as part of the same transaction. The agent's capital efficiency is maximized: it never holds more stablecoins than the current call requires.

Provider receives USDCx instantly. The USDCx transfer to the provider's address is confirmed on-chain before the gateway proxies the request to the origin API. The provider does not wait 30 days. There is no invoice. There is no credit risk. The settlement is final at block confirmation.

On-chain proof of every payment. Every payment produces a Stacks transaction ID, a block height, and a confirmation timestamp, all included in the X-PAYMENT-RESPONSE header returned to the caller. For enterprise operators, this is a cryptographic audit trail that can be verified independently by any party without trusting Lend402's systems.

1.4 Market Sizing
Global LLM API market (2024): ~$4.6 billion, growing at ~35% annually
AI agent API call volume: estimated 2.4 trillion calls in 2025, growing 4× per year
Average micro-API call value (real-time data, embeddings, inference): $0.001–$0.10
Addressable market for per-call settlement infrastructure: every API priced below $1/call
Provider addressable market: any developer with a premium HTTPS API endpoint and no appetite for billing infrastructure
2. User Personas & Jobs-To-Be-Done
2.1 Persona A — API Provider: "Dev Dana"
Background. Dana is a solo developer or small team building a specialized data API — real-time financial prices, on-chain analytics, satellite imagery metadata, or ML-enhanced search. Dana has strong domain expertise and a working API but no patience for billing infrastructure. Dana currently offers one of three unsatisfying options: free (unsustainable), API key with monthly billing (requires Stripe integration, dunning, and support), or open access (no monetization at all).

Current Tooling. Express or FastAPI backend deployed on Fly.io or Railway. No payment processor integrated. Possibly a RapidAPI listing that takes 30–40% revenue share. No enterprise sales motion.

Pain Points.

Setting up Stripe requires webhook handling, subscription logic, and customer portal — a two-week distraction from the API itself.
API key management requires a database table, key rotation logic, and audit logging — another week of work.
Micro-pricing ($0.001/call) is impossible with Stripe because the minimum charge is $0.50 and the processing fee ($0.30) exceeds the revenue on small batches.
AI agents calling Dana's API anonymously cannot be billed at all — they have no credit card on file.
Job-To-Be-Done. "When I build a premium data API, I want to monetize per-call without managing API keys or chasing invoices, so I can focus on the data product, not the billing infrastructure."

Success Metric. Time from idea to first paid call is under 5 minutes. Dana pastes an origin URL, sets a price, copies a wrapped URL, and starts earning — zero additional code in the origin API.

Failure Mode. Any flow that requires Dana to modify the origin API — adding middleware, changing response formats, or installing an SDK server-side — is a non-starter. The origin API must remain untouched.

2.2 Persona B — AI Agent Operator: "Eng Eli"
Background. Eli is a backend or ML engineer building autonomous agent pipelines at a startup or enterprise. Eli's agents run 24/7, consume dozens of external data sources, and are expected to operate without human intervention. Eli has experience with Stacks/Bitcoin infrastructure, holds sBTC as the agent treasury asset, and understands the tradeoffs of different settlement layers.

Agent Architecture. Each agent is a Node.js or Python process with a long-running event loop. Agents use Axios (Node.js) or httpx (Python) for outbound requests. The agent's private key is stored in an HSM or environment variable, never exposed to application code directly. Multiple agent instances may run concurrently, each with its own key.

Current Treasury Management. Agent holds 0.001–0.01 sBTC. When an agent needs to call a paywalled API, Eli currently either: (a) pre-loads the agent's wallet with USDCx from a Binance withdrawal — a 20-minute manual process per agent, or (b) skips the premium API and uses a free/inferior alternative. Neither is acceptable for production pipelines.

Job-To-Be-Done. "When my agents need premium data, I want them to self-fund access from their sBTC treasury without manual USDCx top-ups, so the agent pipeline never stalls waiting for human intervention."

Success Metric. The agent calls a wrapped vault URL, receives a 402, self-funds with sBTC collateral, gets the data, and continues the pipeline — with zero operator action and zero pre-loaded USDCx.

Key Requirement. The agent SDK must remain wire-compatible with the x402-stacks withPaymentInterceptor pattern, with Lend402's simulate-borrow pre-flight and PostConditionMode.DENY post-conditions as the inner Lend402-specific layer. This preserves forward compatibility with Stacks x402 V2 endpoints beyond Lend402 vaults.

2.3 Persona C — Enterprise Evaluator: "Exec Emma"
Background. Emma is a CTO or CFO at a company deploying agentic AI infrastructure at scale. Emma's team is making a $500K+ annual commitment to AI agent infrastructure. Emma does not write code but reviews architecture proposals and approves vendor relationships. Emma's primary concerns are auditability, cost predictability, and vendor lock-in.

Current Pain Points. Black-box billing from API vendors. No ability to independently verify that the charges match the usage. Monthly invoices that require manual reconciliation against internal logs. No cryptographic proof that an agent actually called an API versus a billing error.

Job-To-Be-Done. "When I approve agentic AI infrastructure, I want every payment auditable on-chain with a txid, so I can present a cryptographic audit trail to the CFO without relying on vendor billing records."

Success Metric. Emma can take any payment from the agent's dashboard, click the txid, and verify the exact amount, timestamp, recipient, and block height on the public Stacks explorer — independently, without trusting Lend402's systems.

Key Requirement. The X-PAYMENT-RESPONSE header must include the txid as a fully-qualified Stacks transaction ID (with 0x prefix). The dashboard must render each call's txid as a clickable link to https://explorer.hiro.so/txid/{txid}?chain=mainnet. The enterprise evaluator must be able to hand this URL to an auditor and have it be self-explanatory.

3. Feature Scope — Complete Flow Specification
3.1 Step 1 — Provider Registration (lend402.xyz/vault/new)
3.1.1 UI Elements and Validation
The registration page renders VaultRegistrationForm (defined in Section 6). Every field below is required unless marked optional.

Field	Type	Validation Rules
Connect Wallet	Button	Uses @stacks/connect showConnect. Wallet must be connected before form submission is enabled. Displays truncated address on connect.
Origin API URL	<input type="url">	Must pass new URL() without throwing. Scheme must be https:. Hostname must not resolve to RFC-1918 addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16), loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16), or unique-local IPv6 (fc00::/7). Hostname must contain at least one dot (no bare hostnames). Validated client-side on blur; re-validated server-side on submit.
Price per call (USD)	<input type="number">	Minimum: 0.001. Maximum: 1000.00. Step: 0.001. Stored internally as Math.round(value * 1_000_000) micro-USDCx (BIGINT). Display shows both USD and computed micro-USDCx for transparency.
Rate limit (calls/min)	<input type="number">	Integer. Minimum: 1. Maximum: 1000. Default: 60. Applied per payer address per vault.
Resource name	<input type="text">	Maximum 64 UTF-8 characters. No newlines. Shown in the x402 V2 description field.
Description	<textarea>	Maximum 256 UTF-8 characters. Shown in wallet UI during payment.
Webhook URL	<input type="url">	Optional. If provided: must be HTTPS, must pass URL validation, same SSRF rules as Origin API URL.
3.1.2 Submission Flow
Client-side (before POST):

Validate all fields as specified above. Display inline errors on invalid fields. Do not submit if any field fails.
Call @stacks/connect openSignatureRequestPopup with the deterministic message:

Register API Vault: {SHA-256(originUrl)} at {Math.floor(Date.now()/1000)}
Where SHA-256(originUrl) is the hex-encoded SHA-256 hash of the origin URL string. The unix timestamp is captured once and embedded in the message — it must not drift between signing and submission.
On signature success: extract publicKey and signature from the response.
POST to /api/vault/register with the payload specified in Section 5.
Server-side (POST /api/vault/register):


// Pseudocode — exact implementation per Section 5
async function registerVault(req: Request): Promise<Response> {
  const { originUrl, priceUsdcx, rateLimit, resourceName,
          description, webhookUrl, providerAddress, signature, message } = req.body;

  // 1. Re-validate all fields (never trust client validation)
  validateOriginUrl(originUrl);         // throws 400 on failure
  validateSsrf(originUrl);              // throws 400 on RFC-1918/loopback
  validatePriceRange(priceUsdcx);       // throws 400 if < 1000 or > 1_000_000_000
  validateRateLimit(rateLimit);         // throws 400 if < 1 or > 1000

  // 2. Verify signature
  const isValid = verifyMessageSignatureRsv({
    message, publicKey: derivePublicKey(providerAddress), signature
  });
  if (!isValid) throw new ApiError(401, "Invalid wallet signature");

  // 3. Derive provider address from public key and verify it matches
  if (getAddressFromPublicKey(publicKey) !== providerAddress) {
    throw new ApiError(401, "Address does not match signature public key");
  }

  // 4. Check for duplicate (same provider_address + origin_url)
  const existing = await db.vaults.findOne({ providerAddress, originUrl });
  if (existing) throw new ApiError(409, "Vault already registered for this URL");

  // 5. Insert into Postgres
  const vault = await db.vaults.insert({
    providerAddress, originUrl, priceUsdcx, rateLimit,
    resourceName, description, webhookUrl,
    network: 'stacks:2147483648',
    assetContract: 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx'
  });

  return { vaultId: vault.vaultId, wrappedUrl: `https://gateway.lend402.xyz/v/${vault.vaultId}/`, createdAt: vault.createdAt };
}
Success UI state: The form collapses and shows:

A green success banner: "Vault registered."
The wrapped URL in a monospace box with a one-click copy button.
A "Go to Dashboard" link routing to /vault/dashboard.
A collapsible "Quick Start" code snippet (TypeScript tab, pre-populated with the vault's wrapped URL and price).
3.2 Step 2 — The Gateway Proxy (gateway.lend402.xyz)
The gateway is implemented as a Next.js App Router Route Handler at src/app/v/[vault_id]/[...path]/route.ts. It handles all HTTP methods.

3.2.1 Path A — No X-PAYMENT Header (Issue 402)

Inbound: GET https://gateway.lend402.xyz/v/abc123/prices/BTC-USD/spot
         (no X-PAYMENT header)

1. Parse vault_id from path segment.
2. SELECT * FROM vaults WHERE vault_id = $1 AND is_active = true.
   → 404 { error: "Vault not found" } if not found or inactive.
3. Generate nonce: crypto.randomUUID()
4. Store nonce in Redis:
   SET nonce:{vault_id}:{nonce} '{"vaultId":"...","resource":"...","issuedAt":...,"used":false}' NX EX 300
5. Return HTTP 402 with body:

{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "stacks:2147483648",
      "maxAmountRequired": "500000",
      "resource": "https://gateway.lend402.xyz/v/{vault_id}/prices/BTC-USD/spot",
      "description": "{vault.description}",
      "mimeType": "application/json",
      "payTo": "{vault.provider_address}",
      "maxTimeoutSeconds": 300,
      "asset": "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
      "extra": {
        "name": "USDCx",
        "version": "1"
      }
    }
  ],
  "error": "Payment required"
}
The resource field must be the exact URL of the inbound request, including all path segments and query parameters, at the gateway.lend402.xyz domain — not the origin URL. This is because the x402 V2 spec requires resource to be the URL the payer is attempting to access.

The nonce is NOT embedded in the 402 body in the current x402 V2 spec. Replay prevention is handled via the resource field in the X-PAYMENT payload matching the inbound request URL, plus Redis idempotency keyed on the transaction ID (see Section 3.4 Nonce Store).

3.2.2 Path B — X-PAYMENT Header Present (Settle and Proxy)

Inbound: GET https://gateway.lend402.xyz/v/abc123/prices/BTC-USD/spot
         X-PAYMENT: base64({"x402Version":2,"scheme":"exact","network":"stacks:2147483648","payload":{"signedTransaction":"0xabc...","type":"contract_call"}})
Processing steps, in strict order:

Decode X-PAYMENT header: JSON.parse(Buffer.from(xPayment, 'base64').toString('utf8')).
Validate structure:
x402Version must equal 2 (integer). → 400 if not.
scheme must equal "exact". → 400 if not.
network must equal vault.network. → 400 if mismatch.
payload.type must equal "contract_call". → 400 if not.
payload.signedTransaction must be a non-empty hex string. → 400 if not.
Extract signedTransaction hex string.
Derive payer address from the transaction's sender public key using @stacks/transactions deserializeTransaction. → 400 if deserialization fails.
Apply rate limiting:
Redis key: rate:{vault_id}:{payer_address}
Use sliding window log: ZADD rate:{vault_id}:{payer} NX {now_ms} {now_ms} then ZREMRANGEBYSCORE rate:{vault_id}:{payer} 0 {now_ms - 60000} then ZCARD rate:{vault_id}:{payer}.
If count exceeds vault.rate_limit: return 429 {"error":"Rate limit exceeded","retryAfterMs":60000}.
Check idempotency: compute txid = txidFromData(deserializeTransaction(signedTransaction)). Check Redis key settled:{txid}. If exists: return 409 {"error":"Transaction already settled"}.
Build the canonical settlement request and execute the in-process Stacks settlement module using the x402 V2 wire format (Section 0.5):

{
  "x402Version": 2,
  "scheme": "exact",
  "network": "stacks:2147483648",
  "payload": {
    "signedTransaction": "{hex}",
    "type": "contract_call"
  },
  "resource": "https://gateway.lend402.xyz/v/{vault_id}/{path}",
  "payTo": "{vault.provider_address}"
}
On successful Stacks settlement {"success":true,...}:
a. Set idempotency key in Redis: SET settled:{txid} '{"blockHeight":N,"confirmedAt":N,"payer":"SP1..."}' EX 86400 (24h TTL).
b. Insert into calls table.
c. Atomically increment vaults.total_calls and vaults.total_earned_usdcx.
d. If vault.webhook_url is set: enqueue webhook delivery (async, non-blocking — use a background Promise that does not delay the response). Webhook payload:


{"event":"call.settled","vaultId":"...","txid":"...","payer":"SP1...","amountUsdcx":500000,"timestamp":"ISO-8601"}
Webhook fires with fetch(webhookUrl, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)}). Retry once on failure with 2s delay. Log failure silently — do not surface to caller.
e. Proxy request to origin:


const originUrl = new URL(vault.originUrl);
const proxyTarget = `${originUrl.origin}${request.nextUrl.pathname.replace(`/v/${vaultId}`, '')}${request.nextUrl.search}`;
const proxyHeaders = new Headers(request.headers);
proxyHeaders.delete('x-payment');
proxyHeaders.delete('host');
proxyHeaders.delete('authorization');
proxyHeaders.set('x-forwarded-for', callerIp);
const originResponse = await fetch(proxyTarget, {
  method: request.method,
  headers: proxyHeaders,
  body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  redirect: 'follow',
});
f. Build X-PAYMENT-RESPONSE header:


{
  "x402Version": 2,
  "success": true,
  "txid": "0xabc123...",
  "network": "stacks:2147483648",
  "scheme": "exact",
  "payer": "SP1AGENT...",
  "blockHeight": 142857,
  "confirmedAt": 1741290168
}
Base64-encode and attach as X-PAYMENT-RESPONSE header on the response.
g. If origin returns non-2xx: return origin response verbatim with X-PAYMENT-RESPONSE: {success:true} and X-LEND402-WARNING: origin_error headers. Do not alter the body.
h. If origin returns 2xx: return origin response verbatim with X-PAYMENT-RESPONSE header.

On settlement failure:

Do NOT proxy to origin.
Return HTTP 400:

{"error":"Payment settlement failed","reason":"{facilitator.error}","txid":"{txid_if_known}"}
3.2.3 Path Passthrough Rules
Scenario	Behavior
/v/{id}/users/123?foo=bar	Proxies to {origin_url}/users/123?foo=bar
/v/{id}/ (trailing slash, no path)	Proxies to {origin_url}/
POST with JSON body	Body forwarded verbatim, Content-Type header preserved
Chunked transfer encoding	Streamed through — no buffering
Redirect from origin (301/302)	redirect: 'follow' — transparent to caller
Origin sends Set-Cookie	Forwarded verbatim — cookies belong to origin domain, not gateway
Binary response (images, PDFs)	Proxied as-is — Content-Type forwarded from origin
Query parameters are preserved exactly as received. The gateway does not URL-encode or decode query strings — they are forwarded as raw strings.

3.2.4 Global Rate Limits
Limit	Value	Enforcement
Per vault + payer (sliding window)	vault.rate_limit req/min	Redis ZADD sliding window
Global gateway	10,000 req/min	Redis counter global:rps, incremented per request
Stacks settlement timeout	20 seconds	Poll Hiro API for confirmation with 20s ceiling
Origin proxy timeout	30 seconds	fetch with AbortController timeout
3.3 Step 3 — Provider Dashboard (lend402.xyz/vault/dashboard)
3.3.1 Authentication
The dashboard is authenticated via the same @stacks/connect wallet signature pattern used during registration. No session cookies are issued. On every dashboard load:

Check localStorage for a cached signature {address, signature, message, timestamp}.
If cached signature is less than 1 hour old and the embedded address matches the connected wallet address: use cached signature for API calls.
Otherwise: prompt wallet signature with message "Lend402 Dashboard Access: {address} at {unix_ts}".
Store signature in localStorage with {address, signature, message, timestamp: Date.now()}.
All dashboard API calls include X-Wallet-Address: {address} and X-Wallet-Signature: {base64(signature)} headers.
3.3.2 Data Displayed Per Vault
Vault summary row:

Field	Source	Format
Vault ID	vaults.vault_id	Monospace, truncated to 8 chars + copy button for full UUID
Wrapped URL	Computed	https://gateway.lend402.xyz/v/{vault_id}/ + copy button
Resource name	vaults.resource_name	Plain text
Price	vaults.price_usdcx	${(price_usdcx / 1_000_000).toFixed(3)} USDCx
Total calls	vaults.total_calls	Integer with comma separators
Total earned	vaults.total_earned_usdcx	${(total_earned_usdcx / 1_000_000).toFixed(4)} USDCx
Status	vaults.is_active	Green "Active" / Red "Paused" badge
Provider earnings note. The USDCx balance displayed in the dashboard is informational — the provider's USDCx arrives directly in their Stacks wallet at each payment settlement (the payTo field in the x402 body). There is no escrow and no withdrawal step. The dashboard's "earnings" figure is computed from the calls table (SUM(amount_usdcx) WHERE vault_id = X) and represents historical settled payments. The provider's live wallet balance is shown as a read-only call to the USDCx SIP-010 contract's get-balance function via the Hiro API:


const balance = await callReadOnlyFunction({
  contractAddress: 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE',
  contractName: 'usdcx',
  functionName: 'get-balance',
  functionArgs: [principalCV(providerAddress)],
  network: new StacksTestnet(),
  senderAddress: providerAddress,
});
The "Withdraw Earnings" button in the dashboard is relabeled "View Wallet Balance" and opens a modal showing the provider's live USDCx balance from the chain. No on-chain withdrawal is required because payments are delivered directly to the provider's wallet.

Live call feed (last 10 calls per vault):


interface CallFeedItem {
  callId: string;
  settledAt: string;          // ISO-8601
  payerAddress: string;       // truncated: "SP1AB...XYZ9"
  txid: string;               // full txid for link
  txidDisplay: string;        // truncated: "0xabc1...ef89"
  explorerUrl: string;        // https://explorer.hiro.so/txid/{txid}?chain=mainnet
  amountUsdcx: number;        // micro-units
  originStatus: number | null; // HTTP status from origin (200, 500, etc.)
  status: 'success' | 'origin_error';
}
Each call row renders: [{timestamp}] {payerAddress} → {txidDisplay} | +{amount} USDCx | {status}. The txidDisplay is a clickable anchor to explorerUrl. origin_error calls are shown in amber — payment settled but origin returned non-2xx.

3.3.3 Code Snippet Generator
Three tabs, pre-populated per vault:

Tab 1 — curl:


# Requires lend402 CLI (npm install -g lend402-cli)
VAULT_URL="https://gateway.lend402.xyz/v/{vault_id}/your-path"

curl -H "X-PAYMENT: $(lend402 sign \
  --amount {price_usdcx} \
  --payTo {provider_address} \
  --asset SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx \
  --resource $VAULT_URL)" \
  "$VAULT_URL"
Tab 2 — Python:


from x402_stacks import with_payment_interceptor
import os

session = with_payment_interceptor(
    private_key=os.environ["AGENT_PRIVATE_KEY"],
    agent_address=os.environ["AGENT_ADDRESS"],
    network="stacks:2147483648",
    lend402_vault_address="ST3VAULT000LEND402TESTNETADDRESS",
)

resp = session.get("https://gateway.lend402.xyz/v/{vault_id}/your-path")
print(resp.json())
Tab 3 — TypeScript:


import { withPaymentInterceptor } from '@/lib/agent-client';
import axios from 'axios';

const agent = withPaymentInterceptor(axios.create(), {
  privateKey: process.env.AGENT_PRIVATE_KEY!,
  agentAddress: process.env.AGENT_ADDRESS!,
  network: 'stacks:2147483648',
  lend402VaultAddress: 'ST3VAULT000LEND402TESTNETADDRESS',
});

const { data } = await agent.get(
  'https://gateway.lend402.xyz/v/{vault_id}/your-path'
);
console.log(data);
All snippets have a one-click copy button. The vault_id, price_usdcx, and provider_address are substituted with the selected vault's actual values.

3.4 Step 4 — Caller Experience Update (Agent Command Center)
3.4.1 "Call a Vault" UI Element
A new VaultCallInput component (Section 6) is added below the existing FlowDiagram in page.tsx. It contains:

Vault ID or URL input: <input type="text" placeholder="vault_id or https://gateway.lend402.xyz/v/{id}/">. Accepts either a bare UUID vault ID or the full wrapped URL. The component normalizes both to the full URL before making the request.
Path suffix input: <input type="text" placeholder="/your-path-here" defaultValue="/">. Appended to the vault URL. Leading slash is enforced.
"Call Vault" button: Disabled during loading. On click:
Resolve full URL: https://gateway.lend402.xyz/v/{vaultId}${pathSuffix}.
Call triggerAgent(vaultUrl) from AgentContext — the existing triggerAgent function is updated to accept an optional URL parameter that overrides the default DEFAULT_VAULT_URL.
The SSE stream from /api/trigger-agent?url={encodedVaultUrl} carries all AgentEvent objects.
The existing AgentTerminal renders all events via the existing eventToLines() mapper — no new terminal code required.
The existing TreasuryDashboard updates via the existing SET_ACTIVE_POSITION dispatch from AgentContext.
3.4.2 Terminal Output for Vault Calls
The x402 V2 wire format changes the terminal output labels. The eventToLines() function in AgentContext.tsx must be updated as part of VAULT-003 (Section 8, Implementation Task List). After the update, a vault call produces this terminal sequence:


[INFO] Requesting https://gateway.lend402.xyz/v/abc123/prices/BTC-USD/spot...
[402]  Payment Required (x402 V2)
       Resource: "Live BTC/USD Price" | Cost: $0.50 USDCx
       Merchant: SP2MER...3XYZ | Network: stacks:2147483648
[INFO] Initiating Lend402 Flash Collateralization...
[CALC] simulate-borrow pre-flight complete:
       sBTC price: $97,842.15 | Collateral ratio: 15000bps (150%)
       LOCKING 0.00000516 sBTC → ROUTING exact USDCx to merchant
       PostConditionMode.DENY active — any deviation causes atomic on-chain abort.
[BUILD] borrow-and-pay contract-call payload constructed.
        Args: amount_usdcx=500000 | collateral_sbtc=516 | merchant=SP2MER...
[SIGN]  Payload signed with agent secp256k1 key. Byte length: 412
        Encoding into X-PAYMENT header (base64, x402Version:2)...
[SEND]  X-PAYMENT header attached. Retrying request...
[RETRY] Forwarding signed payload → Gateway → Stacks mempool...
        Awaiting Nakamoto fast-block confirmation (~5 seconds)...
[CONFIRMED ✓] Nakamoto fast-block settlement verified.
               TXID: 0xabc123...ef89 | Block: #142857
[SUCCESS] Premium data retrieved. Payment settled. Agent treasury updated.
The key label changes from the current codebase are:

Terminal labels use X-PAYMENT naming end-to-end.
PAYMENT_REQUIRED_RECEIVED logs refer to the x402 V2 402 body.
The PAYMENT_REQUIRED_RECEIVED event now shows Cost: from event.data.amount_usdcx and Network: from event.data.network (these come from the 402 JSON body, not a custom header).
4. Technical Architecture
4.1 Database Schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE vaults (
  vault_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_address    VARCHAR(64) NOT NULL,
  origin_url          TEXT NOT NULL,
  price_usdcx         BIGINT NOT NULL CHECK (price_usdcx >= 1000),
  rate_limit          INTEGER NOT NULL DEFAULT 60 CHECK (rate_limit BETWEEN 1 AND 1000),
  resource_name       VARCHAR(64) NOT NULL,
  description         VARCHAR(256),
  webhook_url         TEXT,
  network             VARCHAR(32) NOT NULL DEFAULT 'stacks:1',
  asset_contract      TEXT NOT NULL DEFAULT
                      'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_calls         BIGINT NOT NULL DEFAULT 0,
  total_earned_usdcx  BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT unique_provider_origin UNIQUE (provider_address, origin_url)
);

CREATE INDEX idx_vaults_provider ON vaults(provider_address);
CREATE INDEX idx_vaults_active ON vaults(is_active) WHERE is_active = true;

CREATE TABLE calls (
  call_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id         UUID NOT NULL REFERENCES vaults(vault_id) ON DELETE RESTRICT,
  payer_address    VARCHAR(64) NOT NULL,
  txid             VARCHAR(128) NOT NULL UNIQUE,
  block_height     INTEGER,
  amount_usdcx     BIGINT NOT NULL,
  path             TEXT NOT NULL,
  method           VARCHAR(10) NOT NULL,
  origin_status    INTEGER,
  settled_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  x402_payload     JSONB
);

CREATE INDEX idx_calls_vault_id ON calls(vault_id);
CREATE INDEX idx_calls_vault_settled ON calls(vault_id, settled_at DESC);
CREATE INDEX idx_calls_payer ON calls(payer_address);
CREATE INDEX idx_calls_txid ON calls(txid);

-- Trigger to keep vaults.updated_at current
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vaults_updated_at
  BEFORE UPDATE ON vaults
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
4.2 Nonce / Idempotency Store (Redis)
Justification for Redis over Postgres: Nakamoto fast-blocks confirm in ~5 seconds. Under concurrent load, a Postgres SELECT FOR UPDATE round-trip can exceed 50ms, creating a replay attack window. Redis SET NX EX is atomic at sub-millisecond latency, eliminates the replay window, and degrades gracefully under load (Redis can sustain 100K+ ops/sec on a single node vs. Postgres's ~10K).

Key schema:

Key	Value	TTL	Purpose
settled:{txid}	{"blockHeight":N,"confirmedAt":N,"payer":"SP1..."}	86400s (24h)	Idempotency: prevent double-settlement of same tx
rate:{vault_id}:{payer}	Sorted set of millisecond timestamps	No TTL (entries expire via ZREMRANGEBYSCORE)	Sliding window rate limit
global:rps	Integer counter	60s	Global gateway rate limit
Settlement idempotency flow:


Gateway receives X-PAYMENT with signedTransaction hex
  → derive txid from transaction bytes
  → GET settled:{txid}
  → if exists: return 409 "Transaction already settled"
  → execute the Stacks settlement module
  → on settlement success:
      SET settled:{txid} {payload} EX 86400
  → proxy to origin
The settled:{txid} key is set AFTER on-chain confirmation but BEFORE proxying to origin. If the proxy fails after Redis write, the caller receives an error but the payment is confirmed. This is an acceptable tradeoff — the x402 V2 protocol does not guarantee delivery, only payment confirmation. The X-PAYMENT-RESPONSE header with success: true is the canonical signal that payment occurred.

4.3 Stacks Settlement Polling Logic
The gateway settlement module is responsible for broadcasting a signed Stacks transaction and polling for Nakamoto confirmation. It is implemented in src/lib/settlement.ts and runs in-process inside the Next.js gateway.


interface PollConfig {
  txid: string;
  network: 'stacks:2147483648' | 'stacks:1';
  maxAttempts: number;   // 10
  intervalMs: number;    // 2000
}

async function pollConfirmation(config: PollConfig): Promise<ConfirmedTx> {
  const baseUrl = config.network === 'stacks:1'
    ? 'https://api.hiro.so'
    : 'https://api.testnet.hiro.so';

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    const res = await fetch(`${baseUrl}/extended/v1/tx/${config.txid}`);
    const tx = await res.json();

    if (tx.tx_status === 'abort_by_post_condition' ||
        tx.tx_status === 'abort_by_response') {
      throw new SettlementError(`Transaction aborted: ${tx.tx_status}`, config.txid);
    }

    if (tx.tx_status === 'success' && tx.block_height > 0) {
      return {
        txid: config.txid,
        blockHeight: tx.block_height,
        confirmedAt: Math.floor(Date.now() / 1000),
        payer: tx.sender_address,
      };
    }

    await sleep(config.intervalMs);
  }

  throw new SettlementError('Confirmation timeout after 20 seconds', config.txid);
}
The settlement module broadcasts using broadcastTransaction(deserializeTransaction(signedTxHex), network) from @stacks/transactions. On broadcast success, it begins polling. On abort_by_post_condition: the payment failed on-chain — this means the agent's sBTC balance was insufficient or the post-condition amounts differed. Return HTTP 402 with {"success":false,"error":"Transaction aborted: post-condition failed","txid":"..."}.

4.4 Gateway Service Architecture
Runtime: Next.js App Router Route Handler, export const runtime = "nodejs". The nodejs runtime is required because @stacks/transactions uses Node.js crypto and Buffer. Edge runtime does not support these APIs.

Deployment target: Vercel — existing vercel.json already sets "regions": ["iad1"] (Washington D.C.), minimizing latency to Hiro API nodes (also US East).

Connection pooling: a module-level Postgres client is initialized once per process in src/lib/db.ts. The Postgres connection pool is shared across requests in the same function instance, while Redis uses ioredis in src/lib/redis.ts for rate limits and settlement idempotency.

Scalability boundary: Next.js App Router on Vercel scales horizontally per request. The Redis and Postgres layers are the scalability bottleneck. Estimated capacity at current architecture: 500–2,000 req/sec before Redis becomes the limiter. Migration path to dedicated Express service triggers when p99 latency on the gateway route exceeds 500ms under sustained load.

4.5 TypeScript Interfaces

// src/types/vault.ts

export interface Vault {
  vaultId: string;
  providerAddress: string;
  originUrl: string;
  priceUsdcx: bigint;
  rateLimit: number;
  resourceName: string;
  description: string | null;
  webhookUrl: string | null;
  network: 'stacks:1' | 'stacks:2147483648';
  assetContract: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  totalCalls: bigint;
  totalEarnedUsdcx: bigint;
}

export interface Call {
  callId: string;
  vaultId: string;
  payerAddress: string;
  txid: string;
  blockHeight: number | null;
  amountUsdcx: bigint;
  path: string;
  method: string;
  originStatus: number | null;
  settledAt: Date;
  x402Payload: X402PaymentPayload | null;
}

export interface X402PaymentPayload {
  x402Version: 2;
  scheme: 'exact';
  network: string;
  payload: {
    signedTransaction: string;
    type: 'contract_call';
  };
}

export interface X402Response {
  x402Version: 2;
  accepts: PaymentOption[];
  error: string;
}

export interface PaymentOption {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: {
    name: string;
    version: string;
  };
}

export interface SettlementRequest {
  x402Version: 2;
  scheme: 'exact';
  network: string;
  payload: {
    signedTransaction: string;
    type: 'contract_call';
  };
  resource: string;
  payTo: string;
}

export interface SettlementSuccess {
  success: true;
  txid: string;
  network: string;
  blockHeight: number;
  confirmedAt: number;
  payer: string;
}

export interface SettlementFailure {
  success: false;
  error: string;
  txid?: string;
}

export type SettlementResponse = SettlementSuccess | SettlementFailure;

export interface X402PaymentResponse {
  x402Version: 2;
  success: true;
  txid: string;
  network: string;
  scheme: 'exact';
  payer: string;
  blockHeight: number;
  confirmedAt: number;
}

export interface VaultDashboardItem extends Vault {
  recentCalls: CallFeedItem[];
}

export interface CallFeedItem {
  callId: string;
  settledAt: string;
  payerAddress: string;
  txid: string;
  txidDisplay: string;
  explorerUrl: string;
  amountUsdcx: number;
  originStatus: number | null;
  status: 'success' | 'origin_error';
}
5. API Contract Specification
All routes return Content-Type: application/json unless specified otherwise. All timestamps are ISO-8601 strings in UTC. All BIGINT amounts are USDCx in 6-decimal micro-units.

5.1 POST /api/vault/register
Authentication: X-Wallet-Signature: {base64(signature)}, X-Wallet-Address: {stacks_address}

Request body:


{
  "originUrl": "https://api.example.com/data",
  "priceUsdcx": 500000,
  "rateLimit": 60,
  "resourceName": "Example Premium Data",
  "description": "Real-time BTC/USD price feed",
  "webhookUrl": "https://mysite.com/webhook",
  "providerAddress": "SP1PROVIDER000ADDRESS",
  "signature": "base64-encoded-stacks-signature",
  "message": "Register API Vault: abc123sha256 at 1741290168"
}
Response 201:


{
  "vaultId": "550e8400-e29b-41d4-a716-446655440000",
  "wrappedUrl": "https://gateway.lend402.xyz/v/550e8400-e29b-41d4-a716-446655440000/",
  "createdAt": "2026-03-06T18:52:31.637Z"
}
Errors:

Code	Condition
400	originUrl fails validation (non-HTTPS, RFC-1918, no TLD, malformed)
400	priceUsdcx < 1000 or > 1,000,000,000
400	rateLimit < 1 or > 1000
400	resourceName > 64 chars
400	description > 256 chars
401	Wallet signature invalid or address mismatch
409	(providerAddress, originUrl) already registered
422	webhookUrl provided but fails SSRF validation
5.2 GET /api/vault/{vault_id}
Authentication: None (public).

Response 200:


{
  "vaultId": "550e8400-...",
  "resourceName": "Live BTC/USD Price",
  "description": "Real-time BTC/USD spot price from Coinbase",
  "priceUsdcx": 500000,
  "network": "stacks:2147483648",
  "asset": "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
  "totalCalls": 1247,
  "isActive": true
}
origin_url is intentionally excluded from the public response to prevent SSRF reconnaissance.

5.3 GET /api/vault/dashboard
Authentication: X-Wallet-Address + X-Wallet-Signature (see Section 3.3.1).

Response 200:


{
  "vaults": [
    {
      "vaultId": "550e8400-...",
      "resourceName": "Live BTC/USD Price",
      "wrappedUrl": "https://gateway.lend402.xyz/v/550e8400.../",
      "priceUsdcx": 500000,
      "rateLimit": 60,
      "totalCalls": 1247,
      "totalEarnedUsdcx": 623500000,
      "isActive": true,
      "createdAt": "2026-03-06T18:52:31.637Z",
      "recentCalls": [
        {
          "callId": "uuid",
          "settledAt": "2026-03-06T19:01:22.000Z",
          "payerAddress": "SP1AB...XYZ9",
          "txid": "0xabc123ef...",
          "txidDisplay": "0xabc1...ef89",
          "explorerUrl": "https://explorer.hiro.so/txid/0xabc123ef...?chain=mainnet",
          "amountUsdcx": 500000,
          "originStatus": 200,
          "status": "success"
        }
      ]
    }
  ]
}
5.4 GET|POST|PUT|DELETE /v/[vault_id]/[...path]
Authentication: None directly. Payment is the authentication.

No X-PAYMENT — Response 402:


{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "stacks:2147483648",
      "maxAmountRequired": "500000",
      "resource": "https://gateway.lend402.xyz/v/{vault_id}/prices/BTC-USD/spot",
      "description": "Real-time BTC/USD spot price from Coinbase",
      "mimeType": "application/json",
      "payTo": "SP2PROVIDER000ADDRESS",
      "maxTimeoutSeconds": 300,
      "asset": "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
      "extra": { "name": "USDCx", "version": "1" }
    }
  ],
  "error": "Payment required"
}
With valid X-PAYMENT — Response: origin response + headers:


HTTP/1.1 200 OK
Content-Type: application/json
X-PAYMENT-RESPONSE: eyJ4NDAyVmVyc2lvbiI6Miwic3VjY2VzcyI6dHJ1ZSwidHhpZCI6IjB4YWJjMTIzLi4uIiwibmV0d29yayI6InN0YWNrczoyMTQ3NDgzNjQ4Iiwic2NoZW1lIjoiZXhhY3QiLCJwYXllciI6IlNQMUFHRU5ULi4uIiwiYmxvY2tIZWlnaHQiOjE0Mjg1NywiY29uZmlybWVkQXQiOjE3NDEyOTAxNjh9

{...origin api response body...}
5.5 POST /api/vault/{vault_id}/pause and POST /api/vault/{vault_id}/unpause
Authentication: X-Wallet-Address + X-Wallet-Signature. Provider must own the vault.

Response 200:


{"vaultId":"...","isActive":false,"updatedAt":"ISO-8601"}
5.6 PATCH /api/vault/{vault_id}
Authentication: Provider-owned vault only.

Request body (all fields optional — partial update):


{
  "priceUsdcx": 750000,
  "rateLimit": 120,
  "description": "Updated description",
  "webhookUrl": "https://new-webhook.com/hook"
}
originUrl, providerAddress, network are immutable after registration.

6. UI/UX Component Specification
All new components follow existing conventions: "use client" directive, imports from @/context/AgentContext, named default export, Tailwind classes only (no inline style unless for dynamic values), dark/light mode via dark: prefix.

6.1 VaultRegistrationForm (src/components/VaultRegistrationForm.tsx)

interface VaultRegistrationState {
  originUrl: string;
  priceUsd: string;             // string to preserve decimal input
  priceUsdcxPreview: number;    // computed: Math.round(parseFloat(priceUsd) * 1e6)
  rateLimit: number;
  resourceName: string;
  description: string;
  webhookUrl: string;
  errors: Record<string, string>;
  isSubmitting: boolean;
  walletSignature: string | null;
  result: { vaultId: string; wrappedUrl: string } | null;
}
Component behavior:

useAgent() provides connectWallet, state.walletAddress, state.isConnected.
On price input change: compute priceUsdcxPreview and display both.
On submit: validate → sign → POST → handle result.
On success: dispatch AgentEvent of type "VAULT_REGISTERED" with {vaultId, wrappedUrl} via pushEvent from AgentContext. This causes the AgentTerminal to log the success.
Success state renders the wrapped URL with a large copy button, styled with GlassCard + Button from the UI library.
6.2 VaultDashboard (src/components/VaultDashboard.tsx)

interface VaultDashboardState {
  vaults: VaultDashboardItem[];
  selectedVaultId: string | null;
  snippetTab: 'curl' | 'python' | 'typescript';
  isLoading: boolean;
  authSignature: string | null;
}
Component behavior:

On mount: check localStorage for cached auth signature (max 1h old). If stale or absent: trigger openSignatureRequestPopup. On signature: GET /api/vault/dashboard with X-Wallet-Address and X-Wallet-Signature headers.
Renders a list of VaultCard subcomponents, one per vault.
Selected vault shows expanded call feed and code snippet generator.
Live feed polls GET /api/vault/{id} every 30 seconds (no WebSockets required for MVP).
On new call detected: dispatch AgentEvent type "VAULT_CALL_RECEIVED" via pushEvent — this logs to the AgentTerminal.
Reuses GlassCard for the vault card container, Pill from Chip.tsx for status badges, and Button for copy/action buttons.
6.3 VaultCallInput (src/components/VaultCallInput.tsx)

interface VaultCallInputState {
  vaultIdOrUrl: string;
  pathSuffix: string;
  isLoading: boolean;
  lastError: string | null;
}
Component behavior:

Normalizes vaultIdOrUrl to full URL:

function resolveVaultUrl(input: string, path: string): string {
  const trimmed = input.trim();
  const base = trimmed.startsWith('http')
    ? trimmed.replace(/\/$/, '')
    : `https://gateway.lend402.xyz/v/${trimmed}`;
  return `${base}${path.startsWith('/') ? path : '/' + path}`;
}
On submit: calls triggerAgent(resolvedUrl) from AgentContext. The triggerAgent function in AgentContext.tsx must accept an optional url: string parameter to override the default DEFAULT_VAULT_URL.
Button shows loading spinner while agent is running (isAgentRunning.current === true).
On error: sets lastError and renders an error chip below the input.
Styled with GlassCard wrapper, Button for submit, identical neo-brutalist aesthetic as the existing TriggerButton in page.tsx.
6.4 New AgentEventType Values
The following types are added to AgentEventType in src/context/AgentContext.tsx:


export type AgentEventType =
  | "REQUEST_SENT"
  | "PAYMENT_REQUIRED_RECEIVED"
  | "SIMULATE_BORROW_OK"
  | "TX_BUILT"
  | "TX_SIGNED"
  | "PAYMENT_HEADER_ATTACHED"
  | "REQUEST_RETRIED"
  | "PAYMENT_CONFIRMED"
  | "DATA_RETRIEVED"
  | "VAULT_REGISTERED"       // NEW
  | "VAULT_CALL_RECEIVED"    // NEW
  | "ERROR";
New entries in eventToLines():


case "VAULT_REGISTERED":
  return [{
    id: lineId(), timestamp: ts, level: "success",
    text: `[VAULT] API Vault registered. ID: ${event.data.vaultId} → ${event.data.wrappedUrl}`,
    data: event.data,
  }];

case "VAULT_CALL_RECEIVED":
  return [{
    id: lineId(), timestamp: ts, level: "confirm",
    text: `[VAULT] Incoming call | payer: ${(event.data.payer as string).slice(0, 8)}... | txid: ${(event.data.txid as string).slice(0, 10)}... | +${((event.data.amountUsdcx as number) / 1_000_000).toFixed(4)} USDCx`,
    data: event.data,
  }];
6.5 New Pages
src/app/vault/new/page.tsx


export default function VaultNewPage() {
  return (
    <AgentProvider>
      <main>
        <VaultRegistrationForm />
      </main>
    </AgentProvider>
  );
}
src/app/vault/dashboard/page.tsx


export default function VaultDashboardPage() {
  return (
    <AgentProvider>
      <main>
        <VaultDashboard />
      </main>
    </AgentProvider>
  );
}
Navigation links in Header component (in page.tsx):

Add <a href="/vault/new">Register API</a> and <a href="/vault/dashboard">My Vaults</a> to the header nav, styled as ghost Button variants.
7. Security & Trust Model
7.1 SSRF Prevention
All URL inputs (originUrl, webhookUrl) are validated against the following blocklist before any network request is made. Validation runs both client-side (on blur, for UX) and server-side (authoritative).

Blocked conditions:


import { isIP } from 'net';
import { parse as parseUrl } from 'url';

function validateNoSsrf(rawUrl: string): void {
  const { hostname, protocol } = parseUrl(rawUrl);

  if (protocol !== 'https:') {
    throw new ValidationError('URL must use HTTPS');
  }

  if (!hostname || !hostname.includes('.')) {
    throw new ValidationError('URL must have a valid hostname with TLD');
  }

  // Block localhost and common internal hostnames
  if (/^(localhost|internal|intranet|corp)$/i.test(hostname)) {
    throw new ValidationError('Private hostname not allowed');
  }

  // If hostname resolves to an IP, check for private ranges
  // Note: DNS resolution is NOT performed at validation time (prevents TOCTOU)
  // Instead, IP-like hostnames are pattern-matched:
  const ipVersion = isIP(hostname);
  if (ipVersion === 4) {
    const parts = hostname.split('.').map(Number);
    if (
      parts[0] === 10 ||
      (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
      (parts[0] === 192 && parts[1] === 168) ||
      parts[0] === 127 ||
      (parts[0] === 169 && parts[1] === 254) ||
      parts[0] === 0
    ) throw new ValidationError('Private IP addresses not allowed');
  }

  if (ipVersion === 6) {
    if (hostname === '::1' || hostname.startsWith('fc') || hostname.startsWith('fd')) {
      throw new ValidationError('Private IPv6 addresses not allowed');
    }
  }
}
A test request is never made to the origin URL at registration time. Doing so would expose internal network topology to the registrant and trigger rate limits or alerts on the origin server.

7.2 Malicious Origin Post-Payment
The x402 V2 protocol provides payment proof, not delivery guarantee. After a payment is confirmed on-chain, the gateway proxies to origin. If the origin returns a non-2xx status:

The response is returned verbatim to the caller.
X-PAYMENT-RESPONSE is still attached with success: true — because the payment IS confirmed.
X-LEND402-WARNING: origin_error header is attached.
AgentTerminal displays: [WARN] Payment confirmed (txid: 0xabc...) but origin returned {status}. Contact provider: {resourceName}.
The calls table records origin_status: {non-200 status} for provider accountability.
Future mitigation (v2): A Clarity escrow contract that holds USDCx for one block before releasing to the provider, with a dispute function callable by the payer with the gateway's X-LEND402-WARNING header as evidence.

7.3 Replay Attack Prevention
Standard x402 V2 does not include a nonce in the 402 body. Replay prevention is layered:

Transaction ID idempotency (primary): The signed Stacks transaction contains the nonce in the transaction body (sequence number + sender address + payload hash). Two calls with the same signedTransaction hex will have the same txid. The Redis key settled:{txid} prevents double-settlement at the gateway layer.

On-chain protection (secondary): PostConditionMode.DENY causes the Stacks node to reject the transaction if the on-chain state differs from what the post-conditions declare (e.g., if the agent's sBTC balance changed between signing and broadcasting). Stacks nodes also reject transactions with duplicate nonces from the same sender.

Timeout (tertiary): maxTimeoutSeconds: 300 in the 402 body signals to conformant x402 clients to discard challenges older than 300 seconds. The settled:{txid} Redis key has a 24-hour TTL, covering the window where a replay might be attempted after the challenge expires.

7.4 Provider Address Ownership
@stacks/encryption verifyMessageSignatureRsv verifies the secp256k1 ECDSA signature over the SHA-256 hash of the message string. The verification derives the public key from the signature and message, then derives the Stacks address from the public key using the standard P2PKH derivation. If the derived address matches providerAddress, the signature is valid. This is cryptographic proof of private key ownership — equivalent to Ethereum's eth_sign / EIP-191. No on-chain transaction is required.

7.5 Gateway → Origin Trust
The gateway adds X-Forwarded-For: {callerIp} to the origin request. The gateway strips Authorization headers from the inbound request before forwarding — the gateway has no knowledge of the origin API's credentials. If the origin API requires authentication, the provider must configure the gateway to inject a secret via an environment variable:

MVP: No per-vault origin authentication. The origin API must be publicly accessible (no API key) — the Lend402 gateway IS the access control layer. The provider configures their origin to accept requests from gateway.lend402.xyz (by IP allowlist or X-Forwarded-For header).

v1.1 (post-MVP): Per-vault originApiKey field (encrypted at rest using application-managed secrets), injected as Authorization: Bearer {key} on the proxied request.

8. x402 V2 Compliance Checklist
Every item must be verified by the implementing engineer before marking the feature complete. This checklist is binary — pass or fail.

#	Requirement	Test Method
1	402 response body contains x402Version: 2	curl -s gateway/.../path → jq .x402Version equals 2
2	402 response body contains accepts array with at least one item	`jq '.accepts
3	Each PaymentOption contains all 9 required fields: scheme, network, maxAmountRequired, resource, description, mimeType, payTo, maxTimeoutSeconds, asset	`jq '.accepts[0]
4	asset is a fully-qualified SIP-010 contract ID ({address}.{name})	`echo $asset
5	Payment request uses X-PAYMENT header	Agent request log shows X-PAYMENT header
6	X-PAYMENT value decodes to JSON with x402Version, scheme, network, payload fields	base64 -d <<< $header | jq .x402Version equals 2
7	payload.type equals "contract_call" for Lend402 flows	jq .payload.type equals "contract_call"
8	Settlement request matches Section 0.5: contains x402Version, scheme, network, payload, resource, payTo	Integration test asserts request body shape
9	Settlement receipt contains success: true, txid, network, blockHeight, confirmedAt, payer	Integration test asserts response shape
10	Success response includes X-PAYMENT-RESPONSE header	curl -I gateway/.../path -H "X-PAYMENT: ..." shows header
11	X-PAYMENT-RESPONSE decodes to JSON with x402Version: 2 and success: true	base64 -d <<< $header | jq .success equals true
12	agent-client.ts uses the shared x402 codec in src/lib/x402.ts	grep "from '../src/lib/x402'" server/agent-client.ts matches
13	No external settlement service remains in runtime code	Runtime audit shows settlement is handled in src/lib/settlement.ts
14	All CAIP-2 strings use stacks:1 or stacks:2147483648 exactly	grep -r "stacks:" src/ shows no non-standard variants
15	AgentTerminal shows "X-PAYMENT header attached"	Manual UI test: trigger agent run → inspect terminal output
9. Launch & Pitch Strategy
9.1 60-Second Live Demo Script
All interactions occur on lend402.xyz. No terminal, no CLI, no code editing.

Time	Action	Expected State
T+0s	Open lend402.xyz	Treasury panel shows 0.001547 sBTC, $0.00 USDCx
T+5s	Navigate to /vault/new	Registration form visible, wallet connect button active
T+8s	Click "Connect Wallet" → Leather wallet opens	Wallet address appears in header
T+15s	Fill form: Origin URL = https://api.coinbase.com/v2/prices/BTC-USD/spot, Price = $0.50, Rate limit = 60, Resource name = "Live BTC/USD Price", Description = "Real-time spot price data from Coinbase"	Form fields populated, USDCx preview shows 500,000 μUSDCx
T+22s	Click "Register Vault" → Leather sign prompt	Signing message shown in wallet: "Register API Vault: {sha256} at {ts}"
T+25s	Approve signature in wallet	Vault registered, wrapped URL displayed and auto-copied
T+30s	Navigate to main dashboard	VaultCallInput visible below FlowDiagram
T+33s	Paste vault_id, set path to /v2/prices/BTC-USD/spot, click "Call Vault"	Terminal begins logging
T+35s	Watch terminal	[INFO] Requesting https://gateway.lend402.xyz/v/{id}/...
T+36s		[402] Payment Required (x402 V2). Cost: $0.50 USDCx
T+37s		[INFO] Initiating Lend402 Flash Collateralization...
T+38s		[CALC] simulate-borrow: locking 0.00000516 sBTC → routing $0.50 USDCx
T+39s		[BUILD] borrow-and-pay payload constructed
T+40s		[SIGN] Signed. X-PAYMENT header attached.
T+41s		[RETRY] Forwarding → Gateway → Stacks mempool...
T+43s		[CONFIRMED ✓] Block #142857 | txid: 0xabc123...
T+44s		[SUCCESS] BTC/USD: $97,842.15 | Provider received $0.50 USDCx
T+46s	Treasury dashboard updates	0.00000516 sBTC locked, active position shown
T+48s	Click txid in terminal	Hiro explorer opens: borrow-and-pay tx visible
T+52s	Navigate to /vault/dashboard	Vault shows: 1 call, +$0.50 USDCx earned
T+56s	Click TypeScript tab on code snippet	Copy-paste snippet shown with vault_id pre-filled
T+60s	Copy snippet	Demo complete
9.2 Three-Bullet Pitch
Turn any HTTPS API into a pay-per-call endpoint in 60 seconds.
AI agents pay from sBTC treasury — no USDCx pre-loading required.
Every payment is an on-chain txid — no invoices, no black boxes.
9.3 One-Sentence Pitch
"Lend402 API Vault is Stripe for AI agent APIs — any developer monetizes their endpoint per-call without API keys, and any AI agent pays from sBTC collateral without holding stablecoins, with every payment cryptographically verifiable on Stacks."

IMPLEMENTATION TASK LIST
Tasks are listed in strict dependency order. No task may begin until all listed dependencies are marked complete. Complexity estimates assume a senior engineer with Stacks/TypeScript experience.

Phase 0 — x402 V2 Migration (Mandatory First)
VAULT-001
Title: Refactor agent-client.ts to x402 V2 wire format
Description:

Use the shared x402 V2 codec in src/lib/x402.ts and keep it wire-compatible with x402-stacks.
Use X-PAYMENT as the request header name.
Read the x402 challenge from the 402 response body's accepts[0] field.
The withPaymentInterceptor entrypoint in agent-client.ts must remain wire-compatible with x402-stacks; the Lend402-specific simulate-borrow pre-flight and PostConditionMode.DENY post-conditions remain as the inner Lend402 extension layer.
Update the shared x402 types to match the X-PAYMENT and X-PAYMENT-RESPONSE JSON schemas (Sections 0.3 and 0.4).
Remove all legacy payment header constants and types.
Acceptance Criteria:

server/agent-client.ts sends X-PAYMENT header on 402 intercept.
The X-PAYMENT value base64-decodes to JSON matching {"x402Version":2,"scheme":"exact","network":"stacks:2147483648","payload":{"signedTransaction":"...","type":"contract_call"}}.
The interceptor reads the payment challenge from the 402 response JSON body's accepts[0] field, not from a response header.
Unit test: mock server returns 402 with x402 V2 JSON body → agent SDK retries with X-PAYMENT header → header validates against x402 V2 schema.
Legacy payment header names no longer appear in server/agent-client.ts.
Dependencies: None
Complexity: M (2–8 hours)

VAULT-002
Title: Refactor gateway settlement to x402 V2 wire format
Description:

Replace any legacy header-only challenge flow: return HTTP 402 with x402 V2 JSON body (Section 0.2).
Replace external settlement forwarding with the in-process Stacks settlement module.
Update the settlement request body to Section 0.5 wire format: {x402Version:2, scheme:"exact", network:"...", payload:{signedTransaction:"...",type:"contract_call"}, resource:"...", payTo:"..."}.
Update the settlement success response to Section 0.5: {success:true, txid:"...", network:"...", blockHeight:N, confirmedAt:N, payer:"SP1..."}.
Update settlement failure response: {success:false, error:"...", txid:"..."}.
Replace PAYMENT_RESPONSE_HEADER = "payment-response" with X-PAYMENT-RESPONSE header name.
The X-PAYMENT-RESPONSE value must conform to Section 0.4 JSON schema.
Acceptance Criteria:

curl -s https://gateway.lend402.xyz/v/{vault_id}/ | jq .x402Version returns 2.
curl -s https://gateway.lend402.xyz/v/{vault_id}/ | jq '.accepts | length' returns 1.
curl -s https://gateway.lend402.xyz/v/{vault_id}/ | jq '.accepts[0] | keys' returns all 9 required fields.
Integration test: valid X-PAYMENT header → settlement → success → X-PAYMENT-RESPONSE header present on response.
Runtime code contains no external settlement-service references.
Runtime code contains no legacy payment challenge header constants.
Dependencies: VAULT-001
Complexity: M (2–8 hours)

VAULT-003
Title: Update AgentTerminal eventToLines() for x402 V2 terminal labels
Description:

In src/context/AgentContext.tsx, update the eventToLines() function:
PAYMENT_REQUIRED_RECEIVED case: reference the x402 V2 402 body and show network from event.data.
TX_SIGNED case: show "Encoding into X-PAYMENT header (base64, x402Version:2)".
PAYMENT_HEADER_ATTACHED case: show "X-PAYMENT header attached".
Add two new event types to AgentEventType: "VAULT_REGISTERED" and "VAULT_CALL_RECEIVED".
Add eventToLines() cases for both new types (text specified in Section 6.4).
Update pushEvent switch to dispatch correct phase transitions for new event types (both are informational — no phase change required).
Acceptance Criteria:

Manual UI test: trigger agent run → terminal shows "X-PAYMENT header attached".
Manual UI test: terminal PAYMENT_REQUIRED_RECEIVED output shows "x402 V2".
TypeScript: AgentEventType includes "VAULT_REGISTERED" and "VAULT_CALL_RECEIVED".
Legacy payment header names no longer appear in src/context/AgentContext.tsx.
Dependencies: VAULT-001, VAULT-002
Complexity: S (< 2 hours)

Phase 1 — Infrastructure Setup
VAULT-004
Title: Provision Railway Postgres and apply schema migrations
Description:

Create a Railway Postgres service for Lend402.
Run SQL migrations for vaults and calls tables (Section 4.1).
Configure Row Level Security: vaults readable by all, writable only by authenticated service role. calls readable by service role only.
Set DATABASE_URL environment variable in .env.local and Vercel project settings.
Create src/lib/db.ts exporting a typed Postgres query layer using DATABASE_URL.
Acceptance Criteria:

SELECT COUNT(*) FROM vaults returns 0 (empty, no error).
INSERT INTO vaults (provider_address, origin_url, price_usdcx, rate_limit, resource_name) VALUES ('SP1...', 'https://example.com', 500000, 60, 'Test') succeeds.
TypeScript: import { db } from '@/lib/db' resolves without error.
npx tsc --noEmit passes with db.ts in scope.
Dependencies: None
Complexity: S (< 2 hours)

VAULT-005
Title: Provision Redis instance and implement client singleton
Description:

Configure Upstash Redis (or self-hosted Redis) for the project.
Set REDIS_URL and REDIS_TOKEN environment variables in .env.local and Vercel.
Create src/lib/redis.ts exporting an ioredis client singleton (re-used across requests in the same Vercel function instance).
Implement helper functions: setSettled(txid, payload), getSettled(txid), checkAndIncrRateLimit(vaultId, payerAddress, limit).
Acceptance Criteria:

await redis.set('test', 'ok', 'EX', 5) then await redis.get('test') returns 'ok'.
setSettled('0xabc', {blockHeight:1}) then getSettled('0xabc') returns the payload.
checkAndIncrRateLimit('vault1', 'SP1...', 60) returns {allowed: true, count: 1} on first call.
TypeScript: import { redis } from '@/lib/redis' resolves without error.
Dependencies: None
Complexity: S (< 2 hours)

VAULT-006
Title: Add environment variables to .env.local.example and Vercel config
Description:

Add to .env.local.example:

DATABASE_URL=
REDIS_URL=
REDIS_TOKEN=
GATEWAY_BASE_URL=https://gateway.lend402.xyz
DEFAULT_VAULT_URL=https://gateway.lend402.xyz/v/{vault_id}/
Update vercel.json to reference environment variables for production build.
Update README.md setup instructions to include Railway Postgres and Railway Redis provisioning steps.
Acceptance Criteria:

.env.local.example contains all 6 new variables with comments.
npx next dev with .env.local populated starts without missing-env errors.
README.md contains step-by-step Railway Postgres and Railway Redis setup instructions.
Dependencies: VAULT-004, VAULT-005
Complexity: S (< 2 hours)

Phase 2 — API Routes
VAULT-007
Title: Implement POST /api/vault/register route
Description:

Create src/app/api/vault/register/route.ts.
Implement SSRF validation for originUrl and webhookUrl (Section 7.1).
Implement @stacks/encryption verifyMessageSignatureRsv check.
Implement address derivation from public key and comparison with providerAddress.
Insert into vaults table via the Postgres query layer.
Return 201 with {vaultId, wrappedUrl, createdAt}.
Return 400/401/409/422 with {error: string} on failure.
Acceptance Criteria:

POST /api/vault/register with valid payload and signature returns 201 with vaultId UUID.
POST with originUrl: "http://192.168.1.1/data" returns 400.
POST with originUrl: "http://example.com" (not HTTPS) returns 400.
POST with invalid wallet signature returns 401.
Duplicate (providerAddress, originUrl) returns 409.
Inserted row visible in SELECT * FROM vaults WHERE vault_id = '{returned_id}'.
Dependencies: VAULT-004, VAULT-005
Complexity: M (2–8 hours)

VAULT-008
Title: Implement GET /api/vault/{vault_id} public metadata route
Description:

Create src/app/api/vault/[vault_id]/route.ts.
Query vaults by vault_id. Return 404 if not found or is_active = false.
Return 200 with public-safe vault fields (no origin_url exposure).
Cache response for 10 seconds with Cache-Control: public, max-age=10.
Acceptance Criteria:

GET /api/vault/{valid_id} returns 200 with vaultId, resourceName, priceUsdcx, network, isActive, totalCalls.
Response does NOT contain originUrl field.
GET /api/vault/{invalid_id} returns 404.
Response headers include Cache-Control: public, max-age=10.
Dependencies: VAULT-004
Complexity: S (< 2 hours)

VAULT-009
Title: Implement GET /api/vault/dashboard authenticated route
Description:

Create src/app/api/vault/dashboard/route.ts.
Validate X-Wallet-Address and X-Wallet-Signature headers using verifyMessageSignatureRsv.
Query all vaults for the authenticated providerAddress.
For each vault: join last 10 calls from calls table ordered by settled_at DESC.
Return {vaults: VaultDashboardItem[]}.
Acceptance Criteria:

GET /api/vault/dashboard with valid auth headers returns {vaults: [...]} for the authenticated address.
GET /api/vault/dashboard with invalid signature returns 401.
GET /api/vault/dashboard with a different address's signature returns {vaults: []} (empty, not 403).
Each vault item includes recentCalls array with at most 10 items.
Dependencies: VAULT-004, VAULT-007
Complexity: M (2–8 hours)

VAULT-010
Title: Implement PATCH /api/vault/{vault_id} and pause/unpause routes
Description:

Create src/app/api/vault/[vault_id]/route.ts (extends VAULT-008 file).
PATCH: validate auth, validate ownership, apply partial update (only priceUsdcx, rateLimit, description, webhookUrl are mutable). Return updated vault.
POST /api/vault/{vault_id}/pause: set is_active = false.
POST /api/vault/{vault_id}/unpause: set is_active = true.
All mutating routes require authenticated provider ownership.
Acceptance Criteria:

PATCH /api/vault/{id} with {priceUsdcx: 750000} updates price_usdcx in DB.
PATCH from non-owner address returns 403.
PATCH with originUrl in body returns 400 (immutable field).
POST /api/vault/{id}/pause sets is_active = false; gateway subsequently returns 404 for that vault.
Dependencies: VAULT-007, VAULT-008
Complexity: S (< 2 hours)

VAULT-011
Title: Implement gateway proxy — Path A (issue 402)
Description:

Create src/app/v/[vault_id]/[...path]/route.ts.
Look up vault from Postgres by vault_id.
Return 404 if not found or inactive.
Return HTTP 402 with x402 V2 JSON body (Section 3.2.1), including all 9 PaymentOption fields.
resource field must be the full inbound request URL (including path and query string).
maxAmountRequired must be the vault's price_usdcx as a string.
payTo must be vault.provider_address.
Acceptance Criteria:

curl -s https://gateway.lend402.xyz/v/{id}/test returns HTTP 402.
Response body jq .x402Version equals 2.
Response body jq '.accepts | length' equals 1.
Response body jq '.accepts[0].resource' equals the exact request URL.
Response body jq '.accepts[0] | keys | sort' equals ["asset","description","extra","maxAmountRequired","maxTimeoutSeconds","mimeType","network","payTo","scheme"].
curl -s https://gateway.lend402.xyz/v/{nonexistent} returns HTTP 404.
Dependencies: VAULT-004, VAULT-007
Complexity: M (2–8 hours)

VAULT-012
Title: Implement gateway proxy — Path B (settle and proxy)
Description:

Extend src/app/v/[vault_id]/[...path]/route.ts to handle X-PAYMENT header.
Decode and validate X-PAYMENT (Section 3.2.2, steps 1–6).
Derive payer address from deserializeTransaction(signedTxHex).auth.spendingCondition.signer.
Apply rate limiting via Redis sliding window (VAULT-005).
Check idempotency via getSettled(txid) — return 409 if already settled.
Execute the in-process settlement module with the x402 V2 Section 0.5 body.
On success: setSettled(txid, ...), insert to calls, increment vault counters atomically.
Proxy to origin (VAULT-013).
Attach X-PAYMENT-RESPONSE header.
Return origin response.
Acceptance Criteria:

Valid X-PAYMENT → settlement succeeds → origin proxied → X-PAYMENT-RESPONSE present on response.
Second request with same signedTransaction hex → 409 "Transaction already settled".
Rate limit exceeded → 429 with retryAfterMs field.
Call recorded in calls table after successful settlement.
vaults.total_calls incremented by 1.
vaults.total_earned_usdcx incremented by vault.price_usdcx.
Dependencies: VAULT-005, VAULT-011, VAULT-013, VAULT-002
Complexity: L (1–2 days)

VAULT-013
Title: Implement origin proxy with header sanitization and timeout
Description:

Implement proxyToOrigin(vault, request, callerIp) utility in src/lib/gateway.ts.
Strip x-payment, host, authorization from forwarded headers.
Add x-forwarded-for: {callerIp}.
Preserve HTTP method, query parameters, and request body verbatim.
Timeout: 30 seconds via AbortController.
On non-2xx from origin: return origin response with X-LEND402-WARNING: origin_error header.
Acceptance Criteria:

Proxy to origin preserves query string: /v/{id}/search?q=btc → origin receives ?q=btc.
Proxy to origin does not forward x-payment header — origin request log shows no x-payment.
Proxy to origin does not forward authorization header.
Origin timeout of 30 seconds causes gateway to return 504 {"error":"Origin timeout"}.
POST request with JSON body → origin receives identical body.
Dependencies: VAULT-004
Complexity: M (2–8 hours)

Phase 3 — Frontend Components
VAULT-014
Title: Implement VaultRegistrationForm component
Description:

Create src/components/VaultRegistrationForm.tsx.
Implement all form fields, validation, and submission flow (Section 6.1).
Integrate @stacks/connect openSignatureRequestPopup for wallet signature.
Display USDCx micro-units preview next to USD price input.
On success: dispatch "VAULT_REGISTERED" via pushEvent from AgentContext.
Render success state with wrapped URL and copy button.
Acceptance Criteria:

Submitting with originUrl: "http://example.com" (not HTTPS) shows inline validation error, does not POST.
Submitting with wallet disconnected shows "Connect wallet first" error.
Successful submit: terminal logs [VAULT] API Vault registered. ID: {id}.
Wrapped URL displayed in success state matches https://gateway.lend402.xyz/v/{uuid}/.
Copy button copies full wrapped URL to clipboard.
npx tsc --noEmit passes with this component in scope.
Dependencies: VAULT-003, VAULT-007
Complexity: M (2–8 hours)

VAULT-015
Title: Implement VaultDashboard component
Description:

Create src/components/VaultDashboard.tsx.
Implement wallet signature authentication with 1-hour localStorage cache (Section 3.3.1).
Fetch from GET /api/vault/dashboard on mount.
Render vault cards with all fields specified in Section 3.3.2.
Render call feed with clickable txid links to Hiro explorer.
Render code snippet generator with 3 tabs (curl, Python, TypeScript).
Poll for updates every 30 seconds.
On new call: dispatch "VAULT_CALL_RECEIVED" via pushEvent.
Acceptance Criteria:

Unauthenticated load triggers wallet signature prompt.
Stale signature (> 1 hour) triggers re-authentication prompt.
Vault card shows correct total_calls, total_earned_usdcx, and isActive status.
Txid link in call feed opens correct Hiro explorer URL.
Code snippet TypeScript tab shows correct vault_id and provider_address pre-populated.
npx tsc --noEmit passes with this component in scope.
Dependencies: VAULT-003, VAULT-009
Complexity: M (2–8 hours)

VAULT-016
Title: Implement VaultCallInput component
Description:

Create src/components/VaultCallInput.tsx.
Implement URL normalization (UUID or full URL input → full URL).
Update triggerAgent in AgentContext.tsx to accept optional url: string parameter, overriding default DEFAULT_VAULT_URL.
Update /api/trigger-agent/route.ts to read optional url query parameter.
Wire "Call Vault" button to triggerAgent(resolvedUrl).
Render loading state while agent is running.
Acceptance Criteria:

Entering abc123-uuid → resolves to https://gateway.lend402.xyz/v/abc123-uuid/.
Entering full URL https://gateway.lend402.xyz/v/abc123/ → used as-is.
Path suffix /prices/BTC-USD/spot appended correctly.
Click "Call Vault" → terminal begins logging SSE events from the gateway.
Terminal shows x402 V2 labels ("X-PAYMENT", "x402 V2 402 body").
npx tsc --noEmit passes.
Dependencies: VAULT-003, VAULT-011, VAULT-012
Complexity: M (2–8 hours)

VAULT-017
Title: Create /vault/new and /vault/dashboard pages and add navigation
Description:

Create src/app/vault/new/page.tsx wrapping VaultRegistrationForm in AgentProvider.
Create src/app/vault/dashboard/page.tsx wrapping VaultDashboard in AgentProvider.
Add navigation links to Header component in page.tsx: "Register API" → /vault/new, "My Vaults" → /vault/dashboard.
Apply consistent layout (same glassmorphism Header, footer metadata bar) to both new pages.
Acceptance Criteria:

GET /vault/new returns 200, renders registration form.
GET /vault/dashboard returns 200, renders dashboard (triggers auth on load).
Header on both pages shows "Register API" and "My Vaults" links.
Links navigate correctly without full page reload.
npx next build passes with zero type errors.
Dependencies: VAULT-014, VAULT-015
Complexity: S (< 2 hours)

VAULT-018
Title: Add VaultCallInput to main page.tsx
Description:

Import and render VaultCallInput in src/app/page.tsx, positioned below the FlowDiagram section and above the AgentTerminal.
Wrap in a GlassCard with label "Call a Vault".
Ensure AgentProvider wraps both VaultCallInput and the existing terminal/dashboard.
Acceptance Criteria:

VaultCallInput visible on lend402.xyz main page below the flow diagram.
Using the input triggers SSE events that appear in the existing AgentTerminal.
TreasuryDashboard updates after a successful vault call.
npx next build passes.
Dependencies: VAULT-016, VAULT-017
Complexity: S (< 2 hours)

Phase 4 — Integration, Testing, and Hardening
VAULT-019
Title: End-to-end integration test: register vault → call vault → verify settlement
Description:

Write a Node.js integration test script in tests/e2e/vault-flow.ts.
Steps: register vault via POST /api/vault/register → get vaultId → call gateway without X-PAYMENT → assert 402 x402 V2 body → call gateway with valid X-PAYMENT → assert 200 + X-PAYMENT-RESPONSE → assert calls table has 1 record → assert vaults.total_calls === 1.
Run against local environment with STACKS_NETWORK=mainnet (or explicit testnet override during pre-production validation).
Acceptance Criteria:

npx ts-node tests/e2e/vault-flow.ts exits with code 0.
All 8 assertions pass.
Test takes under 30 seconds total.
Dependencies: VAULT-001, VAULT-002, VAULT-007, VAULT-011, VAULT-012
Complexity: M (2–8 hours)

VAULT-020
Title: Implement webhook delivery with retry
Description:

Implement async webhook delivery in src/lib/webhook.ts.
Fire-and-forget: does not block gateway response.
Retry once on failure after 2-second delay.
Log delivery result (success/failure) to calls table webhook_delivered boolean column (add migration).
Validate webhookUrl passes SSRF check before delivery (defense-in-depth — already validated at registration, but re-check at delivery).
Acceptance Criteria:

Valid webhookUrl receives POST with {"event":"call.settled","vaultId":"...","txid":"...","payer":"...","amountUsdcx":N,"timestamp":"..."} within 5 seconds of settlement.
Invalid webhook URL (network error) does not cause gateway to return error to caller.
Second attempt fires 2 seconds after first failure.
calls.webhook_delivered is true on success, false on failure.
Dependencies: VAULT-012
Complexity: S (< 2 hours)

VAULT-021
Title: Implement global gateway rate limit
Description:

In the gateway route handler, before all other processing: increment global:rps counter in Redis.
If counter > 10,000 in the current 60-second window: return 503 {"error":"Gateway rate limit exceeded. Retry after 60 seconds."} with Retry-After: 60 header.
Counter resets every 60 seconds via Redis EXPIRE.
Acceptance Criteria:

Normal traffic (< 10,000 req/min) — no 503 responses.
Load test: simulated 10,001st request in same minute returns 503 with Retry-After: 60.
After 60-second window reset: requests succeed again.
Dependencies: VAULT-005, VAULT-011
Complexity: S (< 2 hours)

VAULT-022
Title: Add SSRF validator utility and unit tests
Description:

Create src/lib/ssrf.ts exporting validateNoSsrf(url: string): void (Section 7.1).
Write unit tests in tests/unit/ssrf.test.ts covering all blocked cases.
Integrate into both POST /api/vault/register (VAULT-007) and webhook delivery (VAULT-020).
Acceptance Criteria:

validateNoSsrf("http://192.168.1.1") throws.
validateNoSsrf("http://10.0.0.1/data") throws.
validateNoSsrf("https://example.com") does not throw.
validateNoSsrf("https://localhost/data") throws.
validateNoSsrf("http://example.com") throws (not HTTPS).
All unit tests pass: npx vitest run tests/unit/ssrf.test.ts.
Dependencies: None
Complexity: S (< 2 hours)

VAULT-023
Title: x402 V2 compliance checklist verification
Description:

Run through all 15 items in Section 8.
Fix any failing items.
Document results in docs/x402-compliance.md.
Acceptance Criteria:

All 15 checklist items pass (binary: all or nothing).
docs/x402-compliance.md exists with each item marked [PASS] and the command/method used to verify it.
Dependencies: VAULT-001, VAULT-002, VAULT-003, VAULT-012, VAULT-019
Complexity: M (2–8 hours)

VAULT-024
Title: Production deployment to Vercel with Railway Postgres and Railway Redis wired
Description:

Set all environment variables in Vercel project settings: DATABASE_URL, REDIS_URL, DEFAULT_VAULT_URL, NEXT_PUBLIC_GATEWAY_BASE_URL, LEND402_VAULT_CONTRACT_ID, NEXT_PUBLIC_LEND402_VAULT_CONTRACT_ID, LEND402_AGENT_PRIVATE_KEY, LEND402_AGENT_ADDRESS, STACKS_NETWORK, NEXT_PUBLIC_STACKS_NETWORK.
Deploy to production: git push origin main → Vercel build passes.
Verify lend402.xyz/vault/new loads and form is functional.
Verify lend402.xyz main page loads with VaultCallInput visible.
Run end-to-end test against production environment.
Acceptance Criteria:

vercel build exits with code 0.
curl https://lend402.xyz/vault/new returns HTTP 200.
curl https://gateway.lend402.xyz/v/{test_vault_id}/test returns HTTP 402 with x402 V2 body.
Full demo script (Section 9.1) completes successfully in production.
Dependencies: VAULT-023, VAULT-019
Complexity: M (2–8 hours)

Summary
Phase	Tasks	Total Complexity
0 — x402 V2 Migration	VAULT-001, 002, 003	3M + 1S
1 — Infrastructure	VAULT-004, 005, 006	2S + 1S
2 — API Routes	VAULT-007, 008, 009, 010, 011, 012, 013	4M + 2S + 1L
3 — Frontend	VAULT-014, 015, 016, 017, 018	3M + 2S
4 — Integration & Hardening	VAULT-019, 020, 021, 022, 023, 024	3M + 3S
Total	24 tasks	~22 engineer-days
