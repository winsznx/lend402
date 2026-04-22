import { TransactionVersion } from "@stacks/network";
import {
  DEFAULT_SBTC_CONTRACT,
  DEFAULT_USDCX_CONTRACT,
  getCaip2NetworkId,
  getHiroApiBaseUrl,
  getNormalizedStacksNetwork,
  splitContractId,
  stripTrailingSlash,
  type Lend402Network,
} from "@/lib/network";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalContractId(
  envName: string,
  fallback: string
): { contractId: string; address: string; name: string } {
  const contractId = process.env[envName]?.trim() || fallback;
  const { address, name } = splitContractId(contractId);
  return { contractId, address, name };
}

export interface ServerStacksConfig {
  networkName: Lend402Network;
  caip2NetworkId: "stacks:1" | "stacks:2147483648";
  transactionVersion: TransactionVersion;
  hiroApiBaseUrl: string;
  vaultContractId: string;
  vaultContractAddress: string;
  vaultContractName: string;
  sbtcContractId: string;
  sbtcContractAddress: string;
  sbtcContractName: string;
  usdcxContractId: string;
  usdcxContractAddress: string;
  usdcxContractName: string;
}

export function getServerStacksConfig(): ServerStacksConfig {
  const networkName = getNormalizedStacksNetwork(process.env.STACKS_NETWORK);
  const vaultContractId = requiredEnv("LEND402_VAULT_CONTRACT_ID");
  const vaultContract = splitContractId(vaultContractId);
  const sbtcContract = optionalContractId(
    "LEND402_SBTC_CONTRACT_ID",
    DEFAULT_SBTC_CONTRACT[networkName]
  );
  const usdcxContract = optionalContractId(
    "LEND402_USDCX_CONTRACT_ID",
    DEFAULT_USDCX_CONTRACT[networkName]
  );

  return {
    networkName,
    caip2NetworkId: getCaip2NetworkId(networkName),
    transactionVersion:
      networkName === "mainnet"
        ? TransactionVersion.Mainnet
        : TransactionVersion.Testnet,
    hiroApiBaseUrl: getHiroApiBaseUrl(networkName),
    vaultContractId,
    vaultContractAddress: vaultContract.address,
    vaultContractName: vaultContract.name,
    sbtcContractId: sbtcContract.contractId,
    sbtcContractAddress: sbtcContract.address,
    sbtcContractName: sbtcContract.name,
    usdcxContractId: usdcxContract.contractId,
    usdcxContractAddress: usdcxContract.address,
    usdcxContractName: usdcxContract.name,
  };
}

export function getGatewayBaseUrl(requestOrigin?: string): string {
  const explicit = process.env.NEXT_PUBLIC_GATEWAY_BASE_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);
  if (requestOrigin) return stripTrailingSlash(requestOrigin);
  return "";
}
