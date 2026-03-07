import postgres, { Sql } from "postgres";
import type { XPaymentHeader } from "@/types/x402";
import type { CallRecord, VaultRecord } from "@/types/vault";

type PgRow = Record<string, unknown>;

type VaultDashboardUpdate = {
  price_usdcx?: number;
  rate_limit?: number;
  description?: string | null;
  webhook_url?: string | null;
};

let _sql: Sql | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function shouldUseSsl(databaseUrl: string): boolean {
  return !/(localhost|127\.0\.0\.1)/i.test(databaseUrl);
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10);
  throw new Error(`Expected numeric database value, received ${typeof value}`);
}

function asNullableNumber(value: unknown): number | null {
  return value == null ? null : asNumber(value);
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  throw new Error(`Expected string database value, received ${typeof value}`);
}

function asNullableString(value: unknown): string | null {
  return value == null ? null : asString(value);
}

function asBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true";
  throw new Error(`Expected boolean database value, received ${typeof value}`);
}

function asJson<T>(value: unknown): T | null {
  if (value == null) return null;
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function toVaultRecord(row: PgRow): VaultRecord {
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

function toCallRecord(row: PgRow): CallRecord {
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
      row.webhook_delivered == null ? null : asBoolean(row.webhook_delivered),
  };
}

export function getDb(): Sql {
  if (_sql) return _sql;

  const databaseUrl = requiredEnv("DATABASE_URL");

  _sql = postgres(databaseUrl, {
    ssl: shouldUseSsl(databaseUrl) ? "require" : false,
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });

  return _sql;
}

export async function findVaultRegistrationDuplicate(
  providerAddress: string,
  originUrl: string
): Promise<{ vault_id: string } | null> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    select vault_id
    from vaults
    where provider_address = ${providerAddress}
      and origin_url = ${originUrl}
    limit 1
  `;

  const row = rows[0];
  return row ? { vault_id: asString(row.vault_id) } : null;
}

export async function createVault(params: {
  provider_address: string;
  origin_url: string;
  price_usdcx: number;
  rate_limit: number;
  resource_name: string;
  description: string | null;
  webhook_url: string | null;
  network: VaultRecord["network"];
  asset_contract: string;
}): Promise<{ vault_id: string; created_at: string }> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    insert into vaults (
      provider_address,
      origin_url,
      price_usdcx,
      rate_limit,
      resource_name,
      description,
      webhook_url,
      network,
      asset_contract
    ) values (
      ${params.provider_address},
      ${params.origin_url},
      ${params.price_usdcx},
      ${params.rate_limit},
      ${params.resource_name},
      ${params.description},
      ${params.webhook_url},
      ${params.network},
      ${params.asset_contract}
    )
    returning vault_id, created_at
  `;

  const row = rows[0];
  if (!row) {
    throw new Error("Failed to create vault");
  }

  return {
    vault_id: asString(row.vault_id),
    created_at: asString(row.created_at),
  };
}

export async function findVaultById(vaultId: string): Promise<VaultRecord | null> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    select
      vault_id,
      provider_address,
      origin_url,
      price_usdcx,
      rate_limit,
      resource_name,
      description,
      webhook_url,
      network,
      asset_contract,
      is_active,
      created_at,
      updated_at,
      total_calls,
      total_earned_usdcx
    from vaults
    where vault_id = ${vaultId}
    limit 1
  `;

  return rows[0] ? toVaultRecord(rows[0]) : null;
}

export async function findActiveVaultById(vaultId: string): Promise<VaultRecord | null> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    select
      vault_id,
      provider_address,
      origin_url,
      price_usdcx,
      rate_limit,
      resource_name,
      description,
      webhook_url,
      network,
      asset_contract,
      is_active,
      created_at,
      updated_at,
      total_calls,
      total_earned_usdcx
    from vaults
    where vault_id = ${vaultId}
      and is_active = true
    limit 1
  `;

  return rows[0] ? toVaultRecord(rows[0]) : null;
}

