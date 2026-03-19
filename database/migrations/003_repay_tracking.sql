-- =============================================================================
-- 003_repay_tracking.sql
-- Add auto-repay lifecycle columns to the calls table.
-- =============================================================================

ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS repay_status  VARCHAR(20)   DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS repay_txid    VARCHAR(128),
  ADD COLUMN IF NOT EXISTS repay_confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_calls_repay_status
  ON public.calls(repay_status)
  WHERE repay_status != 'confirmed';
