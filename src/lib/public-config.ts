import {
  getCaip2NetworkId,
  getExplorerChain,
  getNormalizedStacksNetwork,
  normalizeTxid,
  stripTrailingSlash,
} from "@/lib/network";

export const PUBLIC_STACKS_NETWORK = getNormalizedStacksNetwork(
  process.env.NEXT_PUBLIC_STACKS_NETWORK ?? "mainnet"
);

export const PUBLIC_CAIP2_NETWORK = getCaip2NetworkId(PUBLIC_STACKS_NETWORK);

export const PUBLIC_GATEWAY_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_GATEWAY_BASE_URL ?? ""
);

export const PUBLIC_HIRO_EXPLORER_BASE_URL = stripTrailingSlash(
  process.env.NEXT_PUBLIC_HIRO_EXPLORER_BASE_URL ?? "https://explorer.hiro.so"
);

export const PUBLIC_VAULT_CONTRACT_ID =
  process.env.NEXT_PUBLIC_LEND402_VAULT_CONTRACT_ID ?? "lend402-vault";

export function getExplorerTxUrl(txid: string): string {
  return `${PUBLIC_HIRO_EXPLORER_BASE_URL}/txid/${normalizeTxid(txid)}?chain=${getExplorerChain(
    PUBLIC_STACKS_NETWORK
  )}`;
}
