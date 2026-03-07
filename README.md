# Lend402

Lend402 is the Stacks-native payment and credit rail for agentic APIs.

The fastest way to understand it is: think Stripe for paid agent calls, except the request itself is the payment surface. A provider wraps an API behind x402, an agent presents a signed Stacks payment, and Lend402 can finance that request just in time with `sBTC` collateral and `USDCx` liquidity before the origin response is released.

## What It Does

- Turns any HTTPS endpoint into a paid Stacks-native x402 endpoint.
- Lets an agent hold `sBTC`, borrow exactly the `USDCx` needed for a request, and settle that request on-chain in a single flow.
- Gives providers a dashboard to register endpoints, share wrapped URLs, monitor calls, and track `USDCx` revenue.
- Persists vault and call data in Postgres and uses Redis for rate limiting and settlement idempotency.

## Why It Exists

Most paid APIs still assume a human operator, a credit card, and an API key. That breaks down for autonomous software.

AI agents can fetch data and take actions, but they still need:

- per-request payment instead of monthly billing
- a credit mechanism so they do not need to keep every asset pre-funded
- a settlement rail that is verifiable, programmable, and Bitcoin-aligned

Lend402 addresses that by combining x402, Clarity, `sBTC`, and `USDCx` on Stacks.

## End-to-End Flow

1. A provider registers an origin API and sets a `USDCx` price per call.
2. Lend402 exposes a wrapped `/v/{vault_id}/...` endpoint.
3. An agent requests that endpoint and receives an x402 `402 Payment Required` challenge.
4. The agent SDK runs `simulate-borrow`, or falls back to a live DIA read-only quote if the vault cache is cold, then builds `borrow-and-pay`, signs the Stacks transaction, and retries with the official x402 `payment-signature` header.
5. The gateway validates the payload, settles the signed transaction on Stacks, records the call, and forwards the request to the provider.
6. The provider response is returned with a `payment-response` receipt, and the UI links the payment to Hiro Explorer.

## Architecture

1. `contracts/lend402-vault.clar`
   Clarity vault contract for `borrow-and-pay`, LP liquidity, collateral tracking, cached DIA oracle reads for quote paths, and `sBTC`/`USDCx` settlement.

2. `server/agent-client.ts`
   Stacks agent SDK that intercepts HTTP `402`, runs `simulate-borrow`, falls back to a live DIA quote when needed, builds a `borrow-and-pay` contract call with `PostConditionMode.Deny`, signs it, encodes an official x402 `payment-signature` payload, and retries the request.

3. `src/app/api/v/[vault_id]/[...path]/route.ts`
   Next.js gateway route that issues x402 challenges, validates signed payment payloads, settles the Stacks transaction, records the call in Postgres, rate-limits traffic with Redis, and proxies the paid request to the provider origin.

4. `src/app/vault/*`
   Provider surfaces for vault registration, wrapped URL creation, dashboard authentication, and recent paid-call visibility.

5. `src/app/api/internal/refresh-price-cache/route.ts`
   Authenticated internal route that submits the on-chain `refresh-price-cache` call from a dedicated relayer wallet so the vault's cached DIA quote can stay warm.

6. `database/migrations/*`
   Postgres schema and migration history for vaults, calls, counters, and PRD-aligned columns.

## Why Stacks

- Settlement is fully Stacks-native: Clarity, `@stacks/transactions`, `@stacks/connect`, `@stacks/encryption`, `sBTC`, and `USDCx`.
- The payment rail is x402 V2 over `payment-required`, `payment-signature`, and `payment-response`, using Stacks CAIP-2 network identifiers.
- Borrow execution is guarded with `PostConditionMode.Deny`, so undeclared asset movement aborts on-chain.
- The vault is designed around Bitcoin-aligned collateral, Stacks smart contracts, and fast settlement visibility through the Hiro stack.
- The vault refreshes live sBTC pricing from the Stacks DIA oracle for mutating paths and exposes `refresh-price-cache` so read-only quote paths can stay warm on-chain.

## Deployment

Recommended topology:

- `Vercel` for the Next.js application and route handlers
- `Railway Postgres` for `vaults`, `calls`, and dashboard data
- `Railway Redis` for rate limiting, replay protection, and settled transaction idempotency

