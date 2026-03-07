type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      vaults: {
        Row: {
          vault_id: string;
          provider_address: string;
          origin_url: string;
          price_usdcx: number;
          rate_limit: number;
          resource_name: string;
          description: string | null;
          webhook_url: string | null;
          network: "stacks:1" | "stacks:2147483648";
          asset_contract: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          total_calls: number;
          total_earned_usdcx: number;
        };
        Insert: {
          vault_id?: string;
          provider_address: string;
          origin_url: string;
          price_usdcx: number;
          rate_limit?: number;
          resource_name: string;
          description?: string | null;
          webhook_url?: string | null;
          network?: "stacks:1" | "stacks:2147483648";
          asset_contract?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          total_calls?: number;
          total_earned_usdcx?: number;
        };
        Update: {
          provider_address?: string;
          origin_url?: string;
          price_usdcx?: number;
          rate_limit?: number;
          resource_name?: string;
          description?: string | null;
          webhook_url?: string | null;
          network?: "stacks:1" | "stacks:2147483648";
          asset_contract?: string;
          is_active?: boolean;
          updated_at?: string;
          total_calls?: number;
          total_earned_usdcx?: number;
        };
        Relationships: [];
      };
      calls: {
        Row: {
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
          x402_payload: Json | null;
          webhook_delivered: boolean | null;
        };
        Insert: {
          call_id?: string;
          vault_id: string;
          payer_address: string;
          txid: string;
          block_height?: number | null;
          amount_usdcx: number;
          path: string;
          method: string;
          origin_status?: number | null;
          settled_at?: string;
          x402_payload?: Json | null;
          webhook_delivered?: boolean | null;
        };
        Update: {
          payer_address?: string;
          txid?: string;
          block_height?: number | null;
          amount_usdcx?: number;
          path?: string;
          method?: string;
          origin_status?: number | null;
          settled_at?: string;
          x402_payload?: Json | null;
          webhook_delivered?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      increment_vault_counters: {
        Args: {
          p_vault_id: string;
          p_amount_usdcx: number;
        };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type VaultRow = Database["public"]["Tables"]["vaults"]["Row"];
export type CallRow = Database["public"]["Tables"]["calls"]["Row"];

export interface DashboardCallRow extends CallRow {
  txidDisplay: string;
  explorerUrl: string;
  status: "success" | "origin_error";
}

export interface VaultWithRecentCalls extends VaultRow {
  wrappedUrl: string;
  recentCalls: DashboardCallRow[];
}
