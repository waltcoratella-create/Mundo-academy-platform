-- Per (user, business) preferences for the analytics "Share your stats" modal.
-- NOTE: public.users.id is UUID in this project (Clerk maps via users.clerk_id).

create extension if not exists pgcrypto;

create table if not exists public.analytics_share_preferences (
  id          uuid        primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  theme       text        not null default 'Melon',
  pattern     text        not null default 'Ninguno',
  show_logo   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, business_id)
);
