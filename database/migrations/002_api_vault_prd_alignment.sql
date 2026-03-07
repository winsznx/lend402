-- =============================================================================
-- 002_api_vault_prd_alignment.sql
-- Align the legacy API vault schema to the Stacks-native gateway model.
-- =============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'id'
  ) then
    alter table public.vaults rename column id to vault_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'owner_address'
  ) then
    alter table public.vaults rename column owner_address to provider_address;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'upstream_url'
  ) then
    alter table public.vaults rename column upstream_url to origin_url;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'api_name'
  ) then
    alter table public.vaults rename column api_name to resource_name;
  end if;
end $$;

alter table public.vaults
  add column if not exists rate_limit integer not null default 60
    check (rate_limit between 1 and 1000),
  add column if not exists description varchar(256),
  add column if not exists webhook_url text,
  add column if not exists network varchar(32) not null default 'stacks:1',
  add column if not exists asset_contract text not null default 'SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx',
  add column if not exists is_active boolean not null default true,
  add column if not exists total_calls bigint not null default 0,
  add column if not exists total_earned_usdcx bigint not null default 0;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'merchant_address'
  ) then
    execute $sql$
      update public.vaults
      set provider_address = coalesce(nullif(merchant_address, ''), provider_address)
    $sql$;

    alter table public.vaults drop column merchant_address;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vaults'
      and column_name = 'status'
  ) then
    execute $sql$
      update public.vaults
      set is_active = case
        when status = 'active' then true
        else false
      end
    $sql$;
  end if;
end $$;

update public.vaults
set resource_name = left(resource_name, 64)
where char_length(resource_name) > 64;

alter table public.vaults
  alter column provider_address set not null,
  alter column origin_url set not null,
  alter column resource_name type varchar(64),
  alter column resource_name set not null,
  alter column price_usdcx set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'unique_provider_origin'
  ) then
    alter table public.vaults
      add constraint unique_provider_origin unique (provider_address, origin_url);
  end if;
end $$;

create index if not exists idx_vaults_provider on public.vaults(provider_address);
create index if not exists idx_vaults_active on public.vaults(is_active) where is_active = true;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calls'
      and column_name = 'id'
  ) then
    alter table public.calls rename column id to call_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calls'
      and column_name = 'upstream_status'
  ) then
    alter table public.calls rename column upstream_status to origin_status;
  end if;
end $$;

alter table public.calls
  add column if not exists path text not null default '/',
  add column if not exists method varchar(10) not null default 'GET',
  add column if not exists settled_at timestamptz not null default now(),
  add column if not exists x402_payload jsonb,
  add column if not exists webhook_delivered boolean;

do $$
declare
  has_confirmed_at boolean;
  has_created_at boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calls'
      and column_name = 'confirmed_at'
  ) into has_confirmed_at;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'calls'
      and column_name = 'created_at'
  ) into has_created_at;

  if has_confirmed_at and has_created_at then
    execute $sql$
      update public.calls
      set settled_at = coalesce(settled_at, to_timestamp(confirmed_at), created_at, now())
    $sql$;
  elsif has_confirmed_at then
    execute $sql$
      update public.calls
      set settled_at = coalesce(settled_at, to_timestamp(confirmed_at), now())
    $sql$;
  elsif has_created_at then
    execute $sql$
      update public.calls
      set settled_at = coalesce(settled_at, created_at, now())
    $sql$;
  else
    execute $sql$
      update public.calls
      set settled_at = coalesce(settled_at, now())
    $sql$;
  end if;
end $$;

alter table public.calls
  alter column block_height drop not null;

create index if not exists idx_calls_vault_settled on public.calls(vault_id, settled_at desc);

drop policy if exists "public_read_active_vaults" on public.vaults;
create policy "public_read_active_vaults"
  on public.vaults for select
  using (is_active = true);

drop policy if exists "owner_all_vaults" on public.vaults;
create policy "owner_all_vaults"
  on public.vaults for all
  using (provider_address = current_setting('app.current_address', true))
  with check (provider_address = current_setting('app.current_address', true));

drop policy if exists "owner_read_calls" on public.calls;
create policy "owner_read_calls"
  on public.calls for select
  using (
    vault_id in (
      select vault_id
      from public.vaults
      where provider_address = current_setting('app.current_address', true)
    )
  );

drop policy if exists "service_write_calls" on public.calls;
create policy "service_write_calls"
  on public.calls for insert
  with check (true);

drop policy if exists "service_update_calls" on public.calls;
create policy "service_update_calls"
  on public.calls for update
  using (true);

create or replace function public.increment_vault_counters(
  p_vault_id uuid,
  p_amount_usdcx bigint
)
returns void
language sql
as $$
  update public.vaults
  set total_calls = total_calls + 1,
      total_earned_usdcx = total_earned_usdcx + p_amount_usdcx
  where vault_id = p_vault_id;
$$;
