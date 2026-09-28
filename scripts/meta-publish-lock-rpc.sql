-- Atomic publish lock: version check and lock acquisition in ONE transaction.
-- Idempotent and re-runnable. Touches ONLY this database — nothing in Meta.
--
-- Before: the action compared ad_campaigns.updated_at to the confirmed
-- preview's version, and only then took the lock. A Save Draft committing
-- between the two would be published unseen.
--
-- Now the whole decision happens under a row lock on the campaign:
--
--   1. SELECT … FOR UPDATE on ad_campaigns — waits for any in-flight save
--      and holds off any new one until this transaction ends.
--   2. already published            → 'ALREADY_PUBLISHED'
--   3. another run holds the lock   → 'BUSY'   (checked before the version, so a
--                                              double click reads as busy)
--   4. updated_at ≠ expected        → 'DRAFT_CHANGED'
--   5. take the lock, and TOUCH ad_campaigns.updated_at.
--
-- Step 5's touch is what closes the other half of the race. A Save Draft that
-- was already waiting on the row lock re-evaluates its WHERE against the new
-- row version once this commits; saves are conditioned on the updated_at they
-- read, which no longer matches, so the save writes nothing.
--
-- Returns one of: ACQUIRED, ALREADY_PUBLISHED, BUSY, DRAFT_CHANGED,
-- NOT_PUBLISHABLE, NOT_FOUND. Nothing is written unless it returns ACQUIRED.
--
-- Paste into Supabase → SQL Editor.

create or replace function public.acquire_publish_lock(
  p_ad_campaign_id      uuid,
  p_expected_updated_at timestamptz,
  p_attempt_token       uuid,
  p_stale_before        timestamptz
) returns text
language plpgsql
set search_path = public
as $$
declare
  v_status      text;
  v_updated_at  timestamptz;
  v_link_status text;
  v_started_at  timestamptz;
begin
  -- 1 · Serialise against saves and against other publish attempts.
  select status, updated_at
    into v_status, v_updated_at
    from public.ad_campaigns
   where id = p_ad_campaign_id
     for update;

  if not found then
    return 'NOT_FOUND';
  end if;

  if v_status = 'published' then
    return 'ALREADY_PUBLISHED';
  end if;
  if v_status <> 'draft' then
    return 'NOT_PUBLISHABLE';
  end if;

  -- The link row may not exist yet. No row means "never attempted": nothing is
  -- inserted here, so a refusal below writes nothing at all. Two first-time
  -- attempts cannot both pass, because the FOR UPDATE above serialises them.
  select publish_status, attempt_started_at
    into v_link_status, v_started_at
    from public.meta_campaign_links
   where ad_campaign_id = p_ad_campaign_id
     for update;

  -- 2 · Published is terminal, however it got there.
  if v_link_status = 'published' then
    return 'ALREADY_PUBLISHED';
  end if;

  -- 3 · A live run owns it. A 'running' row older than the stale window (or
  --     without a timestamp it can be judged by) is NOT taken over blindly:
  --     only an old timestamp proves the run is dead.
  if v_link_status = 'running'
     and (v_started_at is null or v_started_at >= p_stale_before) then
    return 'BUSY';
  end if;

  -- 4 · What the person confirmed must still be what is stored.
  if v_updated_at is distinct from p_expected_updated_at then
    return 'DRAFT_CHANGED';
  end if;

  -- 5 · Take the lock and move the campaign's version forward.
  insert into public.meta_campaign_links
    (ad_campaign_id, publish_status, attempt_token, attempt_started_at, publish_error)
  values
    (p_ad_campaign_id, 'running', p_attempt_token, now(), null)
  on conflict (ad_campaign_id) do update
    set publish_status     = 'running',
        attempt_token      = excluded.attempt_token,
        attempt_started_at = excluded.attempt_started_at,
        publish_error      = null;

  update public.ad_campaigns
     set updated_at = now()
   where id = p_ad_campaign_id;

  return 'ACQUIRED';
end $$;

revoke all on function public.acquire_publish_lock(uuid, timestamptz, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.acquire_publish_lock(uuid, timestamptz, uuid, timestamptz)
  to service_role;
