export function safeBps(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(Math.min(10_000, value));
}

export function formatBps(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function addBps(value: number, bps: number): number {
  return Math.floor((value * (10_000 + bps)) / 10_000);
}

export function subtractBps(value: number, bps: number): number {
  return Math.floor((value * (10_000 - bps)) / 10_000);
}
