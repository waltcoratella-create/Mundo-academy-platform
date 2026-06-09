"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  Home, BarChart2, CreditCard, Users, Wallet, LayoutGrid,
  Megaphone, MessageCircle, Package, Link2, FileText,
  TrendingUp, Code2, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  businessName: string;
}

export function BusinessSidebar({ businessId, businessName }: Props) {
  const pathname = usePathname();
  const base = `/mis-negocios/${businessId}`;

  // ── Nav data ────────────────────────────────────────────────────────────────

  const CORE = [
    { label: "Inicio",         href: base,                        icon: Home },
    { label: "Analítica",      href: `${base}/analitica`,         icon: BarChart2 },
    { label: "Pagos",          href: `${base}/pagos`,             icon: CreditCard },
    { label: "Usuarios",       href: `${base}/usuarios`,          icon: Users },
    { label: "Balances",       href: `${base}/balances`,          icon: Wallet },
    { label: "Tarjetas",       href: `${base}/tarjetas`,          icon: LayoutGrid },
    { label: "Anuncios",       href: `${base}/anuncios`,          icon: Megaphone },
    { label: "Chats de apoyo", href: `${base}/chats`,             icon: MessageCircle },
  ];

  const PINNED = [
    { label: "Productos",       href: `${base}/productos`,        icon: Package },
    { label: "Enlaces de pago", href: `${base}/enlaces-pago`,     icon: Link2 },
    { label: "Facturas",        href: `${base}/facturas`,         icon: FileText },
  ];

  const TOOLS = [
    { label: "Marketing",       href: `${base}/marketing`,        icon: TrendingUp },
    { label: "Desarrollador",   href: `${base}/desarrollador`,    icon: Code2 },
    { label: "Configuraciones", href: `${base}/configuraciones`,  icon: Settings },
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function isActive(href: string) {
    return href === base ? pathname === base : pathname.startsWith(href);
  }

  // ── Sub-components ───────────────────────────────────────────────────────────

  function NavItem({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2 px-[9px] h-12 w-full rounded-[14px]",
          "text-[18px] font-medium tracking-[-0.2925px] leading-[26px]",
          "transition-colors duration-150 cursor-pointer select-none",
          active
            ? "bg-[#e0e0e0] text-[#202020]"
            : "text-black/60 hover:bg-[#fafafa]"
        )}
      >
        <Icon className="w-6 h-6 shrink-0" />
        {label}
      </Link>
    );
  }

  function NavSection({
    label,
    items,
  }: {
    label: string;
    items: { label: string; href: string; icon: React.ElementType }[];
  }) {
    return (
      <div className="flex flex-col gap-0.5 pr-2">
        <p className="pl-3 mb-1 text-[12px] font-medium uppercase tracking-[0.3px] text-black/60 leading-none">
          {label}
        </p>
        {items.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <aside className="w-[280px] shrink-0 h-full flex flex-col bg-white border-r border-[#e8e8e8] overflow-hidden">

      {/* ── Back link + business name ───────────────────────────────── */}
      <div className="px-2 py-3 border-b border-[#e8e8e8]">
        {/* Back */}
        <Link
          href="/mis-negocios"
          className={cn(
            "flex items-center gap-2 px-[9px] h-9 w-full rounded-[14px]",
            "text-[14px] font-medium tracking-[-0.2px] leading-[20px]",
            "text-black/50 hover:bg-[#fafafa] hover:text-black/70 transition-colors duration-150"
          )}
        >
          <ChevronLeft className="w-5 h-5 shrink-0" />
          Mis negocios
        </Link>

        {/* Business name */}
        <div className="px-[9px] mt-1.5">
          <p className="text-[16px] font-semibold text-[#202020] truncate tracking-[-0.35px] leading-[22px]">
            {businessName}
          </p>
        </div>
      </div>

      {/* ── Scrollable nav ─────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-2 py-3">
          <NavSection label="Panel de control" items={CORE} />
          <NavSection label="Fijado"           items={PINNED} />
          <NavSection label="Todas las herramientas" items={TOOLS} />
        </div>
      </nav>

    </aside>
  );
}
