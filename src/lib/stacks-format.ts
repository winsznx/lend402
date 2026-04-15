import { SBTC_DECIMALS, USDCX_DECIMALS } from "@/lib/protocol";

export function formatSbtcAmount(satoshis: number, precision: number = 6): string {
  return (satoshis / Math.pow(10, SBTC_DECIMALS)).toFixed(precision);
}

export function formatUsdcxAmount(micro: number, precision: number = 2): string {
  return (micro / Math.pow(10, USDCX_DECIMALS)).toFixed(precision);
}

export function parseSbtcAmount(display: string): number {
  return Math.round(parseFloat(display) * Math.pow(10, SBTC_DECIMALS));
}

export function parseUsdcxAmount(display: string): number {
  return Math.round(parseFloat(display) * Math.pow(10, USDCX_DECIMALS));
}
