import { createHash } from "crypto";
import { hashMessage, verifyMessageSignatureRsv } from "@stacks/encryption";
import {
  createMessageSignature,
  getAddressFromPublicKey,
  publicKeyFromSignatureRsv,
  type TransactionVersion,
} from "@stacks/transactions";

const HEX_RE = /^[0-9a-f]+$/i;

function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  if (HEX_RE.test(trimmed)) {
    return trimmed;
  }

  try {
    return Buffer.from(trimmed, "base64").toString("hex");
  } catch {
    throw new Error("Invalid signature encoding");
  }
}

function assertFreshTimestamp(
  timestampSeconds: number,
  maxAgeSeconds: number,
  purpose: string
): void {
  const now = Math.floor(Date.now() / 1000);
  if (timestampSeconds > now + 60 || now - timestampSeconds > maxAgeSeconds) {
    throw new Error(`${purpose} signature has expired`);
  }
}

export function buildVaultRegistrationMessage(
  originUrl: string,
  timestampSeconds: number
): string {
  const originHash = createHash("sha256").update(originUrl).digest("hex");
  return `Register API Vault: ${originHash} at ${timestampSeconds}`;
}

export function validateVaultRegistrationMessage(
  originUrl: string,
  message: string
): void {
  const match = /^Register API Vault: ([0-9a-f]{64}) at (\d{10,})$/i.exec(
    message.trim()
  );

  if (!match) {
    throw new Error("Invalid registration message");
  }

  const [, hash, timestamp] = match;
  const expected = createHash("sha256").update(originUrl).digest("hex");
  if (hash.toLowerCase() !== expected.toLowerCase()) {
    throw new Error("Registration message does not match origin URL");
  }

  assertFreshTimestamp(Number(timestamp), 15 * 60, "Registration");
}

export function buildDashboardAccessMessage(
  address: string,
  timestampSeconds: number
): string {
  return `Lend402 Dashboard Access: ${address} at ${timestampSeconds}`;
}

export function validateDashboardAccessMessage(
  address: string,
  message: string
): void {
  const match = /^Lend402 Dashboard Access: ([A-Z0-9]+) at (\d{10,})$/i.exec(
    message.trim()
  );

  if (!match) {
    throw new Error("Invalid dashboard authentication message");
  }

  const [, embeddedAddress, timestamp] = match;
  if (embeddedAddress !== address) {
    throw new Error("Dashboard message address mismatch");
  }

  assertFreshTimestamp(Number(timestamp), 60 * 60, "Dashboard");
}

export function verifyWalletSignature(params: {
  address: string;
  message: string;
  signature: string;
  transactionVersion: TransactionVersion;
}): { publicKey: string; signature: string } {
  const signature = normalizeSignature(params.signature);
  const messageHashHex = Buffer.from(hashMessage(params.message)).toString("hex");
  const publicKey = publicKeyFromSignatureRsv(
    messageHashHex,
    createMessageSignature(signature)
  );

  const isValid = verifyMessageSignatureRsv({
    message: params.message,
    publicKey,
    signature,
  });

  if (!isValid) {
    throw new Error("Invalid wallet signature");
  }

  const derivedAddress = getAddressFromPublicKey(
    publicKey,
    params.transactionVersion
  );

  if (derivedAddress !== params.address) {
    throw new Error("Wallet signature address mismatch");
  }

  return { publicKey, signature };
}
