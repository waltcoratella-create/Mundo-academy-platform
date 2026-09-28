-- Publish lifecycle: from smoke pipeline to product feature.
-- Idempotent and re-runnable. Touches ONLY this database — nothing in Meta.
--
-- 1. ad_campaigns can be 'published'.
-- 2. DSA declarations are stored per business, explicitly confirmed by a person.
-- 3. Each publish keeps a snapshot of the DSA it actually declared to Meta.
-- 4. Link rows can no longer vanish with their campaign (CASCADE → RESTRICT):
--    they are the only record of which objects exist in Meta.
-- 5. Closing a publish and flipping the campaign happen in one transaction.
-- 6. Backfill: the smoke campaign that did publish is marked as such locally.
--
-- Paste into Supabase → SQL Editor.

-- ── 1 · Lifecycle status ────────────────────────────────────────────────────
-- 'in_review','active','paused','archived' stay for compatibility; the product
-- only writes 'draft' and 'published'. Meta's own status is read live and never
-- stored as local truth.
alter table public.ad_campaigns drop constraint if exists ad_campaigns_status_chk;
alter table public.ad_campaigns add constraint ad_campaigns_status_chk
  check (status in ('draft','published','in_review','active','paused','archived'));

-- ── 2 · DSA per business ────────────────────────────────────────────────────
-- Legal declarations shown publicly in the EU ad library. Never inferred from a
-- page name: a person types them and confirms them, and we record who and when.
create table if not exists public.business_ad_settings (
  business_id       uuid primary key references public.businesses(id) on delete cascade,
  dsa_beneficiary   text,
  dsa_payor         text,
  dsa_confirmed_at  timestamptz,
  dsa_confirmed_by  uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

do $$
begin
  -- Both or neither, never blank, and a confirmation whenever they are set.
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.business_ad_settings'::regclass
      and conname = 'business_ad_settings_dsa_chk') then
    alter table public.business_ad_settings add constraint business_ad_settings_dsa_chk
      check (
        (dsa_beneficiary is null and dsa_payor is null)
        or (
          length(btrim(dsa_beneficiary)) between 1 and 200
          and length(btrim(dsa_payor)) between 1 and 200
          and dsa_confirmed_at is not null
          and dsa_confirmed_by is not null
        )
      );
  end if;
end $$;

drop trigger if exists business_ad_settings_touch_updated_at on public.business_ad_settings;
create trigger business_ad_settings_touch_updated_at
  before update on public.business_ad_settings
  for each row execute function public.meta_publish_links_touch();

alter table public.business_ad_settings enable row level security;
alter table public.business_ad_settings force row level security;
revoke all on public.business_ad_settings from anon, authenticated;

-- ── 3 · DSA snapshot per publish ────────────────────────────────────────────
-- What was actually declared for THIS campaign, even if the business later
-- changes its settings.
alter table public.meta_campaign_links add column if not exists dsa_beneficiary_used text;
alter table public.meta_campaign_links add column if not exists dsa_payor_used text;

-- ── 4 · Link rows outlive nothing: CASCADE → RESTRICT ───────────────────────
-- Deleting a campaign must not silently erase the ids of objects that still
-- exist in Meta. Only rewritten when the current rule is not already RESTRICT.
do $$
begin
  if exists (select 1 from pg_constraint
    where conname = 'meta_campaign_links_ad_campaign_id_fkey' and confdeltype <> 'r') then
    alter table public.meta_campaign_links drop constraint meta_campaign_links_ad_campaign_id_fkey;
    alter table public.meta_campaign_links add constraint meta_campaign_links_ad_campaign_id_fkey
      foreign key (ad_campaign_id) references public.ad_campaigns(id) on delete restrict;
  end if;

  if exists (select 1 from pg_constraint
    where conname = 'meta_ad_links_ad_campaign_id_fkey' and confdeltype <> 'r') then
    alter table public.meta_ad_links drop constraint meta_ad_links_ad_campaign_id_fkey;
    alter table public.meta_ad_links add constraint meta_ad_links_ad_campaign_id_fkey
      foreign key (ad_campaign_id) references public.ad_campaigns(id) on delete restrict;
  end if;
end $$;

-- ── 5 · Close a publish atomically ──────────────────────────────────────────
-- Only the run holding the lock can close it; the campaign flips in the same
-- transaction, so the two tables can never disagree about "published".
create or replace function public.mark_campaign_published(
  p_ad_campaign_id uuid,
  p_attempt_token  uuid
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_rows int;
begin
  update public.meta_campaign_links
     set publish_status = 'published',
         publish_step   = 'done',
         published_at   = now(),
         attempt_token  = null,
         publish_error  = null
   where ad_campaign_id = p_ad_campaign_id
     and attempt_token  = p_attempt_token;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  update public.ad_campaigns
     set status = 'published'
   where id = p_ad_campaign_id
     and status = 'draft';

  return true;
end $$;

revoke all on function public.mark_campaign_published(uuid, uuid) from public, anon, authenticated;
grant execute on function public.mark_campaign_published(uuid, uuid) to service_role;

-- ── 6 · Backfill (local only) ───────────────────────────────────────────────
-- Campaigns whose publish completed before this lifecycle existed.
update public.ad_campaigns c
   set status = 'published'
  from public.meta_campaign_links l
 where l.ad_campaign_id = c.id
   and l.publish_status = 'published'
   and c.status = 'draft';

-- The smoke campaign declared these exact values to Meta (verified in Ads
-- Manager on 2026-09-28). Historical fact for this row only — not a setting.
update public.meta_campaign_links
   set dsa_beneficiary_used = 'Mundo Academy',
       dsa_payor_used       = 'Grupo Mundo Ejecutivo'
 where ad_campaign_id = '1ddc1cd1-4134-4b13-9e9c-1dfd217812cd'
   and publish_status = 'published'
   and dsa_beneficiary_used is null;

-- Verification:
--   select id, status from public.ad_campaigns where status = 'published';
--   select ad_campaign_id, publish_status, dsa_beneficiary_used, dsa_payor_used
--     from public.meta_campaign_links;
