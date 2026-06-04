-- ─────────────────────────────────────────────────────────────────────────────
-- Mundo Academy — Direct Messages (1:1)
-- Run once in the Supabase SQL Editor.
-- Idempotent: safe to re-run (IF NOT EXISTS + DROP POLICY IF EXISTS).
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── direct_conversations ────────────────────────────────────────────────────
-- One row per pair of users. participant_1 < participant_2 (lexicographic Clerk IDs).
-- The CHECK + UNIQUE together guarantee there is exactly one thread per pair.

CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1        TEXT        NOT NULL,  -- Clerk user ID (alphabetically first)
  participant_2        TEXT        NOT NULL,  -- Clerk user ID (alphabetically second)
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at      TIMESTAMPTZ,
  last_message_preview TEXT,                  -- truncated to ≤ 200 chars
  last_message_sender  TEXT,                  -- Clerk user ID of the last sender
  CONSTRAINT dc_participants_unique UNIQUE (participant_1, participant_2),
  CONSTRAINT dc_canonical_order    CHECK  (participant_1 < participant_2)
);

COMMENT ON TABLE  public.direct_conversations IS 'One-to-one chat threads. Canonical ordering: participant_1 < participant_2.';
COMMENT ON COLUMN public.direct_conversations.participant_1 IS 'Clerk user ID — always lexicographically < participant_2.';
COMMENT ON COLUMN public.direct_conversations.participant_2 IS 'Clerk user ID — always lexicographically > participant_1.';

-- ─── direct_messages ─────────────────────────────────────────────────────────
-- Individual messages inside a conversation.
-- Author info is denormalized at write time (same pattern as feed_posts).
-- deleted_at implements soft delete: NULL = visible, non-NULL = hidden.

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID        NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id       TEXT        NOT NULL,   -- Clerk user ID
  sender_name     TEXT,                   -- denormalized at write time
  sender_avatar   TEXT,                   -- denormalized at write time
  content         TEXT        NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 5000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ,            -- when the recipient first read this message
  deleted_at      TIMESTAMPTZ             -- soft delete; NULL = visible
);

COMMENT ON TABLE  public.direct_messages IS 'Messages within a direct_conversations thread.';
COMMENT ON COLUMN public.direct_messages.read_at     IS 'Timestamp when the other participant marked this as read. NULL = unread.';
COMMENT ON COLUMN public.direct_messages.deleted_at  IS 'Soft-delete: NULL = visible; non-NULL = hidden to both parties.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- Conversations: fast lookup by either participant
CREATE INDEX IF NOT EXISTS idx_dc_participant_1        ON public.direct_conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_dc_participant_2        ON public.direct_conversations(participant_2);
-- Conversations: sort by most-recent activity
CREATE INDEX IF NOT EXISTS idx_dc_last_message_at      ON public.direct_conversations(last_message_at DESC NULLS LAST);

-- Messages: paginated load for a conversation (newest first)
CREATE INDEX IF NOT EXISTS idx_dm_conversation_created ON public.direct_messages(conversation_id, created_at DESC);
-- Messages: unread count queries (partial index — only unread, non-deleted rows)
CREATE INDEX IF NOT EXISTS idx_dm_unread              ON public.direct_messages(conversation_id, sender_id)
  WHERE read_at IS NULL AND deleted_at IS NULL;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Server actions use the service-role key and bypass RLS.
-- These policies protect any direct client (anon/authenticated) access.

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages      ENABLE ROW LEVEL SECURITY;

-- Conversations: only participants can read
DROP POLICY IF EXISTS "dm_conv_select"   ON public.direct_conversations;
CREATE POLICY "dm_conv_select"
  ON public.direct_conversations FOR SELECT
  USING (
    auth.uid()::text = participant_1
    OR auth.uid()::text = participant_2
  );

-- Messages: only participants can read (non-deleted rows)
DROP POLICY IF EXISTS "dm_msg_select"    ON public.direct_messages;
CREATE POLICY "dm_msg_select"
  ON public.direct_messages FOR SELECT
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE  c.id = conversation_id
        AND (c.participant_1 = auth.uid()::text OR c.participant_2 = auth.uid()::text)
    )
  );

-- Messages: sender can insert into their own conversations
DROP POLICY IF EXISTS "dm_msg_insert"    ON public.direct_messages;
CREATE POLICY "dm_msg_insert"
  ON public.direct_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE  c.id = conversation_id
        AND (c.participant_1 = auth.uid()::text OR c.participant_2 = auth.uid()::text)
    )
  );

-- Messages: only the sender can update their own rows (soft delete + read_at)
DROP POLICY IF EXISTS "dm_msg_update"    ON public.direct_messages;
CREATE POLICY "dm_msg_update"
  ON public.direct_messages FOR UPDATE
  USING    (sender_id = auth.uid()::text)
  WITH CHECK (sender_id = auth.uid()::text);

-- Read receipts: recipient can mark messages as read
DROP POLICY IF EXISTS "dm_msg_read_receipt" ON public.direct_messages;
CREATE POLICY "dm_msg_read_receipt"
  ON public.direct_messages FOR UPDATE
  USING (
    -- The updater must be the OTHER participant (not the sender)
    sender_id <> auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      WHERE  c.id = conversation_id
        AND (c.participant_1 = auth.uid()::text OR c.participant_2 = auth.uid()::text)
    )
  )
  WITH CHECK (
    sender_id <> auth.uid()::text
  );
