"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, BarChart2, CreditCard, Users, Wallet, LayoutGrid,
  Megaphone, MessageCircle, Package, Link2, FileText,
  TrendingUp, Code2, Settings, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  businessName: string;
}

export function BusinessSidebar({ businessId, businessName }: Props) {
  const pathname = usePathname();
  const base = `/mis-negocios/${businessId}`;

  const CORE = [
    { label: "Inicio",         href: base,                       icon: Home },
    { label: "Analítica",      href: `${base}/analitica`,        icon: BarChart2 },
    { label: "Pagos",          href: `${base}/pagos`,            icon: CreditCard },
    { label: "Usuarios",       href: `${base}/usuarios`,         icon: Users },
    { label: "Balances",       href: `${base}/balances`,         icon: Wallet },
    { label: "Tarjetas",       href: `${base}/tarjetas`,         icon: LayoutGrid },
    { label: "Anuncios",       href: `${base}/anuncios`,         icon: Megaphone },
    { label: "Chats de apoyo", href: `${base}/chats`,            icon: MessageCircle },
  ];

  const PINNED = [
    { label: "Productos",       href: `${base}/productos`,      icon: Package },
    { label: "Enlaces de pago", href: `${base}/enlaces-pago`,   icon: Link2 },
    { label: "Facturas",        href: `${base}/facturas`,       icon: FileText },
  ];

  const TOOLS = [
    { label: "Marketing",       href: `${base}/marketing`,      icon: TrendingUp },
    { label: "Desarrollador",   href: `${base}/desarrollador`,  icon: Code2 },
    { label: "Configuraciones", href: `${base}/configuraciones`,icon: Settings },
  ];

  function isActive(href: string) {
    return href === base ? pathname === base : pathname.startsWith(href);
  }

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
          active
            ? "bg-brand-50 text-brand-700 font-medium"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {label}
      </Link>
    );
  }

  function Section({ label, items }: { label: string; items: typeof CORE }) {
    return (
      <div className="space-y-0.5">
        <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {label}
        </p>
        {items.map((item) => <NavItem key={item.href} {...item} />)}
      </div>
    );
  }

  return (
    <aside className="w-56 shrink-0 h-full flex flex-col bg-white border-r border-gray-100 overflow-y-auto">
      <div className="px-3 py-4 border-b border-gray-100 space-y-2">
        <Link
          href="/mis-negocios"
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Mis negocios
        </Link>
        <p className="text-sm font-semibold text-gray-900 truncate px-1">{businessName}</p>
      </div>

      <nav className="flex-1 py-4 space-y-5 px-2">
        <Section label="Panel de control" items={CORE} />
        <Section label="Fijado" items={PINNED} />
        <Section label="Todas las herramientas" items={TOOLS} />
      </nav>
    </aside>
  );
}
