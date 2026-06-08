"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Pencil, MessageCircle } from "lucide-react";
import type { DirectConversation } from "@/app/(dashboard)/messages/actions";
import { createClient } from "@/lib/supabase/client";
import { MessageThread } from "./message-thread";

// ─── Types ────────────────────────────────────────────────────────────────────

type DMRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  created_at: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-purple-500 to-violet-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

function userGradient(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[Math.abs(h)]!;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0]![0]! + parts[1]![0]!).toUpperCase()
    : (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function formatConvTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffSec < 60) return "ahora";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD === 1) return "ayer";
  if (diffD < 7) return `${diffD}d`;
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

// ─── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({
  conv,
  selected,
  onSelect,
}: {
  conv: DirectConversation;
  selected: boolean;
  onSelect: () => void;
}) {
  const { other_participant, unread_count } = conv;
  const hasUnread = unread_count > 0;

  return (
    <div className="relative px-2">
      {/* Unread dot */}
      {hasUnread && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[rgb(42,83,208)] pointer-events-none" />
      )}

      <button
        onClick={onSelect}
        className={`w-full flex items-center h-[68px] gap-2 px-3 rounded-[12px] transition-colors text-left cursor-pointer ${
          selected
            ? "bg-black/[0.063]"
            : "hover:bg-black/[0.031]"
        }`}
      >
        {/* Avatar */}
        <div className="w-9 h-9 shrink-0 grid place-items-center">
          {other_participant.avatar_url ? (
            <img
              src={other_participant.avatar_url}
              alt={other_participant.name ?? "Avatar"}
              className="w-10 h-10 rounded-[8px] object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-[8px] bg-gradient-to-br ${userGradient(other_participant.user_id)} flex items-center justify-center`}
            >
              <span className="text-[11px] font-bold text-white leading-none select-none">
                {initials(other_participant.name)}
              </span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
          <span
            className={`text-[16px] leading-[22px] tracking-[0.4px] text-[#202020] truncate ${
              hasUnread ? "font-semibold" : "font-medium"
            }`}
          >
            {other_participant.name ?? "Usuario"}
          </span>
          {conv.last_message_preview && (
            <span
              className={`text-[14px] leading-5 tracking-[0.35px] truncate ${
                hasUnread
                  ? "font-semibold text-[#202020]"
                  : "font-normal text-[rgba(0,0,0,0.447)]"
              }`}
            >
              {conv.last_message_preview}
            </span>
          )}
        </div>

        {/* Right: time + badge */}
        <div className="flex flex-col items-end gap-1 shrink-0 self-center pl-1">
          <span className="text-[12px] font-medium text-[rgba(0,0,0,0.447)]">
            {formatConvTime(conv.last_message_at)}
          </span>
          {hasUnread && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[rgb(42,83,208)] text-white text-[10px] font-bold leading-none">
              {unread_count > 99 ? "99+" : unread_count}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptySidebarState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-[15px] font-medium text-[#202020]">
        {hasFilter ? "Sin resultados" : "Sin conversaciones"}
      </p>
      <p className="text-[13px] text-[rgba(0,0,0,0.447)] mt-1">
        {hasFilter
          ? "Prueba con otros términos de búsqueda."
          : "Cuando alguien te escriba, aparecerá aquí."}
      </p>
    </div>
  );
}

function EmptyThreadState({
  hasConversations,
  tableExists,
}: {
  hasConversations: boolean;
  tableExists: boolean;
}) {
  if (!tableExists) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-10 text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-[16px] font-semibold text-[#202020]">Tablas no configuradas</p>
        <p className="text-[14px] text-[rgba(0,0,0,0.447)] max-w-sm">
          Ejecuta{" "}
          <code className="text-[13px] bg-black/[0.063] px-1.5 py-0.5 rounded font-mono">
            scripts/direct-messages-schema.sql
          </code>{" "}
          en Supabase para activar los mensajes directos.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-10 text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-[rgba(42,83,208,0.08)] flex items-center justify-center">
        <MessageCircle className="w-7 h-7 text-[rgb(42,83,208)]" />
      </div>
      <p className="text-[16px] font-semibold text-[#202020] tracking-[-0.08px]">
        {hasConversations ? "Selecciona una conversación" : "Sin mensajes por ahora"}
      </p>
      <p className="text-[14px] text-[rgba(0,0,0,0.447)]">
        {hasConversations
          ? "Elige una conversación de la lista para empezar a chatear."
          : "Cuando alguien te envíe un mensaje, aparecerá aquí."}
      </p>
    </div>
  );
}

// ─── MessagesPageClient ───────────────────────────────────────────────────────

interface Props {
  initialConversations: DirectConversation[];
  tableExists: boolean;
  /** Pre-select a conversation by ID (e.g. from ?conv= query param). */
  initialSelectedId?: string;
}

export function MessagesPageClient({ initialConversations, tableExists, initialSelectedId }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null);
  const [search, setSearch] = useState("");
  const [filterUnread, setFilterUnread] = useState(false);

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  // ── Ref so realtime callbacks always see the current selectedId ─────────────
  const selectedIdRef = useRef(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  // ── Stable Supabase client ──────────────────────────────────────────────────
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  // ── Conversation list callbacks ─────────────────────────────────────────────
  const handleConvRead = useCallback((convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  }, []);

  const handleMessageSent = useCallback((convId: string, preview: string) => {
    setConversations((prev) => {
      const now = new Date().toISOString();
      const updated = prev.map((c) =>
        c.id === convId
          ? { ...c, last_message_at: now, last_message_preview: preview }
          : c
      );
      return [...updated].sort((a, b) => {
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });
    });
  }, []);

  // ── Realtime: keep conversation list in sync ────────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current!;

    const channel = supabase
      .channel("dm_conv_list_page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const row = payload.new as DMRow;

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === row.conversation_id);
            if (idx === -1) return prev; // Not one of our conversations — ignore

            const conv = prev[idx]!;
            const isFromOther = row.sender_id === conv.other_participant.user_id;
            const isSelected = selectedIdRef.current === conv.id;

            const updated: DirectConversation = {
              ...conv,
              last_message_at: row.created_at,
              last_message_preview: row.content.slice(0, 200),
              // Only increment unread when: incoming + not currently open
              unread_count:
                isFromOther && !isSelected
                  ? conv.unread_count + 1
                  : conv.unread_count,
            };

            // Bubble updated conversation to top
            return [updated, ...prev.filter((c) => c.id !== conv.id)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Filtered list ───────────────────────────────────────────────────────────
  let filtered = conversations;
  if (filterUnread) filtered = filtered.filter((c) => c.unread_count > 0);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        (c.other_participant.name ?? "").toLowerCase().includes(q) ||
        (c.last_message_preview ?? "").toLowerCase().includes(q)
    );
  }

  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <div className="h-full flex overflow-hidden bg-white">

      {/* ── Left sidebar ── */}
      <div className="w-[384px] shrink-0 flex flex-col border-r border-[rgba(0,0,0,0.08)] h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <h1 className="text-[20px] font-semibold text-[#202020] tracking-[-0.29px] leading-[28px]">
            Mensajes
          </h1>
          <button
            aria-label="Nuevo mensaje"
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3 shrink-0">
          <label className="flex items-center gap-2 bg-black/[0.063] rounded-[10px] h-10 px-3 cursor-text">
            <Search className="w-4 h-4 text-[rgba(0,0,0,0.447)] shrink-0" />
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[15px] text-[#202020] placeholder-[rgba(0,0,0,0.447)] outline-none min-w-0"
            />
          </label>
        </div>

        {/* Divider */}
        <div className="h-px bg-[rgba(0,0,0,0.08)] shrink-0" />

        {/* Filter pills */}
        <div className="flex items-center gap-2 px-4 py-3 shrink-0">
          <button
            onClick={() => setFilterUnread((v) => !v)}
            className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[14px] font-medium transition-colors ${
              filterUnread
                ? "border-[rgb(42,83,208)] bg-[rgba(42,83,208,0.08)] text-[rgb(42,83,208)]"
                : "border-[rgba(0,0,0,0.122)] text-[rgba(0,0,0,0.875)] hover:bg-black/[0.031]"
            }`}
          >
            No leído
            {unreadTotal > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-[3.5px] rounded-full bg-[rgb(212,84,83)] text-white text-[10px] font-bold leading-none">
                {unreadTotal > 99 ? "99+" : unreadTotal}
              </span>
            )}
          </button>
          <button className="inline-flex items-center h-7 px-3 rounded-full border border-[rgba(0,0,0,0.122)] text-[14px] font-medium text-[rgba(0,0,0,0.875)] hover:bg-black/[0.031] transition-colors">
            Solicitudes
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto pb-4">
          {filtered.length === 0 ? (
            <EmptySidebarState hasFilter={filterUnread || !!search.trim()} />
          ) : (
            <div className="space-y-0.5 pt-1">
              {filtered.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  selected={conv.id === selectedId}
                  onSelect={() => setSelectedId(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: thread or empty ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {selectedConv ? (
          <MessageThread
            key={selectedConv.id}
            conversation={selectedConv}
            onRead={handleConvRead}
            onMessageSent={handleMessageSent}
          />
        ) : (
          <EmptyThreadState
            hasConversations={conversations.length > 0}
            tableExists={tableExists}
          />
        )}
      </div>

    </div>
  );
}
