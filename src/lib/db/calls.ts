import type { CallRecord } from "@/types/vault";
import type { XPaymentHeader } from "@/types/x402";
import { getDb, PgRow } from "@/lib/db/core";
import { toCallRecord, asString } from "@/lib/db/parsers";

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
