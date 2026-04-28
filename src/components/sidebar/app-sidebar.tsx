"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Home, Search, Zap, Briefcase, LayoutDashboard, Users, CreditCard,
  Package, MessageSquare, FileText, Bot, Brain, GraduationCap,
  Calendar, Target, ShoppingBag, Fish, Settings, Crown, Puzzle,
  HelpCircle, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const CORE: NavItem[] = [
  { label: "Inicio",          href: "/inicio",        icon: Home },
  { label: "Descubrir",       href: "/descubrir",     icon: Search },
  { label: "Crear negocio",   href: "/crear",         icon: Zap },
  { label: "Mis negocios",    href: "/mis-negocios",  icon: Briefcase },
];

const BUSINESS_SUB: NavItem[] = [
  { label: "Dashboard",       href: "/mis-negocios",            icon: LayoutDashboard },
  { label: "Usuarios",        href: "/mis-negocios/usuarios",   icon: Users },
  { label: "Pagos",           href: "/mis-negocios/pagos",      icon: CreditCard },
  { label: "Productos",       href: "/mis-negocios/productos",  icon: Package },
  { label: "Comunidad",       href: "/mis-negocios/comunidad",  icon: MessageSquare },
  { label: "Contenido",       href: "/mis-negocios/contenido",  icon: FileText },
  { label: "Automatizaciones",href: "/mis-negocios/automations",icon: Bot },
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
  { label: "Configuración",    href: "/configuracion",  icon: Settings },
  { label: "Mi suscripción",   href: "/suscripcion",    icon: Crown },
  { label: "Apps instaladas",  href: "/apps",           icon: Puzzle },
  { label: "Ayuda",            href: "/ayuda",           icon: HelpCircle },
];

function NavSection({ items, label }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();
  return (
    <div className="px-3">
      {label && (
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          {label}
        </p>
      )}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "sidebar-item",
                  active && "active"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AppSidebar() {
  const { user } = useUser();
  const [businessOpen, setBusinessOpen] = useState(true);

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-base font-bold text-white tracking-tight">🌍 MUNDO ACADEMY</p>
      </div>

      {/* User */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
        <UserButton afterSignOutUrl="/sign-in" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {user?.firstName ?? "Usuario"}
          </p>
          <p className="text-xs text-slate-400 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-5">
        <NavSection items={CORE} label="Core" />

        <div className="px-3">
          <button
            onClick={() => setBusinessOpen((v) => !v)}
            className="sidebar-item w-full justify-between"
          >
            <span className="flex items-center gap-3">
              <Briefcase className="w-4 h-4" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Mis Negocios
              </span>
            </span>
            <ChevronDown
              className={cn("w-3.5 h-3.5 text-slate-500 transition-transform", businessOpen && "rotate-180")}
            />
          </button>
          {businessOpen && (
            <ul className="mt-1 space-y-0.5 pl-2">
              {BUSINESS_SUB.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn("sidebar-item text-xs", usePathname() === item.href && "active")}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <NavSection items={ECOSYSTEM} label="Apps / Ecosistema" />
        <NavSection items={ACCOUNT} label="Cuenta" />
      </nav>
    </aside>
  );
}