For a Vercel + Railway setup:

- Create a Railway `PostgreSQL` service and a Railway `Redis` service.
- Put Railway's external Postgres connection string into Vercel as `DATABASE_URL`.
- Put Railway's external Redis connection string into Vercel as `REDIS_URL`.
- Keep `STACKS_NETWORK`, `DEFAULT_VAULT_URL`, and contract env vars in Vercel as normal application envs.

For an app service running on Railway:

- Set `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- Set `REDIS_URL=${{Redis.REDIS_URL}}`

Railway exposes `DATABASE_URL` for Postgres and `REDIS_URL` for Redis. Service reference variables use the `${{ServiceName.VAR_NAME}}` format.

If you want the on-chain read-only quote path to stay warm without waiting for the agent SDK fallback:

- Set `LEND402_CACHE_REFRESH_PRIVATE_KEY` to a dedicated relayer wallet.
- Set `PRICE_CACHE_REFRESH_SECRET` or `CRON_SECRET`.
- Schedule `GET` or `POST` requests to `/api/internal/refresh-price-cache` with `Authorization: Bearer <secret>`.
- Treat this as a best-effort warmer. The agent SDK still falls back to a live DIA read-only quote if the cache is stale.

## Environment

Copy `.env.local.example` to `.env.local` and provide:

- `STACKS_NETWORK`
- `NEXT_PUBLIC_STACKS_NETWORK`
- `LEND402_VAULT_CONTRACT_ID`
- `NEXT_PUBLIC_LEND402_VAULT_CONTRACT_ID`
- `LEND402_AGENT_PRIVATE_KEY`
- `LEND402_AGENT_ADDRESS`
- `LEND402_CACHE_REFRESH_PRIVATE_KEY` if you want to automate `refresh-price-cache`
- `PRICE_CACHE_REFRESH_SECRET` or `CRON_SECRET` if you want to protect the internal warmer route
- `DATABASE_URL`
- `REDIS_URL`
- `DEFAULT_VAULT_URL`
- `NEXT_PUBLIC_GATEWAY_BASE_URL`

## Judging Alignment

- `Innovation`: Lend402 does not just pay for an API call; it combines x402 with just-in-time credit so agents can finance a request at execution time.
- `Technical Implementation`: signed Stacks transactions, Clarity contract settlement, post-conditions, SSRF filtering, Redis-backed replay protection, rate limiting, and direct Postgres persistence.
- `Stacks Alignment`: the core story depends on Stacks-specific primitives, not a generic EVM port. `sBTC`, `USDCx`, Clarity, stacks.js, Hiro infrastructure, and Stacks network identifiers are part of the actual flow.
- `User Experience`: providers get a registration flow and dashboard, while agents get a single wrapped endpoint rather than custom billing logic.
- `Impact Potential`: the project is positioned as infrastructure for paid agent commerce on Stacks rather than a single-purpose demo.

## Current Status

Truthfully, the repo is strong but not finished in every dimension of production hardening.

Implemented now:

- Stacks-native x402 wire format
- official `x402-stacks` V2 types and header helpers on the protocol surface
- direct Postgres integration
- Railway-ready database and Redis configuration
- provider vault registration and dashboard flows
- on-chain settlement path from signed request to proxied origin response
- Clarinet manifest and local contract-check workflow
- canonical mainnet defaults for Stacks `sBTC`, `USDCx`, and DIA oracle contracts
- authenticated internal route for submitting `refresh-price-cache` on-chain

Still outstanding:

- Clarinet mainnet execution simulation coverage
- live mainnet smoke testing with real deployed contracts and real assets
- deployment-level scheduler wiring for `/api/internal/refresh-price-cache` if you want the on-chain read-only quote path to stay continuously warm
- optional future migration away from the custom vault-aware interceptor once the upstream `x402-stacks` client can sign contract-call payment flows, not just direct token transfers

## Development

```bash
npm install
npm run typecheck
npm run clarinet:check
npx next build --webpack
```

The production target is Stacks mainnet. Use testnet only when explicitly validating against testnet infrastructure.

## License

MIT. See `LICENSE`.
