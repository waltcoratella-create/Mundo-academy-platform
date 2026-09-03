-- Publish links: what we created in Meta for each local campaign.
-- Idempotent and re-runnable.
--
-- These rows are the memory of the publish pipeline. They exist so a run that
-- dies halfway — a Vercel timeout, a lost response, a user pressing twice —
-- can be resumed instead of creating a second campaign that spends real money.
--
-- Nothing here stores a token. Locked down like meta_connections: RLS ENABLE +
-- FORCE with zero policies, so only the service role reads it, and only from
-- src/lib/meta.
--
-- Paste into Supabase → SQL Editor.

create table if not exists public.meta_campaign_links (
  id                uuid primary key default gen_random_uuid(),
  ad_campaign_id    uuid not null unique references public.ad_campaigns(id) on delete cascade,

  meta_campaign_id  text,
  meta_adset_id     text,

  -- idle | running | partial | failed | published
  publish_status    text not null default 'idle',
  -- campaign | adset | creative | ad | done
  publish_step      text not null default 'campaign',
  publish_error     text,

  -- Identifies the run that currently holds the lock. Whoever wrote it owns
  -- the pipeline; a different token means someone else took over.
  attempt_token     uuid,
  attempt_started_at timestamptz,

  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.meta_ad_links (
  id                uuid primary key default gen_random_uuid(),
  ad_campaign_id    uuid not null references public.ad_campaigns(id) on delete cascade,
  -- CampaignAd.id inside the creative jsonb. Stable per ad.
  local_ad_id       text not null,

  meta_video_id     text,
  meta_creative_id  text,
  meta_ad_id        text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_campaign_links'::regclass
      and conname = 'meta_campaign_links_status_chk') then
    alter table public.meta_campaign_links add constraint meta_campaign_links_status_chk
      check (publish_status in ('idle','running','partial','failed','published'));
  end if;

  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_campaign_links'::regclass
      and conname = 'meta_campaign_links_step_chk') then
    alter table public.meta_campaign_links add constraint meta_campaign_links_step_chk
      check (publish_step in ('campaign','adset','creative','ad','done'));
  end if;

  -- A run that holds the lock must say which run it is.
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_campaign_links'::regclass
      and conname = 'meta_campaign_links_token_chk') then
    alter table public.meta_campaign_links add constraint meta_campaign_links_token_chk
      check (publish_status <> 'running' or attempt_token is not null);
  end if;

  -- One row per local ad: the unique key that makes ad creation idempotent.
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_ad_links'::regclass
      and conname = 'meta_ad_links_unique') then
    alter table public.meta_ad_links add constraint meta_ad_links_unique
      unique (ad_campaign_id, local_ad_id);
  end if;
end $$;

create index if not exists meta_campaign_links_status_idx
  on public.meta_campaign_links (publish_status);
create index if not exists meta_ad_links_campaign_idx
  on public.meta_ad_links (ad_campaign_id);

create or replace function public.meta_publish_links_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists meta_campaign_links_touch_updated_at on public.meta_campaign_links;
create trigger meta_campaign_links_touch_updated_at
  before update on public.meta_campaign_links
  for each row execute function public.meta_publish_links_touch();

drop trigger if exists meta_ad_links_touch_updated_at on public.meta_ad_links;
create trigger meta_ad_links_touch_updated_at
  before update on public.meta_ad_links
  for each row execute function public.meta_publish_links_touch();

-- RLS with no policies denies everything in Postgres, which is the point: no
-- browser-side key can read or write these rows, only the service role.
alter table public.meta_campaign_links enable row level security;
alter table public.meta_campaign_links force row level security;
alter table public.meta_ad_links enable row level security;
alter table public.meta_ad_links force row level security;

revoke all on public.meta_campaign_links from anon, authenticated;
revoke all on public.meta_ad_links from anon, authenticated;

-- Verification:
--   select ad_campaign_id, publish_status, publish_step, meta_campaign_id, meta_adset_id
--   from public.meta_campaign_links;
