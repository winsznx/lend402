# Lend402

Stacks-native x402 payment and credit rail for agentic APIs.

## Stack
- Next.js 16 (App Router), React 19, Tailwind CSS 3, TypeScript 5
- Clarity 4 smart contracts on Stacks (Nakamoto)
- Postgres (vaults, calls), Redis (rate limiting, idempotency)
- Agent SDK: `@winsznx/lend402` (packages/agent-sdk/)

## Conventions
- Path alias: `@/*` maps to `./src/*`
- UI components: `src/components/ui/` — exported via barrel `index.ts`
- Hooks: `src/hooks/` — exported via barrel `index.ts`
- Lib utilities: `src/lib/` — exported via barrel `index.ts`
- Types: `src/types/` — exported via barrel `index.ts`
- Tailwind class merging: use `cn()` from `@/lib/cn`
- Font: monospace-first (`font-mono`), display font for headings (`font-display`)
- Dark mode: `class` strategy, defaulted to dark in root layout

## Key Patterns
- All API routes use `runtime = "nodejs"` and `dynamic = "force-dynamic"`
- HTTP errors: use `jsonError()` from `@/lib/api-error`
- Validation: use helpers from `@/lib/validation`
- Contract constants: `@/lib/contracts` mirrors on-chain error codes and function names
- Protocol constants: `@/lib/protocol` mirrors on-chain BPS values and bounds

## Testing
- Unit tests: `tests/unit/` — run with `npx vitest run`
- E2E tests: `tests/e2e/` — require `E2E_VAULT_URL` env var
