type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  readonly public: {
    readonly Tables: {
      readonly vaults: {
        readonly Row: {
          readonly vault_id: string;
          readonly provider_address: string;
          readonly origin_url: string;
          readonly price_usdcx: number;
          readonly rate_limit: number;
          readonly resource_name: string;
          readonly description: string | null;
          readonly webhook_url: string | null;
          readonly network: "stacks:1" | "stacks:2147483648";
          readonly asset_contract: string;
          readonly is_active: boolean;
          readonly created_at: string;
          readonly updated_at: string;
          readonly total_calls: number;
          readonly total_earned_usdcx: number;
        };
        readonly Insert: {
          readonly vault_id?: string;
          readonly provider_address: string;
          readonly origin_url: string;
          readonly price_usdcx: number;
          readonly rate_limit?: number;
          readonly resource_name: string;
          readonly description?: string | null;
          readonly webhook_url?: string | null;
          readonly network?: "stacks:1" | "stacks:2147483648";
          readonly asset_contract?: string;
          readonly is_active?: boolean;
          readonly created_at?: string;
          readonly updated_at?: string;
          readonly total_calls?: number;
          readonly total_earned_usdcx?: number;
        };
        readonly Update: {
          readonly provider_address?: string;
          readonly origin_url?: string;
          readonly price_usdcx?: number;
          readonly rate_limit?: number;
          readonly resource_name?: string;
          readonly description?: string | null;
          readonly webhook_url?: string | null;
          readonly network?: "stacks:1" | "stacks:2147483648";
          readonly asset_contract?: string;
          readonly is_active?: boolean;
          readonly updated_at?: string;
          readonly total_calls?: number;
          readonly total_earned_usdcx?: number;
        };
        readonly Relationships: [];
      };
      readonly calls: {
        readonly Row: {
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
          readonly x402_payload: Json | null;
          readonly webhook_delivered: boolean | null;
        };
        readonly Insert: {
          readonly call_id?: string;
          readonly vault_id: string;
          readonly payer_address: string;
          readonly txid: string;
          readonly block_height?: number | null;
          readonly amount_usdcx: number;
          readonly path: string;
          readonly method: string;
          readonly origin_status?: number | null;
          readonly settled_at?: string;
          readonly x402_payload?: Json | null;
          readonly webhook_delivered?: boolean | null;
        };
        readonly Update: {
          readonly payer_address?: string;
          readonly txid?: string;
          readonly block_height?: number | null;
          readonly amount_usdcx?: number;
          readonly path?: string;
          readonly method?: string;
          readonly origin_status?: number | null;
          readonly settled_at?: string;
          readonly x402_payload?: Json | null;
          readonly webhook_delivered?: boolean | null;
        };
        readonly Relationships: [];
      };
    };
    readonly Views: { [_ in never]: never };
    readonly Functions: {
      readonly increment_vault_counters: {
        readonly Args: {
          readonly p_vault_id: string;
          readonly p_amount_usdcx: number;
        };
        readonly Returns: undefined;
      };
    };
    readonly Enums: { [_ in never]: never };
    readonly CompositeTypes: { [_ in never]: never };
  };
};

export type VaultRow = Database["public"]["Tables"]["vaults"]["Row"];
export type CallRow = Database["public"]["Tables"]["calls"]["Row"];

export interface DashboardCallRow extends CallRow {
  readonly txidDisplay: string;
  readonly explorerUrl: string;
  readonly status: "success" | "origin_error";
}

export interface VaultWithRecentCalls extends VaultRow {
  readonly wrappedUrl: string;
  readonly recentCalls: DashboardCallRow[];
}
