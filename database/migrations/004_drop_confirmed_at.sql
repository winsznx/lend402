-- =============================================================================
-- 004_drop_confirmed_at.sql
-- Drop legacy confirmed_at column from calls.
-- Migration 002 migrated its data into settled_at; this column is unused but
-- still has a NOT NULL constraint that causes every new call insert to fail.
-- =============================================================================

ALTER TABLE public.calls
  DROP COLUMN IF EXISTS confirmed_at;
