-- Ad campaigns (builder drafts). Idempotent and re-runnable.
--
-- Built against the introspected live schema (see real-schema-snapshot.md):
-- businesses.id, users.id and products.id are all uuid, so the FKs below are
-- uuid. Nothing here talks to Meta — `platform` and the jsonb blobs are the
-- forward-compatible seam for a future integration.

create table if not exists public.ad_campaigns (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  user_id         uuid not null references public.users(id)      on delete cascade,
  product_id      uuid references public.products(id)            on delete set null,
  name            text not null,
  objective       text not null,
  status          text not null default 'draft',
  destination_url text,
  budget_type     text not null default 'daily',
  budget_amount   numeric(10,2),
  currency        text not null default 'USD',
  starts_at       timestamptz,
  ends_at         timestamptz,
  -- Not in the original column list, but step 4 of the builder collects a
  -- timezone and neither jsonb blob is a sane home for schedule metadata.
  timezone        text not null default 'UTC',
  audience        jsonb not null default '{}'::jsonb,
  creative        jsonb not null default '{}'::jsonb,
  platform        text not null default 'meta',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── Value constraints (added separately so re-runs on an existing table work) ──
do $$
begin
  -- Backfill for tables created by an earlier run of this script.
  if not exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ad_campaigns' and column_name = 'timezone') then
    alter table public.ad_campaigns add column timezone text not null default 'UTC';
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass and conname = 'ad_campaigns_objective_chk') then
    alter table public.ad_campaigns add constraint ad_campaigns_objective_chk
      check (objective in ('sales','leads','traffic','awareness'));
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass and conname = 'ad_campaigns_status_chk') then
    alter table public.ad_campaigns add constraint ad_campaigns_status_chk
      check (status in ('draft','in_review','active','paused','archived'));
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass and conname = 'ad_campaigns_budget_type_chk') then
    alter table public.ad_campaigns add constraint ad_campaigns_budget_type_chk
      check (budget_type in ('daily','lifetime'));
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass and conname = 'ad_campaigns_budget_amount_chk') then
    alter table public.ad_campaigns add constraint ad_campaigns_budget_amount_chk
      check (budget_amount is null or budget_amount > 0);
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass and conname = 'ad_campaigns_dates_chk') then
    alter table public.ad_campaigns add constraint ad_campaigns_dates_chk
      check (ends_at is null or starts_at is null or ends_at > starts_at);
  end if;
end $$;

-- ── Lookup index for the dashboard listing ───────────────────────────────────
create index if not exists ad_campaigns_business_created_idx
  on public.ad_campaigns (business_id, created_at desc);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.touch_ad_campaigns_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ad_campaigns_touch_updated_at on public.ad_campaigns;
create trigger ad_campaigns_touch_updated_at
  before update on public.ad_campaigns
  for each row execute function public.touch_ad_campaigns_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- The app reads/writes through the service-role admin client (which bypasses
-- RLS), so this is defence in depth for any future anon/authenticated access.
-- owner_id type is detected rather than assumed, mirroring
-- analytics-realtime-schema.sql.
alter table public.ad_campaigns enable row level security;

do $$
declare
  v_type text;
  cmp    text;
begin
  select data_type into v_type from information_schema.columns
    where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id';

  cmp := case when v_type = 'uuid' then 'auth.uid()' else 'auth.uid()::text' end;

  drop policy if exists ad_campaigns_owner_all on public.ad_campaigns;
  execute format($f$
    create policy ad_campaigns_owner_all on public.ad_campaigns
      for all
      using (exists (
        select 1 from public.businesses b
        join public.users u on u.id = b.owner_id
        where b.id = ad_campaigns.business_id and u.id = %s
      ))
  $f$, cmp);
end $$;
