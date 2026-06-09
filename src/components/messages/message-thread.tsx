"use client";

import { useState, useEffect, useRef } from "react";
import { Send, ChevronUp, AlertCircle } from "lucide-react";
import type { DirectConversation, DirectMessage } from "@/app/(dashboard)/messages/actions";
import {
  getMessages,
  sendMessage,
  markConversationRead,
} from "@/app/(dashboard)/messages/actions";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Raw row shape from Supabase Realtime payload (no computed fields). */
type DMRow = {
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
  return GRADIENTS[Math.abs(h)];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0]! + parts[1][0]!).toUpperCase()
    : (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

function formatDaySeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Ayer";
  return d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  name,
  userId,
  size = "sm",
}: {
  avatarUrl: string | null;
  name: string | null;
  userId: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const text = size === "sm" ? "text-[10px]" : "text-[13px]";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? "Avatar"}
        className={`${dim} rounded-[6px] object-cover shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-[6px] bg-gradient-to-br ${userGradient(userId)} flex items-center justify-center shrink-0`}
    >
      <span className={`${text} font-bold text-white leading-none select-none`}>
        {initials(name)}
      </span>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  showAvatar,
  avatarUrl,
  senderName,
  isFirst,
}: {
  msg: DirectMessage;
  showAvatar: boolean;
  avatarUrl: string | null;
  senderName: string | null;
  isFirst: boolean;
}) {
  if (msg.is_own) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] flex flex-col items-end gap-[2px]">
          <div className="bg-[rgb(42,83,208)] text-white text-[15px] leading-[22px] tracking-[-0.08px] px-[14px] py-[8px] rounded-[18px] rounded-br-[4px] break-words whitespace-pre-wrap">
            {msg.content}
          </div>
          {showAvatar && (
            <span className="text-[11px] text-[rgba(0,0,0,0.4)] px-1">
              {formatMsgTime(msg.created_at)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      {/* Avatar placeholder to keep alignment */}
      <div className="w-7 shrink-0">
        {showAvatar && (
          <Avatar avatarUrl={avatarUrl} name={senderName} userId={msg.sender_id} size="sm" />
        )}
      </div>
      <div className="max-w-[70%] flex flex-col items-start gap-[2px]">
        {isFirst && senderName && (
          <span className="text-[12px] font-medium text-[rgba(0,0,0,0.447)] px-1">
            {senderName}
          </span>
        )}
        <div className="bg-black/[0.063] text-[#202020] text-[15px] leading-[22px] tracking-[-0.08px] px-[14px] py-[8px] rounded-[18px] rounded-bl-[4px] break-words whitespace-pre-wrap">
          {msg.content}
        </div>
        {showAvatar && (
          <span className="text-[11px] text-[rgba(0,0,0,0.4)] px-1">
            {formatMsgTime(msg.created_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── TypingDots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="inline-flex gap-[3px] items-end pb-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-[5px] h-[5px] rounded-full bg-[rgba(0,0,0,0.35)] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
        />
      ))}
    </span>
  );
}

// ─── MessageThread ────────────────────────────────────────────────────────────

interface Props {
  conversation: DirectConversation;
  onRead: (convId: string) => void;
  onMessageSent: (convId: string, preview: string) => void;
}

export function MessageThread({ conversation, onRead, onMessageSent }: Props) {
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable Supabase client — key={conv.id} causes full remount on conversation switch
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  const { other_participant } = conversation;

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

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

  // ── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [messages, loading]);

  // ── Auto-resize textarea ────────────────────────────────────────────────────
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  // ── Realtime: subscribe to new messages + typing broadcasts ────────────────
  useEffect(() => {
    const supabase = supabaseRef.current!;

    const channel = supabase
      .channel(`dm_thread_${conversation.id}`)
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

          // In a 1:1 conversation: if sender is not the other participant, it's me
          const is_own = row.sender_id !== other_participant.user_id;

          setMessages((prev) => {
            // Dedup: own messages are optimistically added by sendMessage already
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, is_own }];
          });

          // Incoming message: clear typing indicator + mark as read
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
          // Auto-clear if no update within 3s (fallback for disconnects)
          typingClearTimerRef.current = setTimeout(() => setOtherIsTyping(false), 3000);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load older messages ─────────────────────────────────────────────────────
  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    const prevScrollHeight = scrollRef.current?.scrollHeight ?? 0;
    setLoadingMore(true);
    const result = await getMessages(conversation.id, { cursor });
    setMessages((prev) => [...result.messages, ...prev]);
    setHasMore(result.hasMore);
    setCursor(result.nextCursor);
    setLoadingMore(false);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        const newScrollHeight = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTop = newScrollHeight - prevScrollHeight;
      }
    });
  };

  // ── Typing indicator — send broadcast on keystroke, debounce stop ──────────
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!e.target.value.trim()) {
      // Input cleared: immediately signal "stopped typing"
      if (isTypingRef.current) {
        isTypingRef.current = false;
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: false } });
      }
      return;
    }
    // First keystroke: signal "started typing"
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: true } });
    }
    // Reset debounce — signal "stopped typing" 1.5s after last keystroke
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      channelRef.current?.send({ type: "broadcast", event: "typing", payload: { is_typing: false } });
    }, 1500);
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setSendError(null);
    setSending(true);
    textareaRef.current?.focus();

    // Clear typing state immediately on send
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

  // ── Build render list with day separators ───────────────────────────────────
  const renderItems: Array<
    | { type: "separator"; label: string }
    | { type: "msg"; msg: DirectMessage; showAvatar: boolean; isFirst: boolean }
  > = [];
  let lastDay: string | null = null;
  let lastSenderId: string | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]!;
    const nextMsg = messages[i + 1];

    if (!lastDay || !isSameDay(lastDay, msg.created_at)) {
      renderItems.push({ type: "separator", label: formatDaySeparator(msg.created_at) });
      lastDay = msg.created_at;
      lastSenderId = null;
    }

    const isFirst = lastSenderId !== msg.sender_id;
    const isLast = !nextMsg || nextMsg.sender_id !== msg.sender_id || !isSameDay(msg.created_at, nextMsg.created_at);
    renderItems.push({ type: "msg", msg, showAvatar: isLast, isFirst });
    lastSenderId = msg.sender_id;
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(0,0,0,0.08)] shrink-0 bg-white">
        <Avatar
          avatarUrl={other_participant.avatar_url}
          name={other_participant.name}
          userId={other_participant.user_id}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-[#202020] leading-[22px] tracking-[-0.08px] truncate">
            {other_participant.name ?? "Usuario"}
          </p>
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center pb-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
            >
              {loadingMore ? (
                <span className="w-4 h-4 border-2 border-[rgba(0,0,0,0.2)] border-t-[rgba(0,0,0,0.5)] rounded-full animate-spin" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
              Mensajes anteriores
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3 pt-4">
            {[40, 60, 35, 55, 45].map((w, i) => (
              <div
                key={i}
                className={`h-9 rounded-[18px] bg-black/[0.063] animate-pulse ${i % 2 === 0 ? "self-end" : "self-start"}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-14 h-14 rounded-[14px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
              <Avatar
                avatarUrl={other_participant.avatar_url}
                name={other_participant.name}
                userId={other_participant.user_id}
                size="md"
              />
            </div>
            <p className="text-[16px] font-semibold text-[#202020] tracking-[-0.08px]">
              {other_participant.name ?? "Usuario"}
            </p>
            <p className="text-[14px] text-[rgba(0,0,0,0.447)] mt-1">
              Envía un mensaje para empezar a chatear.
            </p>
          </div>
        )}

        {/* Message list */}
        {!loading &&
          renderItems.map((item, idx) => {
            if (item.type === "separator") {
              return (
                <div key={`sep-${idx}`} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                  <span className="text-[11px] font-medium text-[rgba(0,0,0,0.4)] uppercase tracking-wide whitespace-nowrap">
                    {item.label}
                  </span>
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.08)]" />
                </div>
              );
            }
            return (
              <div key={item.msg.id} className={item.isFirst ? "pt-2" : ""}>
                <MessageBubble
                  msg={item.msg}
                  showAvatar={item.showAvatar}
                  avatarUrl={other_participant.avatar_url}
                  senderName={item.msg.sender_name}
                  isFirst={item.isFirst}
                />
              </div>
            );
          })}

        <div ref={bottomRef} />
      </div>

      {/* ── Typing indicator ── */}
      <div
        className={`px-5 shrink-0 overflow-hidden transition-all duration-200 ${
          otherIsTyping ? "h-6 pb-1" : "h-0"
        }`}
      >
        <p className="text-[13px] text-[rgba(0,0,0,0.447)] flex items-center gap-1.5 leading-none">
          <span>
            {other_participant.name
              ? `${other_participant.name} está escribiendo`
              : "Escribiendo"}
          </span>
          <TypingDots />
        </p>
      </div>

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.08)] bg-white shrink-0">
        {sendError && (
          <div className="flex items-center gap-2 mb-2 px-1 text-[13px] text-[rgb(190,60,57)]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {sendError}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-black/[0.031] border border-[rgba(0,0,0,0.08)] focus-within:border-[rgba(0,0,0,0.2)] rounded-[14px] px-4 py-2.5 transition-colors">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              className="w-full bg-transparent text-[15px] text-[#202020] placeholder-[rgba(0,0,0,0.35)] outline-none resize-none leading-[22px] max-h-[120px] overflow-y-auto"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            aria-label="Enviar mensaje"
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-[rgb(42,83,208)] hover:bg-[rgb(35,70,180)] text-white"
          >
            {sending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-[11px] text-[rgba(0,0,0,0.3)] mt-1.5 px-1">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  );
}
