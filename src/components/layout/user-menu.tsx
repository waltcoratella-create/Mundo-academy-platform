"use client";

import { useState, useEffect, useRef } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  ShoppingBag,
  Ticket,
  CircleDollarSign,
  HelpCircle,
  Languages,
  Scale,
  LogOut,
  Code2,
  Monitor,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-600",
];
function avatarColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "U") + (parts[1]?.[0] ?? "")).toUpperCase();
}

type AppearanceMode = "system" | "light" | "dark";

// ── Component ─────────────────────────────────────────────────────────────────

export function UserMenu() {
  const { user }      = useUser();
  const { signOut }   = useClerk();
  const router        = useRouter();
  const [open, setOpen]             = useState(false);
  const [devMode, setDevMode]       = useState(false);
  const [appearance, setAppearance] = useState<AppearanceMode>("system");
  const containerRef  = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ??
    "Usuario";
  const avatarUrl = user?.imageUrl ?? null;
  const userId    = user?.id ?? "";
  const bg        = avatarColor(userId || "default");
  const label     = initials(displayName);

  function close() {
    setOpen(false);
  }

  async function handleSignOut() {
    close();
    await signOut({ redirectUrl: "/sign-in" });
  }

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full hover:opacity-80 transition-opacity"
      >
        <UserAvatar url={avatarUrl} label={label} bg={bg} size={32} />
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] bg-white rounded-2xl border border-gray-100 shadow-[0_8px_40px_-4px_rgba(0,0,0,0.15)] z-50 overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-4">
            <Link href={`/u/${userId}`} onClick={close} className="shrink-0 hover:opacity-80 transition-opacity">
              <UserAvatar url={avatarUrl} label={label} bg={bg} size={40} />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                {displayName}
              </p>
              <Link
                href={`/u/${userId}`}
                onClick={close}
                className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
              >
                Ver perfil
              </Link>
            </div>
            <Link
              href="/configuracion"
              onClick={close}
              title="Configuración"
              className="shrink-0 p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          <Divider />

          {/* Main items */}
          <Section>
            <MenuItem icon={ShoppingBag} label="Pedidos"     onClick={close} />
            <MenuItem icon={Ticket}      label="Afiliados"   onClick={close} />
            <MenuItem icon={CircleDollarSign} label="Finanzas" onClick={close} />
          </Section>

          <Divider />

          {/* Support items */}
          <Section>
            <MenuItem icon={HelpCircle} label="Ayuda y soporte"  onClick={close} />
            <MenuItem icon={Languages}  label="Idioma"    onClick={close} trailing={<ChevronRight className="w-3.5 h-3.5 text-gray-400" />} />
            <MenuItem icon={Scale}      label="Legal"     onClick={close} trailing={<ChevronRight className="w-3.5 h-3.5 text-gray-400" />} />
            <MenuItem
              icon={LogOut}
              label="Cerrar sesión"
              onClick={handleSignOut}
            />
          </Section>

          <Divider />

          {/* Developer mode */}
          <Section>
            <div className="flex items-center gap-3 px-4 py-2.5">
              <Code2 className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="flex-1 text-sm text-gray-700">Modo de desarrollador</span>
              {/* Toggle */}
              <button
                role="switch"
                aria-checked={devMode}
                onClick={() => setDevMode((v) => !v)}
                className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                  devMode ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    devMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </Section>

          <Divider />

          {/* Appearance */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(
                [
                  { mode: "system" as AppearanceMode, icon: Monitor, label: "Sistema" },
                  { mode: "light"  as AppearanceMode, icon: Sun,     label: "Claro"   },
                  { mode: "dark"   as AppearanceMode, icon: Moon,    label: "Oscuro"  },
                ] as const
              ).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => setAppearance(mode)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    appearance === mode
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UserAvatar({
  url,
  label,
  bg,
  size,
}: {
  url: string | null;
  label: string;
  bg: string;
  size: number;
}) {
  const cls = `rounded-full object-cover`;
  const style = { width: size, height: size };

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={cls} style={style} />
    );
  }
  return (
    <div
      className={`${cls} flex items-center justify-center text-white font-bold ${bg}`}
      style={{ ...style, fontSize: size * 0.35 }}
    >
      {label}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gray-100" />;
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="py-1.5">{children}</div>;
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  trailing,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
    >
      <Icon className="w-4 h-4 text-gray-500 shrink-0" />
      <span className="flex-1">{label}</span>
      {trailing}
    </button>
  );
}
