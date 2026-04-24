import type { VaultRecord } from "@/types/vault";
import { getDb, PgRow } from "./core";
import { toVaultRecord, asString, asNullableString, asNumber, asBoolean } from "./parsers";

type VaultDashboardUpdate = {
  readonly price_usdcx?: number;
  readonly rate_limit?: number;
  readonly description?: string | null;
  readonly webhook_url?: string | null;
};

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
    set ${db(updates as any)}
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
