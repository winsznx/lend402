import type { Caip2NetworkId, XPaymentHeader } from "@/types/x402";

export interface VaultRecord {
  vault_id: string;
  provider_address: string;
  origin_url: string;
  price_usdcx: number;
  rate_limit: number;
  resource_name: string;
  description: string | null;
  webhook_url: string | null;
  network: Caip2NetworkId;
  asset_contract: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_calls: number;
  total_earned_usdcx: number;
}

export interface CallRecord {
  call_id: string;
  vault_id: string;
  payer_address: string;
  txid: string;
  block_height: number | null;
  amount_usdcx: number;
  path: string;
  method: string;
  origin_status: number | null;
  settled_at: string;
  x402_payload: XPaymentHeader | null;
  webhook_delivered: boolean | null;
}
