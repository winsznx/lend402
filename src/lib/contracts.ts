export const VAULT_FUNCTIONS = {
  BORROW_AND_PAY: "borrow-and-pay",
  REPAY_LOAN: "repay-loan",
  DEPOSIT_LIQUIDITY: "deposit-liquidity",
  WITHDRAW_LIQUIDITY: "withdraw-liquidity",
  LIQUIDATE: "liquidate",
  REFRESH_PRICE_CACHE: "refresh-price-cache",
  SIMULATE_BORROW: "simulate-borrow",
  GET_VAULT_STATS: "get-vault-stats",
  GET_POSITION: "get-position",
  GET_ACTIVE_POSITION: "get-active-position",
  GET_LP_BALANCE: "get-lp-balance",
  GET_HEALTH_FACTOR: "get-health-factor",
  PAUSE_VAULT: "pause-vault",
  UNPAUSE_VAULT: "unpause-vault",
  COLLECT_PROTOCOL_FEES: "collect-protocol-fees",
} as const;

export const VAULT_ERRORS: Record<number, string> = {
  100: "ERR-NOT-AUTHORIZED",
  101: "ERR-PAUSED",
  102: "ERR-INVALID-AMOUNT",
  103: "ERR-INSUFFICIENT-COLLATERAL",
  104: "ERR-INSUFFICIENT-LIQUIDITY",
  105: "ERR-ORACLE-STALE",
  106: "ERR-ORACLE-FAILURE",
  107: "ERR-POSITION-NOT-FOUND",
  108: "ERR-POSITION-HEALTHY",
  109: "ERR-POSITION-EXISTS",
  110: "ERR-TRANSFER-FAILED",
  111: "ERR-ARITHMETIC-OVERFLOW",
  112: "ERR-BELOW-MIN-BORROW",
  113: "ERR-ABOVE-MAX-BORROW",
  114: "ERR-REPAY-EXCEEDS-DEBT",
  115: "ERR-ZERO-COLLATERAL",
  116: "ERR-LP-ALREADY-DEPOSITED",
  117: "ERR-LP-NO-DEPOSIT",
  118: "ERR-WITHDRAWAL-TOO-LARGE",
  119: "ERR-PRICE-ZERO",
  120: "ERR-MERCHANT-INVALID",
};

export function getVaultErrorName(code: number): string {
  return VAULT_ERRORS[code] ?? "UNKNOWN-ERROR-" + code;
}
