import { VAULT_ERRORS } from "@/lib/contracts";

export const RECOVERABLE_VAULT_ERRORS = new Set<number>([
  104,
  105,
  106,
]);

export const USER_FACING_VAULT_ERRORS = new Set<number>([
  103,
  108,
  109,
  112,
  113,
  115,
  120,
]);

export function isRecoverableVaultError(code: number): boolean {
  return RECOVERABLE_VAULT_ERRORS.has(code);
}

export function isUserFacingVaultError(code: number): boolean {
  return USER_FACING_VAULT_ERRORS.has(code);
}

export function describeVaultError(code: number): string {
  return VAULT_ERRORS[code] ?? "UNKNOWN-ERROR-" + code;
}
