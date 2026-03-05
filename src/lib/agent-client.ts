// =============================================================================
// src/lib/agent-client.ts
// Re-export of the Lend402 Agent SDK for use in Next.js server routes.
// This file lives inside src/ so Next.js resolves it via @/lib/agent-client.
// The runtime for all API routes that import this MUST be "nodejs" since
// @stacks/transactions uses Node.js crypto + Buffer under the hood.
// =============================================================================

export * from "../../server/agent-client";
