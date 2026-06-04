"use client";

import { useState, useEffect } from "react";
import { X, Maximize2, Pencil, Search } from "lucide-react";

// ── Mock data ─────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  name: string;
  preview: string;
  avatarInitial: string;
  avatarGradient: string;
  unread: boolean;
  timestamp: string;
}

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Team Mundo Academy",
    preview: "¡Bienvenido a la comunidad!",
    avatarInitial: "MA",
    avatarGradient: "from-blue-500 to-indigo-600",
    unread: true,
    timestamp: "ahora",
  },
  {
    id: "2",
    name: "Walter",
    preview: "¿Cómo va el negocio?",
    avatarInitial: "W",
    avatarGradient: "from-emerald-500 to-teal-600",
    unread: false,
    timestamp: "2h",
  },
  {
    id: "3",
    name: "Mundo Ejecutivo",
    preview: "Nueva edición disponible",
    avatarInitial: "ME",
    avatarGradient: "from-amber-500 to-orange-600",
    unread: true,
    timestamp: "1d",
  },
  {
    id: "4",
    name: "Venture AI",
    preview: "Tu plan de negocio está listo",
    avatarInitial: "AI",
    avatarGradient: "from-purple-500 to-violet-600",
    unread: false,
    timestamp: "3d",
  },
];

const UNREAD_COUNT = MOCK_CONVERSATIONS.filter((c) => c.unread).length;

// ── ConversationItem ──────────────────────────────────────────────────────────

function ConversationItem({ conv }: { conv: Conversation }) {
  return (
    <div className="relative px-2">
      {/* Unread dot — positioned left of the rounded card */}
      {conv.unread && (
        <span className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[rgb(42,83,208)] pointer-events-none" />
      )}

      <button className="w-full flex items-center h-[68px] gap-2 px-3 rounded-[12px] hover:bg-black/[0.063] transition-colors text-left cursor-pointer">
        {/* Avatar wrapper 36×36 → avatar 40×40 */}
        <div className="w-9 h-9 shrink-0 grid place-items-center">
          <div
            className={`w-10 h-10 rounded-[8px] bg-gradient-to-br ${conv.avatarGradient} flex items-center justify-center shrink-0`}
          >
            <span className="text-[11px] font-bold text-white leading-none select-none">
              {conv.avatarInitial}
            </span>
          </div>
        </div>

        {/* Text stack */}
        <div className="flex-1 min-w-0 flex flex-col gap-[2px]">
          <span className="text-[16px] font-medium leading-[22px] tracking-[0.4px] text-[#202020] truncate">
            {conv.name}
          </span>
          <span className="text-[14px] font-medium leading-5 tracking-[0.35px] text-[rgba(0,0,0,0.875)] truncate">
            {conv.preview}
          </span>
        </div>

        {/* Timestamp */}
        <span className="text-[12px] font-medium text-[rgba(0,0,0,0.447)] shrink-0 self-center pl-1">
          {conv.timestamp}
        </span>
      </button>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-8 py-12">
      <div className="w-[280px] bg-[rgb(239,239,239)] rounded-[24px] px-4 pt-6 pb-8 flex flex-col items-center gap-3 text-center">
        <p className="text-[18px] font-medium leading-[26px] tracking-[-0.29px] text-[#202020]">
          Selecciona un mensaje
        </p>
        <p className="text-[16px] font-normal leading-6 text-[rgb(100,100,100)]">
          Elige una conversación para empezar a hablar.
        </p>
      </div>
    </div>
  );
}

// ── MessagesPanel ─────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MessagesPanel({ open, onClose }: Props) {
  const [search, setSearch] = useState("");

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset search when panel closes
  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = search.trim()
    ? MOCK_CONVERSATIONS.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.preview.toLowerCase().includes(search.toLowerCase())
      )
    : MOCK_CONVERSATIONS;

  return (
    <aside
      className={`shrink-0 h-full bg-white border-l border-[rgba(0,0,0,0.08)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        open ? "w-[384px]" : "w-0"
      }`}
    >
      {open && (
        <>
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0">
            <h2 className="text-[18px] font-semibold leading-[26px] tracking-[-0.29px] text-[#202020]">
              Mensajes
            </h2>
            <div className="flex items-center gap-0.5">
              {/* Expand (no-op for now) */}
              <button
                aria-label="Expandir mensajes"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              {/* Close */}
              <button
                onClick={onClose}
                aria-label="Cerrar mensajes"
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Search + Compose ── */}
          <div className="flex items-center gap-2 px-4 pb-3 shrink-0">
            {/* Search */}
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
            {/* Compose */}
            <button
              aria-label="Nuevo mensaje"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/[0.063] text-[rgba(0,0,0,0.447)] hover:text-[#202020] transition-colors shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-[rgba(0,0,0,0.122)] shrink-0 mx-0" />

          {/* ── Filter pills ── */}
          <div className="flex items-center gap-2 px-4 py-3 shrink-0">
            <button className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full border border-[rgba(0,0,0,0.122)] text-[14px] font-medium text-[rgba(0,0,0,0.875)] hover:bg-black/[0.031] transition-colors">
              No leído
              {UNREAD_COUNT > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-[3.5px] rounded-full bg-[rgb(212,84,83)] text-white text-[10px] font-bold leading-none">
                  {UNREAD_COUNT}
                </span>
              )}
            </button>
            <button className="inline-flex items-center h-7 px-3 rounded-full border border-[rgba(0,0,0,0.122)] text-[14px] font-medium text-[rgba(0,0,0,0.875)] hover:bg-black/[0.031] transition-colors">
              Solicitudes
            </button>
          </div>

          {/* ── Conversation list ── */}
          <div className="flex-1 overflow-y-auto pb-4 flex flex-col">
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-0.5 pt-1">
                {filtered.map((conv) => (
                  <ConversationItem key={conv.id} conv={conv} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
