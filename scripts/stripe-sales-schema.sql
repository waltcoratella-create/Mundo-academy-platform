-- Sales flow hardening for Stripe webhooks → Supabase (idempotent, re-runnable).
--
-- The live schema differs from scripts/supabase-schema.sql: transactions may be
-- missing stripe_payment_intent_id (and possibly member_id). This migration adds
-- every column the webhook writes if it is missing, then creates the dedup
-- guards. Safe to run multiple times.

do $$
begin
  -- transactions.stripe_payment_intent_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions'
      and column_name = 'stripe_payment_intent_id'
  ) then
    execute 'alter table public.transactions add column stripe_payment_intent_id text';
    raise notice 'Added transactions.stripe_payment_intent_id';
  end if;

  -- transactions.stripe_session_id
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions'
      and column_name = 'stripe_session_id'
  ) then
    execute 'alter table public.transactions add column stripe_session_id text';
    raise notice 'Added transactions.stripe_session_id';
  end if;

  -- transactions.member_id (webhook links each sale to its analytics member)
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions'
      and column_name = 'member_id'
  ) then
    execute 'alter table public.transactions add column member_id uuid references public.members(id) on delete set null';
    raise notice 'Added transactions.member_id';
  end if;
end $$;

-- Dedup guards for webhook retries (partial: NULLs stay allowed/multiple)
create unique index if not exists transactions_stripe_session_uidx
  on public.transactions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists transactions_stripe_pi_uidx
  on public.transactions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- One member row per (business, product, user) so the webhook can upsert
create unique index if not exists members_biz_prod_user_uidx
  on public.members (business_id, product_id, user_id);
