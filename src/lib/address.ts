export function truncateAddress(address: string, chars: number = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return address.slice(0, chars + 2) + "..." + address.slice(-chars);
}

export function isMainnetAddress(address: string): boolean {
  return address.startsWith("SP") || address.startsWith("SM");
}

export function isTestnetAddress(address: string): boolean {
  return address.startsWith("ST") || address.startsWith("SN");
}
