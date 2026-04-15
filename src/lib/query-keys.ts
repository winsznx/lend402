export const vaultKeys = {
  all: ["vaults"] as const,
  byId: (id: string) => ["vaults", id] as const,
  byProvider: (address: string) => ["vaults", "provider", address] as const,
  dashboard: (address: string) => ["vaults", "dashboard", address] as const,
  calls: (vaultId: string) => ["vaults", vaultId, "calls"] as const,
};

export const agentKeys = {
  all: ["agent"] as const,
  config: () => ["agent", "config"] as const,
  position: (address: string) => ["agent", "position", address] as const,
  health: (address: string) => ["agent", "health", address] as const,
};

export const priceKeys = {
  sbtc: () => ["price", "sbtc"] as const,
  usdcx: () => ["price", "usdcx"] as const,
};
