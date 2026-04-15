export function bpsToPercent(bps: number): number { return bps / 100; }
export function percentToBps(percent: number): number { return Math.round(percent * 100); }
export function bpsOf(value: number, bps: number): number { return Math.floor((value * bps) / 10_000); }
export function microUsdcxToUsd(microUsdcx: number): number { return microUsdcx / 1_000_000; }
export function usdToMicroUsdcx(usd: number): number { return Math.round(usd * 1_000_000); }
export function satoshisToBtc(satoshis: number): number { return satoshis / 1e8; }
export function btcToSatoshis(btc: number): number { return Math.round(btc * 1e8); }
