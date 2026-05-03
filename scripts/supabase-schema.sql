-- Mundo Academy — Supabase Schema MVP
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to run multiple times (idempotent via IF NOT EXISTS / OR REPLACE)

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Mirrors Clerk users. id = Clerk userId (text).
create table if not exists public.users (
  id                 text        primary key,
  email              text        not null,
  full_name          text,
  avatar_url         text,
  stripe_customer_id text,
  is_pro             boolean     not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ─── Businesses ──────────────────────────────────────────────────────────────
create table if not exists public.businesses (
  id              uuid        primary key default uuid_generate_v4(),
  owner_id        text        not null references public.users(id) on delete cascade,
  name            text        not null,
  slug            text        not null unique,
  tagline         text,
  description     text,
  type            text        not null default 'course',
  -- course | community | service | subscription | mentoring | digital_product | agency | saas
  status          text        not null default 'draft',
  -- draft | active | paused | archived
  cover_image_url text,
  logo_url        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id              uuid        primary key default uuid_generate_v4(),
  business_id     uuid        not null references public.businesses(id) on delete cascade,
  name            text        not null,
  description     text,
  price           numeric(10,2) not null default 0,
  currency        text        not null default 'USD',
  billing_period  text        not null default 'monthly',
  -- one_time | monthly | annual
  stripe_price_id text,
  active          boolean     not null default true,
  created_at      timestamptz not null default now()
);

-- ─── Members ─────────────────────────────────────────────────────────────────
-- Users who have purchased / joined a business.
create table if not exists public.members (
  id                     uuid        primary key default uuid_generate_v4(),
  business_id            uuid        not null references public.businesses(id) on delete cascade,
  user_id                text        not null references public.users(id) on delete cascade,
  product_id             uuid        references public.products(id) on delete set null,
  status                 text        not null default 'active',
  -- trial | active | cancelled | paused
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  unique (business_id, user_id)
);

-- ─── Transactions ─────────────────────────────────────────────────────────────
create table if not exists public.transactions (
  id                       uuid        primary key default uuid_generate_v4(),
  business_id              uuid        not null references public.businesses(id) on delete cascade,
  member_id                uuid        references public.members(id) on delete set null,
  user_id                  text        references public.users(id) on delete set null,
  product_id               uuid        references public.products(id) on delete set null,
  amount                   numeric(10,2) not null,
  currency                 text        not null default 'USD',
  status                   text        not null default 'pending',
  -- succeeded | pending | failed | refunded
  stripe_payment_intent_id text,
  created_at               timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists businesses_owner_id_idx      on public.businesses(owner_id);
create index if not exists products_business_id_idx     on public.products(business_id);
create index if not exists members_business_id_idx      on public.members(business_id);
create index if not exists members_user_id_idx          on public.members(user_id);
create index if not exists transactions_business_id_idx on public.transactions(business_id);
create index if not exists transactions_created_at_idx  on public.transactions(created_at desc);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_users'
  ) then
    create trigger set_updated_at_users
      before update on public.users
      for each row execute function public.set_updated_at();
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_updated_at_businesses'
  ) then
    create trigger set_updated_at_businesses
      before update on public.businesses
      for each row execute function public.set_updated_at();
  end if;
end $$;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- RLS is ENABLED. No public policies are created here.
-- Server-side API routes use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- Browser/anon clients cannot read any table (deny by default = no policies).
--
-- TODO for production — add these policies:
--
-- create policy "Users can read own profile"
--   on public.users for select using (id = auth.uid()::text);
--
-- create policy "Owners can read own businesses"
--   on public.businesses for select using (owner_id = auth.uid()::text);
--
-- create policy "Owners can read their products"
--   on public.products for select using (
--     business_id in (select id from public.businesses where owner_id = auth.uid()::text)
--   );
--
-- create policy "Owners can read their members"
--   on public.members for select using (
--     business_id in (select id from public.businesses where owner_id = auth.uid()::text)
--   );
--
-- create policy "Owners can read their transactions"
--   on public.transactions for select using (
--     business_id in (select id from public.businesses where owner_id = auth.uid()::text)
--   );

alter table public.users        enable row level security;
alter table public.businesses   enable row level security;
alter table public.products     enable row level security;
alter table public.members      enable row level security;
alter table public.transactions enable row level security;
