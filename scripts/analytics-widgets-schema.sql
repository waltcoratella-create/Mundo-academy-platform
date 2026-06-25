-- Analytics widget layout, persisted per (user, business).
-- NOTE: public.users.id is TEXT in this project (not uuid), so user_id is text.

create extension if not exists pgcrypto;

create table if not exists public.analytics_widgets (
  id          uuid        primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses(id) on delete cascade,
  user_id     text        not null references public.users(id) on delete cascade,
  widget_key  text        not null,
  position    integer     not null,
  visible     boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, business_id, widget_key)
);

create index if not exists analytics_widgets_user_business_idx
  on public.analytics_widgets (user_id, business_id, position);
