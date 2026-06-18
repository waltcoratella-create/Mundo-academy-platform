"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Maximize2, Pencil, Search,
  ArrowLeft, Send, AlertCircle, ChevronUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { DirectConversation, DirectMessage } from "@/app/(dashboard)/messages/actions";
import {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  getUnreadDMCount,
} from "@/app/(dashboard)/messages/actions";
import { createClient } from "@/lib/supabase/client";

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

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

// ─── DMAvatar ─────────────────────────────────────────────────────────────────

function DMAvatar({
  avatarUrl,
  name,
  userId,
  size = "md",
}: {
  avatarUrl: string | null;
  name: string | null;
  userId: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7 rounded-[5px]" : "w-10 h-10 rounded-[8px]";
  const font = size === "sm" ? "text-[9px]" : "text-[11px]";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "Avatar"}
        className={`${dim} object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} bg-gradient-to-br ${userGradient(userId)} flex items-center justify-center shrink-0`}
    >
      <span className={`${font} font-bold text-white leading-none select-none`}>
        {initials(name)}
      </span>
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({
  conv,
  onSelect,
}: {
  conv: DirectConversation;
  onSelect: () => void;
}) {
  const { other_participant, unread_count } = conv;
  const hasUnread = unread_count > 0;

  return (
    <div className="relative px-2">
      {hasUnread && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[rgb(42,83,208)] pointer-events-none" />
      )}
      <button
        onClick={onSelect}
        className="w-full flex items-center h-[68px] gap-2 px-3 rounded-[12px] hover:bg-black/[0.063] transition-colors text-left cursor-pointer"
      >
        <div className="w-9 h-9 shrink-0 grid place-items-center">
          <DMAvatar
            avatarUrl={other_participant.avatar_url}
            name={other_participant.name}
            userId={other_participant.user_id}
            size="md"
          />
        </div>

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

// ─── EmptyConversationList ────────────────────────────────────────────────────

function EmptyConversationList() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
      <div className="w-[280px] bg-[rgb(239,239,239)] rounded-[24px] px-4 pt-6 pb-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[18px] font-medium leading-[26px] tracking-[-0.29px] text-[#202020]">
          Sin mensajes
        </p>
        <p className="text-[16px] font-normal leading-6 text-[rgb(100,100,100)]">
          Cuando alguien te escriba, aparecerá aquí.
        </p>
      </div>
    </div>
  );
}

// ─── PanelThread ──────────────────────────────────────────────────────────────

type RenderItem =
  | { type: "sep"; label: string; key: string }
  | { type: "msg"; msg: DirectMessage; showAvatar: boolean; isFirst: boolean; key: string };

function buildRenderItems(messages: DirectMessage[]): RenderItem[] {
  const items: RenderItem[] = [];
  let lastDay: string | null = null;
  let lastSenderId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    const nextMsg = messages[i + 1];

    if (!lastDay || !isSameDay(lastDay, msg.created_at)) {
      items.push({ type: "sep", label: formatDaySeparator(msg.created_at), key: `sep-${msg.id}` });
      lastDay = msg.created_at;
      lastSenderId = null;
    }

    const isFirst = lastSenderId !== msg.sender_id;
    const isLast =
      !nextMsg ||
      nextMsg.sender_id !== msg.sender_id ||
      !isSameDay(msg.created_at, nextMsg.created_at);

    items.push({ type: "msg", msg, showAvatar: isLast, isFirst, key: msg.id });
    lastSenderId = msg.sender_id;
  }

  return items;
}

interface PanelThreadProps {
  conversation: DirectConversation;
  onBack: () => void;
  onClose: () => void;
  onExpandToPage: () => void;
  onRead: (convId: string) => void;
  onMessageSent: (convId: string, preview: string) => void;
}