export async function listVaultsByProvider(
  providerAddress: string
): Promise<VaultRecord[]> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    select
      vault_id,
      provider_address,
      origin_url,
      price_usdcx,
      rate_limit,
      resource_name,
      description,
      webhook_url,
      network,
      asset_contract,
      is_active,
      created_at,
      updated_at,
      total_calls,
      total_earned_usdcx
    from vaults
    where provider_address = ${providerAddress}
    order by created_at desc
  `;

  return rows.map(toVaultRecord);
}

export async function updateVaultById(
  vaultId: string,
  updates: VaultDashboardUpdate
): Promise<{
  vault_id: string;
  resource_name: string;
  description: string | null;
  price_usdcx: number;
  rate_limit: number;
  webhook_url: string | null;
  is_active: boolean;
  updated_at: string;
} | null> {
  const db = getDb();

  if (Object.keys(updates).length === 0) {
    const rows = await db<PgRow[]>`
      select
        vault_id,
        resource_name,
        description,
        price_usdcx,
        rate_limit,
        webhook_url,
        is_active,
        updated_at
      from vaults
      where vault_id = ${vaultId}
      limit 1
    `;

    const row = rows[0];
    return row
      ? {
          vault_id: asString(row.vault_id),
          resource_name: asString(row.resource_name),
          description: asNullableString(row.description),
          price_usdcx: asNumber(row.price_usdcx),
          rate_limit: asNumber(row.rate_limit),
          webhook_url: asNullableString(row.webhook_url),
          is_active: asBoolean(row.is_active),
          updated_at: asString(row.updated_at),
        }
      : null;
  }

  const rows = await db<PgRow[]>`
    update vaults
    set ${db(updates)}
    where vault_id = ${vaultId}
    returning
      vault_id,
      resource_name,
      description,
      price_usdcx,
      rate_limit,
      webhook_url,
      is_active,
      updated_at
  `;

  const row = rows[0];
  return row
    ? {
        vault_id: asString(row.vault_id),
        resource_name: asString(row.resource_name),
        description: asNullableString(row.description),
        price_usdcx: asNumber(row.price_usdcx),
        rate_limit: asNumber(row.rate_limit),
        webhook_url: asNullableString(row.webhook_url),
        is_active: asBoolean(row.is_active),
        updated_at: asString(row.updated_at),
      }
    : null;
}

export async function listCallsByVaultIds(vaultIds: string[]): Promise<CallRecord[]> {
  if (vaultIds.length === 0) return [];

  const db = getDb();
  const rows = await db<PgRow[]>`
    select
      call_id,
      vault_id,
      payer_address,
      txid,
      block_height,
      amount_usdcx,
      path,
      method,
      origin_status,
      settled_at,
      x402_payload,
      webhook_delivered
    from calls
    where vault_id in ${db(vaultIds)}
    order by settled_at desc
  `;

  return rows.map(toCallRecord);
}

export async function insertCall(params: {
  vault_id: string;
  payer_address: string;
  txid: string;
  block_height: number | null;
  amount_usdcx: number;
  path: string;
  method: string;
  origin_status: number | null;
  x402_payload: XPaymentHeader;
}): Promise<{ call_id: string } | null> {
  const db = getDb();
  const rows = await db<PgRow[]>`
    insert into calls (
      vault_id,
      payer_address,
      txid,
      block_height,
      amount_usdcx,
      path,
      method,
      origin_status,
      x402_payload
    ) values (
      ${params.vault_id},
      ${params.payer_address},
      ${params.txid},
      ${params.block_height},
      ${params.amount_usdcx},
      ${params.path},
      ${params.method},
      ${params.origin_status},
      ${JSON.stringify(params.x402_payload)}::jsonb
    )
    returning call_id
  `;

  const row = rows[0];
  return row ? { call_id: asString(row.call_id) } : null;
}

export async function incrementVaultCounters(
  vaultId: string,
  amountUsdcx: number
): Promise<void> {
  const db = getDb();
  await db`
    update vaults
    set total_calls = total_calls + 1,
        total_earned_usdcx = total_earned_usdcx + ${amountUsdcx}
    where vault_id = ${vaultId}
  `;
}

export async function updateCallOriginStatus(
  txid: string,
  originStatus: number
): Promise<void> {
  const db = getDb();
  await db`
    update calls
    set origin_status = ${originStatus}
    where txid = ${txid}
  `;
}

export async function updateCallWebhookDelivered(
  callId: string,
  delivered: boolean
): Promise<void> {
  const db = getDb();
  await db`
    update calls
    set webhook_delivered = ${delivered}
    where call_id = ${callId}
  `;
}
