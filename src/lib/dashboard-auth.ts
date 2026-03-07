import { getServerStacksConfig } from "@/lib/server-config";
import {
  buildDashboardAccessMessage,
  validateDashboardAccessMessage,
  verifyWalletSignature,
} from "@/lib/wallet-auth";

export interface DashboardAuthContext {
  address: string;
  message: string;
  signature: string;
}

export function readDashboardAuth(
  headers: { get(name: string): string | null }
): DashboardAuthContext {
  const address = headers.get("x-wallet-address")?.trim() ?? "";
  const signature = headers.get("x-wallet-signature")?.trim() ?? "";
  const explicitMessage = headers.get("x-wallet-message")?.trim() ?? "";
  const timestamp = headers.get("x-wallet-timestamp")?.trim() ?? "";

  if (!address || !signature) {
    throw new Error("x-wallet-address and x-wallet-signature are required");
  }

  const message =
    explicitMessage ||
    (timestamp ? buildDashboardAccessMessage(address, Number(timestamp)) : "");

  if (!message) {
    throw new Error("x-wallet-message or x-wallet-timestamp is required");
  }

  validateDashboardAccessMessage(address, message);

  const stacksConfig = getServerStacksConfig();
  verifyWalletSignature({
    address,
    message,
    signature,
    transactionVersion: stacksConfig.transactionVersion,
  });

  return { address, message, signature };
}
