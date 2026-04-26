import { isUuid } from "@/lib/validation";

export function isVaultId(value: string): boolean {
  return isUuid(value);
}

export function assertVaultId(value: string): void {
  if (!isVaultId(value)) {
    throw new Error("Invalid vault id: " + value);
  }
}
