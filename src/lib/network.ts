export type Lend402Network = "mainnet" | "testnet";
export type Caip2NetworkId = "stacks:1" | "stacks:2147483648";

export const DEFAULT_USDCX_CONTRACT: Record<Lend402Network, string> = {
  mainnet: "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx",
  testnet: "ST1PQHQK6K7Y0ZYMY2E61HW3D8B8JV2QDN64STJHH.usdcx",
};

export const DEFAULT_SBTC_CONTRACT: Record<Lend402Network, string> = {
  mainnet: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
  testnet: "ST2PABAF9FTAJYNFZH93XENAJ8FVY99RRM4CB2WDX.sbtc-token",
};

export const DEFAULT_DIA_ORACLE_CONTRACT: Record<Lend402Network, string> = {
  mainnet: "SP1G48FZ4Y7JY8G2Z0N51QTCYGBQ6F4J43J77BQC0.dia-oracle",
  testnet: "ST2HKGJ8CY0YFNCH7A69GAMXKPGTAKDG0D0M0F4FZ.dia-oracle",
};

export const DIA_SBTC_PAIR = "sBTC/USD";

export function getNormalizedStacksNetwork(
  rawNetwork?: string | null
): Lend402Network {
  return rawNetwork === "testnet" ? "testnet" : "mainnet";
}

export function getCaip2NetworkId(network: Lend402Network): Caip2NetworkId {
  return network === "mainnet" ? "stacks:1" : "stacks:2147483648";
}

export function getExplorerChain(network: Lend402Network): Lend402Network {
  return network;
}

export function getHiroApiBaseUrl(network: Lend402Network): string {
  return network === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so";
}

export function splitContractId(contractId: string): {
  address: string;
  name: string;
} {
  const [address, name] = contractId.split(".");

  if (!address || !name) {
    throw new Error(`Invalid contract identifier: ${contractId}`);
  }

  return { address, name };
}

export function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function normalizeTxid(txid: string): string {
  const trimmed = txid.trim();
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}
