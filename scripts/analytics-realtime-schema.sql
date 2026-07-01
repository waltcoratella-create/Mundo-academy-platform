-- Enable Supabase Realtime for the analytics source tables and let the business
-- owner receive changes for their own business. Mirrors the direct-messages setup
-- (RLS with auth.uid()). Server-side reads use the service-role key and bypass RLS.

-- 1) Add the tables to the realtime publication (idempotent-ish; ignore if already added).
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.members;

-- 2) Row Level Security so a direct (anon/authenticated) client only sees its own
--    business rows. Only SELECT is needed for Realtime delivery.
alter table public.transactions enable row level security;
alter table public.members      enable row level security;

drop policy if exists "analytics_tx_select" on public.transactions;
create policy "analytics_tx_select"
  on public.transactions for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = transactions.business_id
        and b.owner_id = auth.uid()::text
    )
  );

drop policy if exists "analytics_members_select" on public.members;
create policy "analytics_members_select"
  on public.members for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = members.business_id
        and b.owner_id = auth.uid()::text
    )
  );
