"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript types
// ─────────────────────────────────────────────────────────────────────────────

/** Resolved info for the other participant in a conversation. */
export interface DMParticipant {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
}

/**
 * A 1:1 conversation thread between two users.
 * participant_1 < participant_2 (lexicographic Clerk IDs — canonical ordering).
 */
export interface DirectConversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_sender: string | null;
  /** Resolved at query time: the partner (not the current user). */
  other_participant: DMParticipant;
  /** Number of unread messages sent by the other participant. */
  unread_count: number;
}

/** A single message within a direct conversation. */
export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  created_at: string;
  /** Timestamp when the recipient first read this message; null = unread. */
  read_at: string | null;
  /** Soft-delete timestamp; null = visible. */
  deleted_at: string | null;
  /** True when this message was sent by the currently authenticated user. */
  is_own: boolean;
}

export interface GetConversationsResult {
  conversations: DirectConversation[];
  /** False when the direct_conversations table does not yet exist in DB. */
  tableExists: boolean;
}

export interface GetMessagesResult {
  messages: DirectMessage[];
  /** True when there are older messages available via cursor pagination. */
  hasMore: boolean;
  /** Pass as `cursor` to the next getMessages call to load older messages. */
  nextCursor: string | null;
  tableExists: boolean;
}

export interface SendMessageResult {
  success?: boolean;
  message?: DirectMessage;
  error?: string;
}

export interface GetOrCreateConversationResult {
  conversationId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canonical participant ordering: ensures participant_1 < participant_2
 * so the UNIQUE constraint on (participant_1, participant_2) always matches,
 * regardless of which user initiates the conversation.
 */
function sortParticipants(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Minimal profile fields used for display. */
type ProfileCache = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

/**
 * Batch-fetch user_profiles by Clerk user IDs.
 * Returns an empty Map if the table doesn't exist or on any error (graceful).
 */
async function batchGetProfiles(
  userIds: string[],
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<string, ProfileCache>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", ids);
    const map = new Map<string, ProfileCache>();
    (data ?? []).forEach((p) => {
      map.set(p.user_id as string, {
        display_name: (p.display_name ?? null) as string | null,
        username:     (p.username     ?? null) as string | null,
        avatar_url:   (p.avatar_url   ?? null) as string | null,
      });
    });
    return map;
  } catch {
    return new Map();
  }
}

/** Resolve the best display name with fallback chain. */
function pickName(
  profile: ProfileCache | undefined,
  fallback: string | null
): string | null {
  if (profile?.display_name?.trim()) return profile.display_name.trim();
  if (profile?.username?.trim())     return `@${profile.username.trim()}`;
  if (fallback?.trim()) {
    const n = fallback.trim();
    return n.includes("@") ? (n.split("@")[0] ?? n) : n;
  }
  return null;
}

/** Resolve the best avatar URL. */
function pickAvatar(
  profile: ProfileCache | undefined,
  fallback: string | null
): string | null {
  return profile?.avatar_url ?? fallback ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getConversations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all direct-message conversations for the authenticated user,
 * sorted by last_message_at DESC (most recent first).
 * Each conversation is enriched with the other participant's profile
 * and the per-conversation unread count.
 */
export async function getConversations(): Promise<GetConversationsResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { conversations: [], tableExists: true };

    const supabase = createAdminClient();

    // 1. Fetch all conversations where the current user is a participant
    const { data, error } = await supabase
      .from("direct_conversations")
      .select(
        "id, participant_1, participant_2, created_at, last_message_at, last_message_preview, last_message_sender"
      )
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      if (error.code === "42P01") return { conversations: [], tableExists: false };
      console.error("[dm:getConversations] query error:", error.code, error.message);
      return { conversations: [], tableExists: true };
    }

    type ConvRow = {
      id: string;
      participant_1: string;
      participant_2: string;
      created_at: string;
      last_message_at: string | null;
      last_message_preview: string | null;
      last_message_sender: string | null;
    };

    const rows = (data ?? []) as ConvRow[];
    if (rows.length === 0) return { conversations: [], tableExists: true };

