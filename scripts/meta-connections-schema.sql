-- Meta Ads connection — phase A foundation. Idempotent and re-runnable.
--
-- One live connection per business. Disconnected rows are kept as an audit
-- trail, so a partial unique index enforces "one live" rather than a plain
-- unique constraint on business_id.
--
-- The access token is stored ENCRYPTED (AES-256-GCM, see src/lib/meta/crypto.ts).
-- The encryption key lives only in a Vercel environment variable and never in
-- this database, so a full dump of these rows yields nothing usable.
--
-- The App Secret is NEVER stored here — it belongs to the platform, not to a
-- business, and lives only in the environment.

create table if not exists public.meta_connections (
  id                    uuid primary key default gen_random_uuid(),
  business_id           uuid not null references public.businesses(id) on delete cascade,

  status                text not null default 'connecting',

  -- ── Meta identity (captured during OAuth, phase B) ──────────────────────
  meta_user_id          text,
  meta_business_id      text,
  meta_business_name    text,

  -- ── Selected assets (phase C) ───────────────────────────────────────────
  ad_account_id         text,
  ad_account_name       text,
  -- Currency and timezone belong to the ad account and override the builder's
  -- choice: otherwise Meta reads a "200" budget in whatever currency the
  -- account uses, not the one the user picked.
  ad_account_currency   text,
  ad_account_timezone   text,
  page_id               text,
  page_name             text,
  pixel_id              text,
  pixel_name            text,

  -- ── Credential (encrypted; server-only) ─────────────────────────────────
  -- Format: v1.<iv>.<authTag>.<ciphertext>, all base64url.
  token_ciphertext      text,
  -- Which key encrypted this row, so keys can rotate without re-encrypting
  -- everything at once.
  token_key_version     smallint,
  token_expires_at      timestamptz,
  scopes                text[] not null default '{}',

  -- ── Lifecycle ───────────────────────────────────────────────────────────
  last_error            text,
  connected_at          timestamptz,
  disconnected_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Constraints ────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_connections'::regclass
      and conname = 'meta_connections_status_chk') then
    alter table public.meta_connections add constraint meta_connections_status_chk
      check (status in ('connecting','connected','expired','error','disconnected'));
  end if;

  -- A connected row must actually hold a credential.
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_connections'::regclass
      and conname = 'meta_connections_token_chk') then
    alter table public.meta_connections add constraint meta_connections_token_chk
      check (status <> 'connected' or token_ciphertext is not null);
  end if;

  -- Ciphertext and key version travel together or not at all.
  if not exists (select 1 from pg_constraint
    where conrelid = 'public.meta_connections'::regclass
      and conname = 'meta_connections_keyver_chk') then
    alter table public.meta_connections add constraint meta_connections_keyver_chk
      check ((token_ciphertext is null) = (token_key_version is null));
  end if;
end $$;

-- ── One LIVE connection per business ───────────────────────────────────────
-- Partial: disconnected rows (disconnected_at not null) are exempt, so the
-- history of past connections is preserved.
create unique index if not exists meta_connections_one_live_per_business
  on public.meta_connections (business_id)
  where disconnected_at is null;

create index if not exists meta_connections_business_idx
  on public.meta_connections (business_id);

-- Lets a future job find rows to re-encrypt after a key rotation.
create index if not exists meta_connections_key_version_idx
  on public.meta_connections (token_key_version)
  where token_ciphertext is not null;

-- ── updated_at maintenance ─────────────────────────────────────────────────
create or replace function public.touch_meta_connections_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists meta_connections_touch_updated_at on public.meta_connections;
create trigger meta_connections_touch_updated_at
  before update on public.meta_connections
  for each row execute function public.touch_meta_connections_updated_at();

-- ── RLS: deny by default, no exceptions ────────────────────────────────────
--
-- Enabled with ZERO policies on purpose. In Postgres, RLS with no policy denies
-- every row to every non-superuser role, so `anon` and `authenticated` — the
-- keys a browser can hold — can never read a token, not even encrypted.
--
-- Only the service-role key reaches these rows, and it is used exclusively from
-- src/lib/meta/connections.ts, which is marked `server-only`.
--
-- This is deliberately stricter than ad_campaigns, which does expose an owner
-- policy. Campaign data is business content; this is a credential.
alter table public.meta_connections enable row level security;
alter table public.meta_connections force row level security;

-- Belt and braces: revoke direct grants from the browser-facing roles.
revoke all on public.meta_connections from anon, authenticated;

comment on table public.meta_connections is
  'Meta Ads connection per business. Tokens are AES-256-GCM encrypted; the key '
  'lives only in the environment. RLS denies all access — service role only.';
comment on column public.meta_connections.token_ciphertext is
  'v1.<iv>.<authTag>.<ciphertext>, base64url. Never expose to any client.';
