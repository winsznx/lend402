export function secondsAgo(unixSeconds: number): number {
  return Math.floor(Date.now() / 1000) - unixSeconds;
}

export function toIsoString(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

export function toUnix(input: Date | string | number): number {
  if (typeof input === "number") return input;
  if (input instanceof Date) return Math.floor(input.getTime() / 1000);
  return Math.floor(new Date(input).getTime() / 1000);
}

export function addSeconds(unixSeconds: number, seconds: number): number {
  return unixSeconds + seconds;
}

export function isExpired(expiryUnix: number): boolean {
  return Math.floor(Date.now() / 1000) >= expiryUnix;
}