    // 2. Collect other-participant IDs for profile enrichment
    const otherIds = rows.map((r) =>
      r.participant_1 === userId ? r.participant_2 : r.participant_1
    );
    const profileMap = await batchGetProfiles(otherIds, supabase);

    // 3. Fallback display names from feed_posts for users not in user_profiles
    const unknownIds = otherIds.filter((id) => !profileMap.has(id));
    const feedFallback = new Map<string, { name: string | null; avatar: string | null }>();
    if (unknownIds.length > 0) {
      try {
        const { data: feedData } = await supabase
          .from("feed_posts")
          .select("user_id, author_name, author_avatar_url")
          .in("user_id", unknownIds)
          .order("created_at", { ascending: false });
        (feedData ?? []).forEach((p) => {
          if (!feedFallback.has(p.user_id as string)) {
            feedFallback.set(p.user_id as string, {
              name:   (p.author_name         ?? null) as string | null,
              avatar: (p.author_avatar_url   ?? null) as string | null,
            });
          }
        });
      } catch {
        // graceful — feed_posts may not be relevant
      }
    }

    // 4. Unread counts: messages from the OTHER participant with read_at IS NULL
    const convIds = rows.map((r) => r.id);
    const unreadCounts = new Map<string, number>();
    try {
      const { data: unreadData } = await supabase
        .from("direct_messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", userId)
        .is("read_at", null)
        .is("deleted_at", null);

      (unreadData ?? []).forEach((m) => {
        const cid = m.conversation_id as string;
        unreadCounts.set(cid, (unreadCounts.get(cid) ?? 0) + 1);
      });
    } catch {
      // graceful — direct_messages may not exist yet
    }

    // 5. Assemble enriched conversation objects
    const conversations: DirectConversation[] = rows.map((r) => {
      const otherId = r.participant_1 === userId ? r.participant_2 : r.participant_1;
      const profile  = profileMap.get(otherId);
      const feed     = feedFallback.get(otherId);
      return {
        id:                   r.id,
        participant_1:        r.participant_1,
        participant_2:        r.participant_2,
        created_at:           r.created_at,
        last_message_at:      r.last_message_at,
        last_message_preview: r.last_message_preview,
        last_message_sender:  r.last_message_sender,
        other_participant: {
          user_id:    otherId,
          name:       pickName(profile, feed?.name ?? null),
          avatar_url: pickAvatar(profile, feed?.avatar ?? null),
        },
        unread_count: unreadCounts.get(r.id) ?? 0,
      };
    });

