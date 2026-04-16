import type { Caip2NetworkId } from "@/types/x402";
import type { Lend402Network } from "@/lib/network";

export function caip2ToNetworkName(caip2: Caip2NetworkId): Lend402Network {
  return caip2 === "stacks:1" ? "mainnet" : "testnet";
}

export function isMainnetCaip2(caip2: Caip2NetworkId): boolean {
  return caip2 === "stacks:1";
}

export function isValidCaip2(value: string): value is Caip2NetworkId {
  return value === "stacks:1" || value === "stacks:2147483648";
}
