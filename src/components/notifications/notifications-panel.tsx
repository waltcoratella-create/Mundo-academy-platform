"use client";

import { useState, useEffect } from "react";
import { Bell, Maximize2, X } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationsAsRead,
} from "@/app/(dashboard)/inicio/actions";
import type { FeedNotification } from "@/app/(dashboard)/inicio/actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "ahora";
  if (mins  < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  return `${days}d`;
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-600",
];
function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length]!;
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

function notifText(n: FeedNotification): string {
  const actor = n.actor_name ?? "Alguien";
  switch (n.type) {
    case "post_like":      return `${actor} le dio like a tu publicación`;
    case "post_comment":   return `${actor} comentó tu publicación`;
    case "comment_reply":  return `${actor} respondió tu comentario`;
    case "user_follow":    return `${actor} empezó a seguirte`;
    default:               return `${actor} interactuó contigo`;
  }
}

// ─── NotificationRow ────────────────────────────────────────────────────────────

function NotificationRow({ n }: { n: FeedNotification }) {
  return (
    <div className="flex gap-4 px-5 py-4 border-b border-[rgba(0,0,0,0.122)] hover:bg-black/[0.063] transition-colors">
      {/* Avatar 44×44 */}
      {n.actor_avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={n.actor_avatar_url}
          alt=""
          className="w-11 h-11 rounded-full object-cover shrink-0"
        />
      ) : (
        <div
          className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-white text-[14px] font-bold ${avatarColor(n.actor_user_id)}`}
        >
          {initials(n.actor_name)}
        </div>
      )}

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-normal leading-6 text-[rgba(0,0,0,0.608)]">
          {notifText(n)}
        </p>
        <p className="text-[12px] font-normal leading-4 text-[rgba(0,0,0,0.314)] mt-0.5">
          {timeAgo(n.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── NotificationsPanel ─────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}

type Tab = "menciones" | "actividad";

export function NotificationsPanel({ open, onClose, onUnreadChange }: Props) {
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("menciones");

  // On mount: load the unread count for the topbar badge (even while closed)
  useEffect(() => {
    getUnreadNotificationsCount()
      .then((count) => onUnreadChange?.(count))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // (Re-)fetch every time the panel opens; mark read like the original bell did
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications()
      .then((notifs) => {
        setNotifications(notifs);
        const hasUnread = notifs.some((n) => n.read_at === null);
        if (hasUnread) {
          onUnreadChange?.(0);
          void markNotificationsAsRead();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes the panel (same behaviour as Messages)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside
      className={`font-inter shrink-0 h-full bg-white border-l border-[rgba(0,0,0,0.122)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
        open ? "w-[400px]" : "w-0"
      }`}
    >
      {open && (
        <>
          {/* ── Header (56px) ── */}
          <div className="h-14 px-4 flex items-center justify-between border-b border-[rgba(0,0,0,0.122)] shrink-0">
            <h2 className="text-[20px] font-semibold text-[#202020]">Notificaciones</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Expandir"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/[0.063] hover:bg-black/[0.09] text-[#202020] transition-colors"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar notificaciones"
                className="w-8 h-8 rounded-full flex items-center justify-center bg-black/[0.063] hover:bg-black/[0.09] text-[#202020] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Segmented control ── */}
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.122)] shrink-0">
            <div className="h-10 flex bg-black/[0.063] rounded-[8px] p-1">
              {([
                ["menciones", "Menciones"],
                ["actividad", "Toda la actividad"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex-1 h-8 rounded-[6px] text-[14px] font-medium transition-colors ${
                    tab === id
                      ? "bg-white text-[rgba(0,0,0,0.875)] shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_4px_rgba(0,0,0,0.05)]"
                      : "text-[rgba(0,0,0,0.447)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ── List ── */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <span className="w-5 h-5 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full px-8 py-12 text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-black/[0.05] flex items-center justify-center">
                  <Bell className="w-6 h-6 text-[rgba(0,0,0,0.35)]" />
                </div>
                <div>
                  <p className="text-[16px] font-semibold text-[#202020]">
                    No tienes notificaciones
                  </p>
                  <p className="text-[14px] font-normal text-[rgba(0,0,0,0.512)] mt-1 leading-5 max-w-[240px]">
                    Cuando alguien interactúe contigo, aparecerá aquí.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                {notifications.map((n) => (
                  <NotificationRow key={n.id} n={n} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
