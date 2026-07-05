-- Definitive sales-flow migration, built from the INTROSPECTED live schema
-- (2026-07). Idempotent and re-runnable.
--
-- Real schema findings this adapts to:
--  * transactions: only (id, user_id, business_id, product_id, amount int, currency,
--    created_at). No status / stripe ids / member_id → analytics status filters were
--    failing and webhook dedup was impossible.
--  * members: a team table (id, user_id, business_id, role, created_at). No
--    product_id / status / stripe_subscription_id / current_period_end → analytics
--    member metrics and subscription sync had nothing to write to.
--  * amount/price are INTEGER → decimal prices (49.99) would be rounded. Widened
--    to numeric(10,2); integer→numeric is a lossless cast. App semantics stay
--    "currency units" (not cents) everywhere.

do $$
declare
  v_type text;
begin
  -- ── transactions: columns the webhook writes and analytics reads ──────────
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='status') then
    execute $q$alter table public.transactions
      add column status text not null default 'succeeded'$q$;
    raise notice 'Added transactions.status';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='stripe_payment_intent_id') then
    execute 'alter table public.transactions add column stripe_payment_intent_id text';
    raise notice 'Added transactions.stripe_payment_intent_id';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='stripe_session_id') then
    execute 'alter table public.transactions add column stripe_session_id text';
    raise notice 'Added transactions.stripe_session_id';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='member_id') then
    execute 'alter table public.transactions add column member_id uuid references public.members(id) on delete set null';
    raise notice 'Added transactions.member_id';
  end if;

  -- Money precision: integer would round decimal amounts (49.99 → 50)
  select data_type into v_type from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='amount';
  if v_type = 'integer' then
    execute 'alter table public.transactions alter column amount type numeric(10,2)';
    raise notice 'Widened transactions.amount integer → numeric(10,2)';
  end if;

  select data_type into v_type from information_schema.columns
    where table_schema='public' and table_name='products' and column_name='price';
  if v_type = 'integer' then
    execute 'alter table public.products alter column price type numeric(10,2)';
    raise notice 'Widened products.price integer → numeric(10,2)';
  end if;

  -- ── members: subscription columns for analytics + webhook sync ────────────
  -- (role/created_at stay untouched; existing team rows keep working)
  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='product_id') then
    execute 'alter table public.members add column product_id uuid references public.products(id) on delete set null';
    raise notice 'Added members.product_id';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='status') then
    execute $q$alter table public.members
      add column status text not null default 'active'$q$;
    raise notice 'Added members.status';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='stripe_subscription_id') then
    execute 'alter table public.members add column stripe_subscription_id text';
    raise notice 'Added members.stripe_subscription_id';
  end if;

  if not exists (select 1 from information_schema.columns
    where table_schema='public' and table_name='members' and column_name='current_period_end') then
    execute 'alter table public.members add column current_period_end timestamptz';
    raise notice 'Added members.current_period_end';
  end if;
end $$;

-- ── Dedup guards for webhook retries (partial: NULLs allowed/multiple) ───────
create unique index if not exists transactions_stripe_session_uidx
  on public.transactions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists transactions_stripe_pi_uidx
  on public.transactions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- One member row per (business, product, user). NULL product_id (team rows)
-- is not constrained — Postgres treats NULLs as distinct.
create unique index if not exists members_biz_prod_user_uidx
  on public.members (business_id, product_id, user_id);

-- ── Lookup/performance indexes used by analytics + webhook ───────────────────
create index if not exists transactions_business_created_idx
  on public.transactions (business_id, created_at);

create index if not exists members_business_created_idx
  on public.members (business_id, created_at);

create index if not exists members_stripe_sub_idx
  on public.members (stripe_subscription_id)
  where stripe_subscription_id is not null;
