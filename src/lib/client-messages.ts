function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildClientVaultRegistrationMessage(
  originUrl: string,
  timestampSeconds: number
): Promise<string> {
  const data = new TextEncoder().encode(originUrl);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return `Register API Vault: ${bytesToHex(new Uint8Array(digest))} at ${timestampSeconds}`;
}

export function buildClientDashboardAccessMessage(
  address: string,
  timestampSeconds: number
): string {
  return `Lend402 Dashboard Access: ${address} at ${timestampSeconds}`;
}
