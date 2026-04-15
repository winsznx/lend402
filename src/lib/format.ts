export function truncateMiddle(str: string, maxLen: number = 16): string {
  if (str.length <= maxLen) return str;
  const edge = Math.floor((maxLen - 3) / 2);
  return `${str.slice(0, edge)}...${str.slice(-edge)}`;
}

export function formatUsdcx(microUsdcx: number): string {
  return `$${(microUsdcx / 1_000_000).toFixed(2)}`;
}

export function formatSatoshis(satoshis: number): string {
  return `${(satoshis / 1e8).toFixed(8)} sBTC`;
}

export function formatTimestamp(isoOrUnix: string | number): string {
  const date =
    typeof isoOrUnix === "number"
      ? new Date(isoOrUnix * 1000)
      : new Date(isoOrUnix);
  return date.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}
