export const BRAND_COLORS = {
  amber: "#f59e0b",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  emerald: "#4ade80",
  red: "#f87171",
} as const;

export type BrandColor = keyof typeof BRAND_COLORS;
