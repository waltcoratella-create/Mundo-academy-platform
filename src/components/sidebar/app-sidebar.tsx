"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Search, Zap, Briefcase, Brain, GraduationCap,
  Calendar, Target, ShoppingBag, Fish, Settings, Crown, BookOpen,
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
  { label: "Eventos",     href: "/eventos",      icon: Calendar },
  { label: "Mentorías",   href: "/mentorias",    icon: Target },
  { label: "Marketplace", href: "/marketplace",  icon: ShoppingBag },
  { label: "Shark Tank",  href: "/shark-tank",   icon: Fish },
];

const ACCOUNT: NavItem[] = [
  { label: "Configuración",  href: "/configuracion", icon: Settings },
  { label: "Mi suscripción", href: "/suscripcion",   icon: Crown },
];

// ── NavSection ────────────────────────────────────────────────────────────────

function NavSection({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0.5 pr-2">
      {label && (
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
              "flex items-center gap-2 px-[9px] h-12 w-full rounded-[14px]",
              "text-[18px] font-medium tracking-[-0.2925px] leading-[26px]",
              "transition-colors duration-150 cursor-pointer select-none",
              active
                ? "bg-[#e0e0e0] text-[#202020]"
                : "text-black/60 hover:bg-[#fafafa]"
            )}
          >
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
  return (
    <aside className="w-[280px] h-full flex flex-col bg-white border-r border-[#e8e8e8] overflow-hidden relative z-[1]">

      {/* ── Scrollable nav (starts at top) ── */}
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
