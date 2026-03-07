-- =============================================================================
-- 001_api_vault.sql
-- API Vault schema: vaults + calls tables
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- vaults — registered API gateways
-- ---------------------------------------------------------------------------

create table if not exists vaults (
  id               uuid        primary key default gen_random_uuid(),
  owner_address    text        not null,
  api_name         text        not null check (char_length(api_name) between 1 and 80),
  upstream_url     text        not null,
  price_usdcx      bigint      not null check (price_usdcx > 0),
  merchant_address text        not null,
  status           text        not null default 'active' check (status in ('active', 'paused', 'deleted')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists vaults_owner_idx on vaults (owner_address);
create index if not exists vaults_status_idx on vaults (status);

-- ---------------------------------------------------------------------------
-- calls — payment records per vault API call
-- ---------------------------------------------------------------------------

create table if not exists calls (
  id              uuid        primary key default gen_random_uuid(),
  vault_id        uuid        not null references vaults(id) on delete cascade,
  payer_address   text        not null,
  txid            text        not null unique,
  amount_usdcx    bigint      not null check (amount_usdcx > 0),
  block_height    integer     not null,
  confirmed_at    bigint      not null,
  upstream_status integer,
  call_status     text        not null default 'pending' check (call_status in ('pending', 'confirmed', 'failed')),
  created_at      timestamptz not null default now()
);

create index if not exists calls_vault_id_idx     on calls (vault_id);
create index if not exists calls_payer_idx         on calls (payer_address);
create index if not exists calls_txid_idx          on calls (txid);
create index if not exists calls_created_at_idx    on calls (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger for vaults
-- ---------------------------------------------------------------------------

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vaults_updated_at on vaults;
create trigger vaults_updated_at
  before update on vaults
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

alter table vaults enable row level security;
alter table calls  enable row level security;

-- Public read for active vaults (needed for gateway to look up price/upstream)
create policy "public_read_active_vaults"
  on vaults for select
  using (status = 'active');

-- Owner can do full CRUD on their own vaults
create policy "owner_all_vaults"
  on vaults for all
  using (owner_address = current_setting('app.current_address', true))
  with check (owner_address = current_setting('app.current_address', true));

-- Owner can read their own calls
create policy "owner_read_calls"
  on calls for select
  using (
    vault_id in (
      select id from vaults
      where owner_address = current_setting('app.current_address', true)
    )
  );

-- Service role can insert/update calls (set via service key)
create policy "service_write_calls"
  on calls for insert
  with check (true);

create policy "service_update_calls"
  on calls for update
  using (true);