function PanelThread({
  conversation,
  onBack,
  onClose,
  onExpandToPage,
  onRead,
  onMessageSent,
}: PanelThreadProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable Supabase client — key={conv.id} causes full remount on conversation switch
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  const { other_participant } = conversation;

  // Load messages on mount — parent uses key={conv.id} to remount per conversation
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getMessages(conversation.id),
      markConversationRead(conversation.id),
    ]).then(([result]) => {
      if (cancelled) return;
      setMessages(result.messages);
      setHasMore(result.hasMore);
      setCursor(result.nextCursor);
      setLoading(false);
      onRead(conversation.id);
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, loading]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [input]);

  // ── Realtime: subscribe to new messages + typing broadcasts ────────────────
  useEffect(() => {
    const supabase = supabaseRef.current!;

    const channel = supabase
      .channel(`dm_panel_thread_${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const row = payload.new as DMRow;
          const is_own = row.sender_id !== other_participant.user_id;

          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev; // dedup own-sends
            return [
              ...prev,
              {
                id: row.id,
                conversation_id: row.conversation_id,
                sender_id: row.sender_id,
                sender_name: row.sender_name,
                sender_avatar: null,
                content: row.content,
                created_at: row.created_at,
                read_at: null,
                deleted_at: null,
                is_own,
              },
            ];
          });

          if (!is_own) {
            setOtherIsTyping(false);
            if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
            void markConversationRead(conversation.id);
            onRead(conversation.id);
            onMessageSent(conversation.id, row.content.slice(0, 200));
          }
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const { is_typing } = payload.payload as { is_typing: boolean };
        setOtherIsTyping(is_typing);
        if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
        if (is_typing) {
          typingClearTimerRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    const prevHeight = scrollRef.current?.scrollHeight ?? 0;
    setLoadingMore(true);
    const result = await getMessages(conversation.id, { cursor });
    setMessages((prev) => [...result.messages, ...prev]);
    setHasMore(result.hasMore);
    setCursor(result.nextCursor);
    setLoadingMore(false);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
      }
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!e.target.value.trim()) {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: false } });
      }
      return;
    }
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: true } });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: false } });
    }, 1500);
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setSendError(null);
    setSending(true);
    textareaRef.current?.focus();

    if (isTypingRef.current) {
      isTypingRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: false } });
    }

    try {
      const result = await sendMessage(conversation.id, content);
      if (result.error) {
        setSendError(result.error);
        setInput(content);
      } else if (result.message) {
        setMessages((prev) => [...prev, result.message!]);
        onMessageSent(conversation.id, content.slice(0, 200));
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderItems = buildRenderItems(messages);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Thread header ── */}
      <div className="flex items-center gap-1 px-2 py-3 border-b border-[rgba(0,0,0,0.08)] shrink-0">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0 px-1">
          <DMAvatar
            avatarUrl={other_participant.avatar_url}
            name={other_participant.name}
            userId={other_participant.user_id}
            size="sm"
          />
          <span className="text-[15px] font-semibold text-[#202020] tracking-[-0.08px] truncate">
            {other_participant.name ?? "Usuario"}
          </span>
        </div>

        <button
          onClick={onExpandToPage}
          aria-label="Abrir en pantalla completa"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors shrink-0"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {hasMore && !loading && (
          <div className="flex justify-center pb-2">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
            >
              {loadingMore ? (
                <span className="w-3 h-3 border-2 border-[rgba(0,0,0,0.2)] border-t-[rgba(0,0,0,0.5)] rounded-full animate-spin" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
              Anteriores
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-2.5 pt-2">
            {[45, 65, 30, 55].map((w, i) => (
              <div
                key={i}
                className={`h-8 rounded-[14px] bg-black/[0.063] animate-pulse ${
                  i % 2 === 0 ? "self-end" : "self-start"
                }`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {/* Empty conversation */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-10 text-center gap-1">
            <p className="text-[14px] font-medium text-[#202020]">
              {other_participant.name ?? "Usuario"}
            </p>
            <p className="text-[12px] text-[rgba(0,0,0,0.447)]">
              Envía un mensaje para empezar.
            </p>
          </div>
        )}

        {/* Messages */}
        {!loading &&
          renderItems.map((item) => {
            if (item.type === "sep") {
              return (
                <div key={item.key} className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                  <span className="text-[10px] font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wide whitespace-nowrap">
                    {item.label}
                  </span>
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                </div>
              );
            }

            const { msg, showAvatar, isFirst } = item;

            if (msg.is_own) {
              return (
                <div key={item.key} className={`flex justify-end ${isFirst ? "pt-1.5" : ""}`}>
                  <div className="max-w-[75%] flex flex-col items-end gap-[2px]">
                    <div className="bg-[rgb(42,83,208)] text-white text-[14px] leading-[21px] tracking-[-0.08px] px-[12px] py-[7px] rounded-[16px] rounded-br-[4px] break-words whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    {showAvatar && (
                      <span className="text-[10px] text-[rgba(0,0,0,0.4)] px-1">
                        {formatMsgTime(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={item.key} className={`flex items-end gap-1.5 ${isFirst ? "pt-1.5" : ""}`}>
                <div className="w-6 shrink-0">
                  {showAvatar && (
                    <DMAvatar
                      avatarUrl={other_participant.avatar_url}
                      name={msg.sender_name}
                      userId={msg.sender_id}
                      size="sm"
                    />
                  )}
                </div>
                <div className="max-w-[75%] flex flex-col items-start gap-[2px]">
                  {isFirst && msg.sender_name && (
                    <span className="text-[11px] font-medium text-[rgba(0,0,0,0.447)] px-1">
                      {msg.sender_name}
                    </span>
                  )}
                  <div className="bg-black/[0.063] text-[#202020] text-[14px] leading-[21px] tracking-[-0.08px] px-[12px] py-[7px] rounded-[16px] rounded-bl-[4px] break-words whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  {showAvatar && (
                    <span className="text-[10px] text-[rgba(0,0,0,0.4)] px-1">
                      {formatMsgTime(msg.created_at)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {/* ── Typing indicator ── */}
      <div
        className={`px-3 shrink-0 overflow-hidden transition-all duration-200 ${
          otherIsTyping ? "h-5 pb-0.5" : "h-0"
        }`}
      >
        <p className="text-[12px] text-[rgba(0,0,0,0.447)] flex items-center gap-1 leading-none">
          <span>
            {other_participant.name
              ? `${other_participant.name} está escribiendo`
              : "Escribiendo"}
          </span>
          <span className="inline-flex gap-[2px] items-end pb-px">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-[rgba(0,0,0,0.35)] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
              />
            ))}
          </span>
        </p>
      </div>

      {/* ── Input ── */}
      <div className="px-3 py-2 border-t border-[rgba(0,0,0,0.08)] bg-white shrink-0">
        {sendError && (
          <div className="flex items-center gap-1.5 mb-1.5 px-1 text-[12px] text-[rgb(190,60,57)]">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {sendError}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-black/[0.031] border border-[rgba(0,0,0,0.08)] focus-within:border-[rgba(0,0,0,0.2)] rounded-[12px] px-3 py-2 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              className="w-full bg-transparent text-[14px] text-[#202020] placeholder-[rgba(0,0,0,0.35)] outline-none resize-none leading-[20px] max-h-[100px] overflow-y-auto"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Enviar"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[rgb(42,83,208)] hover:bg-[rgb(35,70,180)] text-white"
          >
            {sending ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MessagesPanel ────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

export function MessagesPanel({ open, onClose, onUnreadChange }: Props) {
  const router = useRouter();
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedConv, setSelectedConv] = useState<DirectConversation | null>(null);
  const [search, setSearch] = useState("");

  // Ref so realtime callback always sees the current selectedConv
  const selectedConvRef = useRef(selectedConv);
  useEffect(() => { selectedConvRef.current = selectedConv; }, [selectedConv]);

  // Stable Supabase client
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  // Keep onUnreadChange ref stable to avoid stale closures
  const onUnreadChangeRef = useRef(onUnreadChange);
  useEffect(() => { onUnreadChangeRef.current = onUnreadChange; });

  // Sync topbar badge whenever conversations state changes
  useEffect(() => {
    const total = conversations.reduce((s, c) => s + c.unread_count, 0);
    onUnreadChangeRef.current?.(total);
  }, [conversations]);

  // On mount: load the unread count for the topbar badge (runs even when panel is closed)
  useEffect(() => {
    getUnreadDMCount().then((count) => {
      onUnreadChange?.(count);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh conversation list every time the panel opens
  useEffect(() => {
    if (!open) {
      setSelectedConv(null);
      setSearch("");
      return;
    }
    setLoading(true);
    getConversations().then(({ conversations: convs }) => {
      setConversations(convs);
      setLoading(false);
      const total = convs.reduce((s, c) => s + c.unread_count, 0);
      onUnreadChange?.(total);
    });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        if (selectedConv) setSelectedConv(null);
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, selectedConv]);

  // ── Realtime: keep conversation list in sync ──────────────────────────────
  // Subscription is set up once and stays alive while the component is mounted.
  // It only processes events when we have known conversations loaded.
  useEffect(() => {
    const supabase = supabaseRef.current!;

    const channel = supabase
      .channel("dm_conv_list_panel")
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
            const isSelected = selectedConvRef.current?.id === conv.id;

            const updated: DirectConversation = {
              ...conv,
              last_message_at: row.created_at,
              last_message_preview: row.content.slice(0, 200),
              unread_count:
                isFromOther && !isSelected
                  ? conv.unread_count + 1
                  : conv.unread_count,
            };

            return [updated, ...prev.filter((c) => c.id !== conv.id)];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConvRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  };

  const handleMessageSent = (convId: string, preview: string) => {
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
    // Badge sync is handled by the conversations useEffect
  };

  const handleExpandToPage = () => {
    router.push("/messages");
    onClose();
  };

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          (c.other_participant.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.last_message_preview ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  const unreadTotal = conversations.reduce((s, c) => s + c.unread_count, 0);

  return (
    <aside
      className={`shrink-0 h-full bg-white border-l border-[rgba(0,0,0,0.08)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        open ? "w-[384px]" : "w-0"
      }`}
    >
      {open && (
        <>
          {selectedConv ? (
            /* ── Thread view ── */
            <PanelThread
              key={selectedConv.id}
              conversation={selectedConv}
              onBack={() => setSelectedConv(null)}
              onClose={onClose}
              onExpandToPage={handleExpandToPage}
              onRead={handleConvRead}
              onMessageSent={handleMessageSent}
            />
          ) : (
            /* ── List view ── */
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 shrink-0">
                <h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.29px] text-[#202020]">
                  Mensajes
                </h2>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={handleExpandToPage}
                    aria-label="Abrir en pantalla completa"
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    aria-label="Cerrar mensajes"
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Search + Compose */}
              <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
                <div className="flex-1 flex items-center gap-2 bg-black/[0.063] rounded-[10px] h-10 px-3">
                  <Search className="w-4 h-4 text-[rgba(0,0,0,0.447)] shrink-0" />
                  <input
                    type="text"
                    placeholder="Buscar"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[16px] font-normal text-[#202020] placeholder-[rgba(0,0,0,0.447)] outline-none min-w-0"
                  />
                </div>
                <button
                  aria-label="Nuevo mensaje"
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              {/* Divider */}
              <div className="h-px bg-[rgba(0,0,0,0.122)] shrink-0" />

              {/* Filter pills */}
              <div className="flex items-center gap-2 px-4 py-3 shrink-0">
                <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-[rgba(0,0,0,0.122)] text-[14px] font-medium text-[rgba(0,0,0,0.875)] hover:bg-black/[0.031] transition-colors">
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
              <div className="flex-1 overflow-y-auto pb-4 flex flex-col">
                {loading ? (
                  /* Loading skeleton */
                  <div className="space-y-0.5 pt-1 px-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-[68px] rounded-[12px] bg-black/[0.031] animate-pulse" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyConversationList />
                ) : (
                  <div className="space-y-0.5 pt-1">
                    {filtered.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conv={conv}
                        onSelect={() => setSelectedConv(conv)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </aside>
  );
}
