"use client";

import Link from "next/link";
import Image from "next/image";
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
  img?: string; // optional custom icon asset (30×30, rendered instead of `icon`)
}

const CORE: NavItem[] = [
  { label: "Inicio",         href: "/inicio",          icon: Home },
  { label: "Descubrir",      href: "/descubrir",       icon: Search },
  { label: "Mis productos",  href: "/mis-productos",   icon: BookOpen },
  { label: "Crear negocio",  href: "/crear",           icon: Zap },
  { label: "Mis negocios",   href: "/mis-negocios",    icon: Briefcase },
];

const ECOSYSTEM: NavItem[] = [
  { label: "Akka",        href: "/venture-ai",  icon: Brain,         img: "/sidebar/venture-ai.png" },
  { label: "Cursos",      href: "/cursos",       icon: GraduationCap, img: "/sidebar/cursos.png" },
  { label: "Eventos",     href: "/eventos",      icon: Calendar,      img: "/sidebar/eventos.png" },
  { label: "Mentorías",   href: "/mentorias",    icon: Target,        img: "/sidebar/mentorias.png" },
  { label: "Marketplace", href: "/marketplace",  icon: ShoppingBag },
  { label: "Shark Tank",  href: "/shark-tank",   icon: Fish,          img: "/sidebar/shark-tank.png" },
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
            {item.img ? (
              <Image
                src={item.img}
                alt={item.label}
                width={30}
                height={30}
                quality={100}
                className="w-[30px] h-[30px] rounded-[25%] object-cover shrink-0"
              />
            ) : (
              <item.icon className="w-6 h-6 shrink-0" />
            )}
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
