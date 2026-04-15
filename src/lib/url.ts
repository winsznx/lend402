import { normalizeTxid } from "@/lib/network";

export function buildExplorerTxUrl(
  baseUrl: string,
  txid: string,
  chain: string
): string {
  return `${baseUrl}/txid/${normalizeTxid(txid)}?chain=${chain}`;
}

export function buildExplorerAddressUrl(
  baseUrl: string,
  address: string,
  chain: string
): string {
  return `${baseUrl}/address/${address}?chain=${chain}`;
}

export function buildExplorerContractUrl(
  baseUrl: string,
  contractId: string,
  chain: string
): string {
  return `${baseUrl}/address/${contractId}?chain=${chain}`;
}

export function buildVaultProxyUrl(gatewayBase: string, vaultId: string): string {
  return `${gatewayBase}/v/${vaultId}`;
}
