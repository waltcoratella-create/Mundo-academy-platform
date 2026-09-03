-- Allow the 'engagement' objective on ad_campaigns. Idempotent and re-runnable.
--
-- The builder has offered "Interacción" since the objective cards were added,
-- but ad_campaigns_objective_chk was created before it existed, so saving that
-- objective fails with 23514. This widens the constraint to the five objectives
-- the UI actually offers.
--
-- objective stays NOT NULL: choosing one is a structural decision of the
-- campaign, not something a draft can defer. Nothing else in the schema is
-- touched.
--
-- Paste into Supabase → SQL Editor.

do $$
begin
  -- Drop and recreate rather than ALTER: a CHECK constraint cannot be widened
  -- in place, and the name is kept so the schema file stays the description of
  -- record.
  if exists (select 1 from pg_constraint
    where conrelid = 'public.ad_campaigns'::regclass
      and conname = 'ad_campaigns_objective_chk') then
    alter table public.ad_campaigns drop constraint ad_campaigns_objective_chk;
  end if;

  alter table public.ad_campaigns add constraint ad_campaigns_objective_chk
    check (objective in ('sales','leads','engagement','traffic','awareness'));
end $$;

-- Verification: expects the five values above.
--
--   select pg_get_constraintdef(oid) as objective_check
--   from pg_constraint
--   where conrelid = 'public.ad_campaigns'::regclass
--     and conname = 'ad_campaigns_objective_chk';