    return { conversations, tableExists: true };
  } catch (err) {
    console.error("[dm:getConversations] unexpected:", err);
    return { conversations: [], tableExists: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrCreateConversation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the existing conversation ID between the current user and otherUserId,
 * or creates a new one if none exists.
 *
 * Idempotent: safe to call multiple times — duplicate inserts are handled via
 * the UNIQUE constraint on (participant_1, participant_2).
 */
export async function getOrCreateConversation(
  otherUserId: string
): Promise<GetOrCreateConversationResult> {
  try {
    const { userId } = await auth();
    if (!userId)               return { error: "No autenticado" };
    if (userId === otherUserId) return { error: "No puedes enviarte mensajes a ti mismo" };

    const supabase = createAdminClient();
    const [p1, p2] = sortParticipants(userId, otherUserId);

    // Fast path: fetch existing thread
    const { data: existing } = await supabase
      .from("direct_conversations")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .maybeSingle();

    if (existing?.id) return { conversationId: existing.id as string };

    // Create new thread
    const { data: created, error } = await supabase
      .from("direct_conversations")
      .insert({ participant_1: p1, participant_2: p2 })
      .select("id")
      .single();

    if (error) {
      // Race condition: another request already created the row
      if (error.code === "23505") {
        const { data: retry } = await supabase
          .from("direct_conversations")
          .select("id")
          .eq("participant_1", p1)
          .eq("participant_2", p2)
          .maybeSingle();
        if (retry?.id) return { conversationId: retry.id as string };
      }
      console.error("[dm:getOrCreateConversation] insert error:", error.code, error.message);
      return { error: "Error al crear la conversación. Intenta de nuevo." };
    }

    return { conversationId: (created as { id: string }).id };
  } catch (err) {
    console.error("[dm:getOrCreateConversation] unexpected:", err);
    return { error: "Error inesperado." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMessages
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_PAGE_SIZE = 50;

/**
 * Loads messages for a conversation with cursor-based pagination.
 *
 * - First call: pass conversationId only → returns the most recent `limit` messages.
 * - Subsequent calls: pass `cursor` = nextCursor from previous result → older messages.
 * - Messages are returned in chronological order (oldest → newest).
 * - Soft-deleted messages are excluded.
 */
export async function getMessages(
  conversationId: string,
  opts: { cursor?: string; limit?: number } = {}
): Promise<GetMessagesResult> {
  const empty: GetMessagesResult = {
    messages: [],
    hasMore: false,
    nextCursor: null,
    tableExists: true,
  };

  try {
    const { userId } = await auth();
    if (!userId) return empty;

    const supabase = createAdminClient();
    const limit    = Math.min(opts.limit ?? DEFAULT_PAGE_SIZE, 100);

    // Auth guard: verify the current user is a participant
    const { data: conv, error: convErr } = await supabase
      .from("direct_conversations")
      .select("id, participant_1, participant_2")
      .eq("id", conversationId)
      .maybeSingle();

    if (convErr?.code === "42P01") return { ...empty, tableExists: false };
    if (!conv) return empty;

    const { participant_1, participant_2 } = conv as {
      participant_1: string;
      participant_2: string;
    };
    if (participant_1 !== userId && participant_2 !== userId) return empty;

    // Build query: newest-first with optional cursor
    type MessageRow = {
      id: string;
      conversation_id: string;
      sender_id: string;
      sender_name: string | null;
      sender_avatar: string | null;
      content: string;
      created_at: string;
      read_at: string | null;
      deleted_at: string | null;
    };

    let query = supabase
      .from("direct_messages")
      .select(
        "id, conversation_id, sender_id, sender_name, sender_avatar, content, created_at, read_at, deleted_at"
      )
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit + 1); // +1 to detect whether there are more

    if (opts.cursor) {
      // Cursor is an ISO timestamp; fetch rows strictly older than the cursor
      query = query.lt("created_at", opts.cursor);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return { ...empty, tableExists: false };
      console.error("[dm:getMessages] query error:", error.code, error.message);
      return empty;
    }

    const rows = (data ?? []) as MessageRow[];
    const hasMore  = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    // Cursor for the next "load older" call: timestamp of the oldest row in this page
    const nextCursor = hasMore
      ? pageRows[pageRows.length - 1].created_at
      : null;

    // Reverse to chronological order for display (oldest → newest)
    const messages: DirectMessage[] = pageRows.reverse().map((r) => ({
      ...r,
      is_own: r.sender_id === userId,
    }));

    return { messages, hasMore, nextCursor, tableExists: true };
  } catch (err) {
    console.error("[dm:getMessages] unexpected:", err);
    return empty;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendMessage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a message in an existing conversation.
 * Also updates last_message_at / last_message_preview on the conversation row.
 * Author info is pulled from Clerk — never trusted from the client.
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<SendMessageResult> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const trimmed = content.trim();
    if (!trimmed)              return { error: "El mensaje no puede estar vacío" };
    if (trimmed.length > 5000) return { error: "El mensaje no puede superar 5 000 caracteres" };

    const supabase = createAdminClient();

    // Auth guard: verify the current user is a participant
    const { data: conv } = await supabase
      .from("direct_conversations")
      .select("id, participant_1, participant_2")
      .eq("id", conversationId)
      .maybeSingle();

    if (!conv) return { error: "Conversación no encontrada" };

    const { participant_1, participant_2 } = conv as {
      participant_1: string;
      participant_2: string;
    };
    if (participant_1 !== userId && participant_2 !== userId) {
      return { error: "No tienes acceso a esta conversación" };
    }

    // Resolve sender identity from Clerk (never trust frontend)
    const user = await currentUser();
    const senderName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const senderAvatar = user?.imageUrl ?? null;

    const now = new Date().toISOString();

    // Insert message
    const { data: msgData, error: insertError } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id:       userId,
        sender_name:     senderName,
        sender_avatar:   senderAvatar,
        content:         trimmed,
        created_at:      now,
      })
      .select(
        "id, conversation_id, sender_id, sender_name, sender_avatar, content, created_at, read_at, deleted_at"
      )
      .single();

    if (insertError) {
      console.error("[dm:sendMessage] insert error:", insertError.code, insertError.message);
      if (insertError.code === "42P01") {
        return {
          error:
            "Las tablas de mensajes no existen. Ejecuta scripts/direct-messages-schema.sql en Supabase.",
        };
      }
      return { error: "Error al enviar el mensaje. Intenta de nuevo." };
    }

    // Update conversation preview (non-blocking — don't fail on error)
    const preview = trimmed.length > 200 ? trimmed.slice(0, 200) + "…" : trimmed;
    // Fire-and-forget conversation preview update — don't block on this
    try {
      await supabase
        .from("direct_conversations")
        .update({
          last_message_at:      now,
          last_message_preview: preview,
          last_message_sender:  userId,
        })
        .eq("id", conversationId);
    } catch {
      // Non-critical — message was already inserted successfully
    }

    type MsgRow = {
      id: string;
      conversation_id: string;
      sender_id: string;
      sender_name: string | null;
      sender_avatar: string | null;
      content: string;
      created_at: string;
      read_at: string | null;
      deleted_at: string | null;
    };

    const msg = msgData as MsgRow;
    return {
      success: true,
      message: { ...msg, is_own: true },
    };
  } catch (err) {
    console.error("[dm:sendMessage] unexpected:", err);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// markConversationRead
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Marks all unread messages in a conversation as read.
 * Only marks messages sent by the OTHER participant (not the caller's own).
 * Call this when the user opens a conversation.
 */
export async function markConversationRead(
  conversationId: string
): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) return;

    const supabase = createAdminClient();

    await supabase
      .from("direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", userId)
      .is("read_at", null)
      .is("deleted_at", null);
  } catch {
    // Non-critical — graceful failure
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getUnreadDMCount
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the total count of unread incoming messages across all conversations.
 * Used for the badge on the messages icon in the topbar.
 */
export async function getUnreadDMCount(): Promise<number> {
  try {
    const { userId } = await auth();
    if (!userId) return 0;

    const supabase = createAdminClient();

    // Step 1: get all conversation IDs for this user
    const { data: convData } = await supabase
      .from("direct_conversations")
      .select("id")
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    if (!convData || convData.length === 0) return 0;

    const convIds = (convData as { id: string }[]).map((c) => c.id);

    // Step 2: count unread messages from the other participant
    const { count } = await supabase
      .from("direct_messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("read_at", null)
      .is("deleted_at", null);

    return count ?? 0;
  } catch {
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// deleteMessage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soft-deletes a message. Only the original sender can delete their own messages.
 * The message row remains in the database but is excluded from all queries.
 */
export async function deleteMessage(
  messageId: string
): Promise<{ error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const supabase = createAdminClient();

    // Verify ownership before acting
    const { data: msg } = await supabase
      .from("direct_messages")
      .select("id, sender_id")
      .eq("id", messageId)
      .maybeSingle();

    if (!msg)                                     return { error: "Mensaje no encontrado" };
    if ((msg as { sender_id: string }).sender_id !== userId) {
      return { error: "Solo puedes eliminar tus propios mensajes" };
    }

    const { error } = await supabase
      .from("direct_messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", userId); // double-check ownership in the WHERE clause

    if (error) {
      console.error("[dm:deleteMessage] update error:", error.code, error.message);
      return { error: "Error al eliminar el mensaje. Intenta de nuevo." };
    }

    return {};
  } catch (err) {
    console.error("[dm:deleteMessage] unexpected:", err);
    return { error: "Error inesperado." };
  }
}
