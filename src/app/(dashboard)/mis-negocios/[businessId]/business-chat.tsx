"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Hash } from "lucide-react";
import {
  getBusinessChatMessages,
  sendBusinessChatMessage,
} from "./chat-actions";
import type { BusinessChatMessage } from "./chat-actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "ahora";
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `hace ${days}d`;
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

// ─── MessageRow ───────────────────────────────────────────────────────────────

function MessageRow({ message }: { message: BusinessChatMessage }) {
  const initials = (message.author_name ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex items-start gap-3">
      {/* Avatar */}
      {message.author_avatar_url ? (
        <img
          src={message.author_avatar_url}
          alt={message.author_name ?? ""}
          className="w-9 h-9 rounded-full shrink-0 object-cover mt-0.5"
        />
      ) : (
        <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 mt-0.5 select-none">
          <span className="text-[13px] font-bold text-brand-700">{initials}</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-[14px] font-bold leading-[20px] text-[#202020]">
            {message.author_name ?? "Usuario"}
          </span>
          <span className="text-[12px] text-[rgba(0,0,0,0.40)] leading-[20px]">
            {relativeTime(message.created_at)}
          </span>
        </div>
        <p className="mt-0.5 text-[15px] leading-[22px] text-[#202020] whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}

// ─── BusinessChat ─────────────────────────────────────────────────────────────

interface Props {
  businessId: string;
  canWrite: boolean;
}

export function BusinessChat({ businessId, canWrite }: Props) {
  const [messages, setMessages]   = useState<BusinessChatMessage[]>([]);
  const [loading, setLoading]     = useState(true);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    const result = await getBusinessChatMessages(businessId);
    setMessages(result.messages);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // ── Send ────────────────────────────────────────────────────────────────────

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setSendError(null);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const result = await sendBusinessChatMessage(businessId, trimmed);

    if (result.error) {
      setSendError(result.error);
      setInput(trimmed); // restore text so user can retry
    } else {
      await loadMessages();
    }

    setSending(false);
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-resize textarea (max ~5 lines)
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 124)}px`;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col bg-white border border-black/[0.07] rounded-2xl overflow-hidden"
      style={{ height: "560px" }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-black/[0.06] shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
          <Hash className="w-4 h-4 text-[rgba(0,0,0,0.50)]" />
        </div>
        <div>
          <p className="text-[15px] font-bold leading-[20px] text-[#202020]">General</p>
          <p className="text-[12px] text-[rgba(0,0,0,0.45)] leading-[16px]">
            Chat interno de la comunidad
          </p>
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px] text-[rgba(0,0,0,0.35)]">Cargando mensajes…</p>
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-black/[0.06] flex items-center justify-center">
              <Hash className="w-5 h-5 text-gray-300" />
            </div>
            <p className="text-[15px] font-semibold text-[#202020]">
              Todavía no hay mensajes
            </p>
            <p className="text-[14px] text-[rgba(0,0,0,0.50)]">
              Sé el primero en iniciar la conversación.
            </p>
          </div>
        )}

        {!loading && messages.length > 0 && (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 pt-2 border-t border-black/[0.06] shrink-0">
        {sendError && (
          <p className="mb-2 text-[12px] text-red-500 leading-[16px]">{sendError}</p>
        )}

        {canWrite ? (
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
              placeholder="Escribe un mensaje…"
              maxLength={2000}
              className="flex-1 resize-none rounded-xl border border-black/[0.10] bg-gray-50 px-4 py-2.5 text-[15px] leading-[22px] text-[#202020] placeholder:text-[rgba(0,0,0,0.35)] focus:outline-none focus:border-black/[0.25] focus:bg-white transition-colors disabled:opacity-50 min-h-[42px]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-[#202020] text-white flex items-center justify-center shrink-0 hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Enviar"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin block" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <p className="py-2 text-[13px] text-[rgba(0,0,0,0.40)] text-center">
            Únete a este negocio para escribir en el chat.
          </p>
        )}
      </div>
    </div>
  );
}
