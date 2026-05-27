"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  LayoutDashboard,
  Plus,
  HelpCircle,
  Heart,
  BookOpen,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Navigation data ───────────────────────────────────────────────────────────

const MAIN_NAV = [
  { label: "Inicio",             href: "/inicio",       icon: Home },
  { label: "Descubrir",          href: "/descubrir",    icon: Compass },
  { label: "Panel de control",   href: "/mis-negocios", icon: LayoutDashboard },
  { label: "Iniciar un negocio", href: "/crear",        icon: Plus },
];

const APPS: {
  label: string;
  href: string;
  initials: string;
  bg: string;
}[] = [
  { label: "Mundo Academy",    href: "/inicio",       initials: "MA", bg: "bg-blue-600" },
  { label: "Venture AI",       href: "/venture-ai",   initials: "VA", bg: "bg-purple-600" },
  { label: "Mundo Ejecutivo",  href: "/mis-negocios", initials: "ME", bg: "bg-emerald-600" },
  { label: "Agency Navigator", href: "/mis-negocios", initials: "AN", bg: "bg-indigo-600" },
];

const RECURSOS = [
  { label: "Afiliados", href: "/afiliados", icon: Heart },
  { label: "Ayuda",     href: "/ayuda",     icon: HelpCircle },
  { label: "Blog",      href: "/blog",      icon: BookOpen },
  { label: "Acerca de", href: "/acerca",    icon: Info },
];

// ── Helper ────────────────────────────────────────────────────────────────────

function useIsActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

// ── Sidebar component ─────────────────────────────────────────────────────────

export function AppSidebar() {
  return (
    <aside className="w-60 shrink-0 h-full flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
      {/* Logo */}
      <div className="px-5 py-5 shrink-0">
        <Link href="/inicio" className="flex items-center gap-2.5">
          <span className="text-xl">🌍</span>
          <span className="text-sm font-bold text-gray-900 tracking-tight leading-none">
            Mundo Academy
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-6 overflow-y-auto">

        {/* Main nav */}
        <ul className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavItem key={item.href + item.label} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </ul>

        {/* Apps / Comunidades */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Apps
          </p>
          <ul className="space-y-0.5">
            {APPS.map((app) => (
              <AppItem key={app.label} {...app} />
            ))}
          </ul>
        </div>

        {/* Recursos */}
        <div>
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Recursos
          </p>
          <ul className="space-y-0.5">
            {RECURSOS.map((item) => (
              <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
            ))}
          </ul>
        </div>

      </nav>
    </aside>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  const active = useIsActive(href);
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    </li>
  );
}

// ── App item (with colored square avatar) ─────────────────────────────────────

function AppItem({
  href,
  initials,
  bg,
  label,
}: {
  href: string;
  initials: string;
  bg: string;
  label: string;
}) {
  const active = useIsActive(href) && href !== "/mis-negocios";
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <span
          className={cn(
            "w-5 h-5 rounded-md flex items-center justify-center text-white font-bold shrink-0",
            bg
          )}
          style={{ fontSize: 9 }}
        >
          {initials}
        </span>
        {label}
      </Link>
    </li>
  );
}
