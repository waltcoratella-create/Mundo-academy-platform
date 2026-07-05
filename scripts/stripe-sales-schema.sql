-- Sales flow hardening for Stripe webhooks → Supabase (idempotent, re-runnable).
--
-- Audit findings this migration addresses:
--  * transactions had no stripe_session_id column → no way to dedupe webhook retries
--    of checkout.session.completed.
--  * No unique indexes on Stripe ids → a retried webhook could double-count revenue.
--  * members had no unique key for (business, product, user) → upsert impossible.

-- 1) transactions.stripe_session_id (add if missing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions'
      and column_name = 'stripe_session_id'
  ) then
    execute 'alter table public.transactions add column stripe_session_id text';
  end if;
end $$;

-- 2) Dedup guards for webhook retries (partial: NULLs stay allowed/multiple)
create unique index if not exists transactions_stripe_session_uidx
  on public.transactions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists transactions_stripe_pi_uidx
  on public.transactions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- 3) One member row per (business, product, user) so the webhook can upsert
create unique index if not exists members_biz_prod_user_uidx
  on public.members (business_id, product_id, user_id);
