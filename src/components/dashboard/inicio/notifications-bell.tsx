"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Bell } from "lucide-react";
import {
  getNotifications,
  getUnreadNotificationsCount,
  markNotificationsAsRead,
} from "@/app/(dashboard)/inicio/actions";
import type { FeedNotification } from "@/app/(dashboard)/inicio/actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
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

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationsBell() {
  const [open, setOpen]               = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<FeedNotification[]>([]);
  const [loading, setLoading]         = useState(false);
  const [, startTransition]           = useTransition();
  const dropdownRef                   = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount (best-effort, non-blocking)
  useEffect(() => {
    getUnreadNotificationsCount().then(setUnreadCount).catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  async function handleToggle() {
    const isOpening = !open;
    setOpen(isOpening);

    if (!isOpening) return;

    // (Re-)fetch every open so new notifications appear
    setLoading(true);
    try {
      const notifs = await getNotifications();
      setNotifications(notifs);
      // Mark as read optimistically; fire server action in background
      if (unreadCount > 0) {
        setUnreadCount(0);
        startTransition(() => {
          markNotificationsAsRead();
        });
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell button */}
      <button
        onClick={handleToggle}
        aria-label="Notificaciones"
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notificaciones</p>
          </div>

          {/* Body */}
          {loading ? (
            <div className="px-4 py-8 flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">No tienes notificaciones</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-[200px]">
                  Cuando alguien interactúe contigo, aparecerá aquí.
                </p>
              </div>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notification item ─────────────────────────────────────────────────────────

function NotificationItem({ notification: n }: { notification: FeedNotification }) {
  const isUnread = n.read_at === null;
  const bg       = avatarColor(n.actor_user_id);
  const label    = initials(n.actor_name);

  return (
    <li
      className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
        isUnread ? "bg-blue-50/40" : ""
      }`}
    >
      {/* Actor avatar */}
      <div className="shrink-0 mt-0.5">
        {n.actor_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.actor_avatar_url}
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${bg}`}
          >
            {label}
          </div>
        )}
      </div>

      {/* Text + time */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-800 leading-snug">{notifText(n)}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
      )}
    </li>
  );
}
