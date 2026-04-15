const STACKS_ADDRESS_RE = /^S[MPT][A-Z0-9]{38,128}$/;
const CONTRACT_ID_RE = /^S[MPT][A-Z0-9]{38,128}\.[a-zA-Z][a-zA-Z0-9_-]{0,127}$/;
const TXID_RE = /^(0x)?[0-9a-f]{64}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isStacksAddress(value: string): boolean {
  return STACKS_ADDRESS_RE.test(value);
}

export function isContractId(value: string): boolean {
  return CONTRACT_ID_RE.test(value);
}

export function isTxid(value: string): boolean {
  return TXID_RE.test(value);
}

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
