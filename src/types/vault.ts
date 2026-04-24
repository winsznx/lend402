import type { Caip2NetworkId, XPaymentHeader } from "@/types/x402";

export interface VaultRecord {
  readonly vault_id: string;
  readonly provider_address: string;
  readonly origin_url: string;
  readonly price_usdcx: number;
  readonly rate_limit: number;
  readonly resource_name: string;
  readonly description: string | null;
  readonly webhook_url: string | null;
  readonly network: Caip2NetworkId;
  readonly asset_contract: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly updated_at: string;
  readonly total_calls: number;
  readonly total_earned_usdcx: number;
}

export interface CallRecord {
  readonly call_id: string;
  readonly vault_id: string;
  readonly payer_address: string;
  readonly txid: string;
  readonly block_height: number | null;
  readonly amount_usdcx: number;
  readonly path: string;
  readonly method: string;
  readonly origin_status: number | null;
  readonly settled_at: string;
  readonly x402_payload: XPaymentHeader | null;
  readonly webhook_delivered: boolean | null;
}
