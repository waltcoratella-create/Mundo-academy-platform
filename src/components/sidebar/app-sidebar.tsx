"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Home, Search, Zap, Briefcase, Brain, GraduationCap,
  Calendar, Target, ShoppingBag, Fish, Settings, Crown, Puzzle,
  HelpCircle, Users, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Nav data ──────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const CORE: NavItem[] = [
  { label: "Inicio",         href: "/inicio",          icon: Home },
  { label: "Descubrir",      href: "/descubrir",       icon: Search },
  { label: "Mis productos",  href: "/mis-productos",   icon: BookOpen },
  { label: "Crear negocio",  href: "/crear",           icon: Zap },
  { label: "Mis negocios",   href: "/mis-negocios",    icon: Briefcase },
];

const ECOSYSTEM: NavItem[] = [
  { label: "Venture AI",  href: "/venture-ai",  icon: Brain },
  { label: "Cursos",      href: "/cursos",       icon: GraduationCap },
  { label: "Comunidad",   href: "/comunidad",    icon: Users },
  { label: "Eventos",     href: "/eventos",      icon: Calendar },
  { label: "Mentorías",   href: "/mentorias",    icon: Target },
  { label: "Marketplace", href: "/marketplace",  icon: ShoppingBag },
  { label: "Shark Tank",  href: "/shark-tank",   icon: Fish },
];

const ACCOUNT: NavItem[] = [
  { label: "Configuración",   href: "/configuracion", icon: Settings },
  { label: "Mi suscripción",  href: "/suscripcion",   icon: Crown },
  { label: "Apps instaladas", href: "/apps",          icon: Puzzle },
  { label: "Ayuda",           href: "/ayuda",         icon: HelpCircle },
];

// ── NavSection ────────────────────────────────────────────────────────────────

function NavSection({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    // Nav group: flex-col, gap 2px, padding-right 8px (pr-2)
    <div className="flex flex-col gap-0.5 pr-2">
      {label && (
        // Section label: 12px, 500, uppercase, letter-spacing 0.3px, pl-3, mb-1
        <p className="pl-3 mb-1 text-[12px] font-medium uppercase tracking-[0.3px] text-black/60 leading-none">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // Base: height 48px, border-radius 14px, padding 0 9px, gap 8px
              "flex items-center gap-2 px-[9px] h-12 w-full rounded-[14px]",
              // Typography: 18px, 500, tracking -0.2925px, line-height 26px
              "text-[18px] font-medium tracking-[-0.2925px] leading-[26px]",
              "transition-colors duration-150 cursor-pointer select-none",
              active
                // Active: bg #e0e0e0, color #202020
                ? "bg-[#e0e0e0] text-[#202020]"
                // Default: color rgba(0,0,0,0.608); Hover: bg #fafafa
                : "text-black/60 hover:bg-[#fafafa]"
            )}
          >
            {/* Icon: 24×24 */}
            <item.icon className="w-6 h-6 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

// ── AppSidebar ────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const { user } = useUser();

  return (
    // Aside: 280px, full height, white bg, right border, flex-col, no overflow, z-1
    <aside className="w-[280px] h-full flex flex-col bg-white border-r border-[#e8e8e8] overflow-hidden relative z-[1]">

      {/* ── Logo ── */}
      <div className="shrink-0 px-2 pt-3 pb-1">
        <div className="flex items-center px-[9px] h-12">
          <span className="text-[18px] font-bold text-gray-900 tracking-tight leading-none">
            🌍 Mundo Academy
          </span>
        </div>
      </div>

      {/* ── User profile ── */}
      <div className="shrink-0 px-2 pb-2">
        <div className="flex items-center gap-2 px-[9px] h-12 rounded-[14px] hover:bg-[#fafafa] transition-colors duration-150 cursor-pointer">
          <UserButton afterSignOutUrl="/sign-in" />
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-gray-900 truncate leading-tight">
              {user?.firstName ?? "Usuario"}
            </p>
            <p className="text-[12px] text-black/60 truncate leading-tight">
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="shrink-0 mx-4 border-t border-[#e8e8e8]" />

      {/* ── Scrollable nav ── */}
      {/*
        Inner scroll container:
          flex-col, gap 16px, padding 12px 8px, height 100%, overflow-y auto
      */}
      <nav className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-2 py-3">
          <NavSection items={CORE} />
          <NavSection items={ECOSYSTEM} label="Apps / Ecosistema" />
          <NavSection items={ACCOUNT} label="Cuenta" />
        </div>
      </nav>

    </aside>
  );
}
