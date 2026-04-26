import type { CallRecord, VaultRecord } from "@/types/vault";
import type { XPaymentHeader } from "@/types/x402";
import type { PgRow } from "@/lib/db/core";

export function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10);
  throw new Error(`Expected numeric database value, received ${typeof value}`);
}

export function asNullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : asNumber(value);
}

export function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  throw new Error(`Expected string database value, received ${typeof value}`);
}

export function asNullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : asString(value);
}

export function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  throw new Error(`Expected boolean database value, received ${typeof value}`);
}

export function asJson<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

export function toVaultRecord(row: PgRow): VaultRecord {
  return {
    vault_id: asString(row.vault_id),
    provider_address: asString(row.provider_address),
    origin_url: asString(row.origin_url),
    price_usdcx: asNumber(row.price_usdcx),
    rate_limit: asNumber(row.rate_limit),
    resource_name: asString(row.resource_name),
    description: asNullableString(row.description),
    webhook_url: asNullableString(row.webhook_url),
    network: asString(row.network) as VaultRecord["network"],
    asset_contract: asString(row.asset_contract),
    is_active: asBoolean(row.is_active),
    created_at: asString(row.created_at),
    updated_at: asString(row.updated_at),
    total_calls: asNumber(row.total_calls),
    total_earned_usdcx: asNumber(row.total_earned_usdcx),
  };
}

export function toCallRecord(row: PgRow): CallRecord {
  return {
    call_id: asString(row.call_id),
    vault_id: asString(row.vault_id),
    payer_address: asString(row.payer_address),
    txid: asString(row.txid),
    block_height: asNullableNumber(row.block_height),
    amount_usdcx: asNumber(row.amount_usdcx),
    path: asString(row.path),
    method: asString(row.method),
    origin_status: asNullableNumber(row.origin_status),
    settled_at: asString(row.settled_at),
    x402_payload: asJson<XPaymentHeader>(row.x402_payload),
    webhook_delivered:
      row.webhook_delivered === null || row.webhook_delivered === undefined ? null : asBoolean(row.webhook_delivered),
  };
}
