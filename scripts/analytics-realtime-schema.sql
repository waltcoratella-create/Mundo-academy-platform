-- Enable Supabase Realtime for the analytics source tables (transactions, members)
-- and let the business owner receive changes for their own business.
--
-- Fully idempotent: safe to run multiple times.
--  * Publication membership is checked against pg_publication_tables before adding.
--  * Policies are (re)created via drop-if-exists + create, so re-runs never fail
--    and the policy always reflects the detected column type.
--  * The real type of businesses.owner_id (and users.id) is detected from
--    information_schema; the auth.uid() comparison adapts automatically:
--      - uuid  -> b.owner_id = auth.uid()
--      - text  -> b.owner_id = auth.uid()::text
--
-- Server-side reads use the service-role key and bypass RLS; these policies only
-- govern direct (anon/authenticated) clients, which is what Realtime delivery uses.

do $$
declare
  owner_type text;
  users_id_type text;
  cmp text;
begin
  -- ── 1/2. Publication membership (only add if missing) ──────────────────────
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transactions'
  ) then
    execute 'alter publication supabase_realtime add table public.transactions';
    raise notice 'Added public.transactions to supabase_realtime';
  else
    raise notice 'public.transactions already in supabase_realtime — skipped';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'members'
  ) then
    execute 'alter publication supabase_realtime add table public.members';
    raise notice 'Added public.members to supabase_realtime';
  else
    raise notice 'public.members already in supabase_realtime — skipped';
  end if;

  -- ── RLS (ENABLE is idempotent — no error if already enabled) ───────────────
  execute 'alter table public.transactions enable row level security';
  execute 'alter table public.members enable row level security';

  -- ── 4-6. Detect real column types and adapt the auth.uid() comparison ──────
  select data_type into owner_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'businesses' and column_name = 'owner_id';

  select data_type into users_id_type
  from information_schema.columns
  where table_schema = 'public' and table_name = 'users' and column_name = 'id';

  raise notice 'Detected businesses.owner_id type: %, users.id type: %', owner_type, users_id_type;

  if owner_type = 'uuid' then
    cmp := 'b.owner_id = auth.uid()';
  else
    cmp := 'b.owner_id = auth.uid()::text';
  end if;

  -- ── 3. Policies: drop-if-exists + create (re-runnable, type-aware) ─────────
  execute 'drop policy if exists "analytics_tx_select" on public.transactions';
  execute format(
    'create policy "analytics_tx_select" on public.transactions for select using ('
    || 'exists (select 1 from public.businesses b '
    || 'where b.id = transactions.business_id and %s))',
    cmp
  );

  execute 'drop policy if exists "analytics_members_select" on public.members';
  execute format(
    'create policy "analytics_members_select" on public.members for select using ('
    || 'exists (select 1 from public.businesses b '
    || 'where b.id = members.business_id and %s))',
    cmp
  );

  raise notice 'Policies created with comparison: %', cmp;
end $$;
