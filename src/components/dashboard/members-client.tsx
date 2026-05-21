"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Users, ShoppingBag, Eye, Ban, CalendarClock, Search,
  X, DollarSign, TrendingUp, Repeat, UserPlus, Package, CreditCard,
  Plus, Settings2, Download, Check, GripVertical, Mail, MessageCircle,
} from "lucide-react";
import type {
  BusinessMember, MemberSummary,
  BusinessCustomer, CustomerSummary,
} from "@/lib/supabase/queries";

type Tab = "miembros" | "clientes";
type StatusFilter = "all" | "active" | "expired";
type CustomerFilter = "all" | "repeat" | "new";
type CustomerSort = "revenue" | "recent" | "orders";
type DateRangeOption = "all" | "today" | "7d" | "4w" | "3m" | "12m";
type SpentOption = "all" | "0" | "1-50" | "50-100" | "100+";
type OrdersOption = "all" | "0" | "1" | "2+" | "5+";
type PillKey = "dateJoined" | "lastAccessed" | "totalSpent" | "totalOrders";
type ExportRange = "all" | "today" | "7d" | "4w" | "month" | "lastMonth";

const ALL_COLS = [
  "email", "estado", "pais", "ciudad", "gasto", "seUnio", "ultimoAcceso", "pedidos", "contacto",
] as const;
type ColKey = (typeof ALL_COLS)[number];
const DEFAULT_COLS = new Set<ColKey>(["email", "estado", "pais", "gasto", "seUnio"]);
const COL_LABELS: Record<ColKey, string> = {
  email:        "Correo electrónico",
  estado:       "Estado",
  pais:         "País",
  ciudad:       "Ciudad",
  gasto:        "Gasto total",
  seUnio:       "Se unió el",
  ultimoAcceso: "Último acceso",
  pedidos:      "Pedidos",
  contacto:     "Contacto",
};

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-gray-100 text-gray-600",
  expired:  "bg-gray-100 text-gray-400",
  inactive: "bg-red-50 text-red-500",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Unido", expired: "Expirado", inactive: "Inactivo",
};

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "all",  label: "Todos" },
  { value: "today", label: "Hoy" },
  { value: "7d",  label: "Últimos 7 días" },
  { value: "4w",  label: "Últimas 4 semanas" },
  { value: "3m",  label: "Últimos 3 meses" },
  { value: "12m", label: "Últimos 12 meses" },
];
const SPENT_OPTIONS: { value: SpentOption; label: string }[] = [
  { value: "all",    label: "Todos" },
  { value: "0",      label: "$0" },
  { value: "1-50",   label: "$1 – $50" },
  { value: "50-100", label: "$50 – $100" },
  { value: "100+",   label: "$100+" },
];
const ORDERS_OPTIONS: { value: OrdersOption; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "0",   label: "0 pedidos" },
  { value: "1",   label: "1 pedido" },
  { value: "2+",  label: "2+ pedidos" },
  { value: "5+",  label: "5+ pedidos" },
];
const EXPORT_RANGES: { value: ExportRange; label: string }[] = [
  { value: "all",       label: "Todos" },
  { value: "today",     label: "Hoy" },
  { value: "7d",        label: "Últimos 7 días" },
  { value: "4w",        label: "Últimas 4 semanas" },
  { value: "month",     label: "Mes en curso" },
  { value: "lastMonth", label: "El mes pasado" },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function getDateBoundary(opt: DateRangeOption): number {
  const now = Date.now();
  switch (opt) {
    case "today": return new Date().setHours(0, 0, 0, 0);
    case "7d":    return now - 7  * 86_400_000;
    case "4w":    return now - 28 * 86_400_000;
    case "3m":    return now - 90 * 86_400_000;
    case "12m":   return now - 365 * 86_400_000;
    default:      return 0;
  }
}

function matchesSpent(n: number, f: SpentOption): boolean {
  if (f === "0")      return n === 0;
  if (f === "1-50")   return n >= 1 && n <= 50;
  if (f === "50-100") return n > 50 && n <= 100;
  if (f === "100+")   return n > 100;
  return true;
}

function matchesOrders(n: number, f: OrdersOption): boolean {
  if (f === "0")  return n === 0;
  if (f === "1")  return n === 1;
  if (f === "2+") return n >= 2;
  if (f === "5+") return n >= 5;
  return true;
}

function filterByExportRange(members: BusinessMember[], range: ExportRange): BusinessMember[] {
  if (range === "all") return members;
  const now = Date.now();
  const today = new Date().setHours(0, 0, 0, 0);
  let from = 0, to = now;
  switch (range) {
    case "today":     from = today; break;
    case "7d":        from = now - 7 * 86_400_000; break;
    case "4w":        from = now - 28 * 86_400_000; break;
    case "month": {
      const d = new Date(); from = new Date(d.getFullYear(), d.getMonth(), 1).getTime(); break;
    }
    case "lastMonth": {
      const d = new Date();
      from = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
      to   = new Date(d.getFullYear(), d.getMonth(), 0).getTime();
      break;
    }
  }
  return members.filter((m) => {
    const t = new Date(m.joined_at).getTime();
    return t >= from && t <= to;
  });
}

function getCellValue(col: ColKey, m: BusinessMember, c?: BusinessCustomer): string {
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  switch (col) {
    case "email":        return m.user_email ?? "";
    case "estado":       return STATUS_LABELS[m.status] ?? m.status;
    case "pais":         return "";
    case "ciudad":       return "";
    case "gasto":        return c ? String(c.totalSpent) : "0";
    case "seUnio":       return fmtDate(m.joined_at);
    case "ultimoAcceso": return c?.lastPurchase ? fmtDate(c.lastPurchase) : "";
    case "pedidos":      return c ? String(c.totalOrders) : "0";
    case "contacto":     return m.user_email ?? "";
    default:             return "";
  }
}

// ── Root ──────────────────────────────────────────────────────────────────────

interface Props {
  members: BusinessMember[];
  summary: MemberSummary;
  customers: BusinessCustomer[];
  customerSummary: CustomerSummary;
  businessName: string;
}

export function MembersClient({
  members, summary, customers, customerSummary, businessName,
}: Props) {
  const [tab, setTab] = useState<Tab>("miembros");
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">{businessName} · Miembros y clientes</p>
      </div>
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([
          ["miembros", "Usuarios",   members.length],
          ["clientes", "Membresías", customers.length],
        ] as [Tab, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">{count}</span>
          </button>
        ))}
      </div>
      {tab === "miembros" && <MiembrosTab members={members} summary={summary} customers={customers} />}
      {tab === "clientes" && <ClientesTab customers={customers} summary={customerSummary} />}
    </div>
  );
}

// ── Usuarios tab ──────────────────────────────────────────────────────────────

function MiembrosTab({
  members, summary, customers,
}: {
  members: BusinessMember[];
  summary: MemberSummary;
  customers: BusinessCustomer[];
}) {
  const [statusFilter, setStatusFilter]         = useState<StatusFilter>("all");
  const [productFilter, setProductFilter]       = useState<string>("all");
  const [visibleCols, setVisibleCols]           = useState<Set<ColKey>>(new Set(DEFAULT_COLS));
  const [openPill, setOpenPill]                 = useState<PillKey | null>(null);
  const [editOpen, setEditOpen]                 = useState(false);
  const [exportOpen, setExportOpen]             = useState(false);
  const [dateJoinedFilter, setDateJoinedFilter] = useState<DateRangeOption>("all");
  const [lastAccessFilter, setLastAccessFilter] = useState<DateRangeOption>("all");
  const [spentFilter, setSpentFilter]           = useState<SpentOption>("all");
  const [ordersFilter, setOrdersFilter]         = useState<OrdersOption>("all");
  const editRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editOpen) return;
    const h = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) setEditOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [editOpen]);

  const customerMap = useMemo(() => {
    const m = new Map<string, BusinessCustomer>();
    for (const c of customers) m.set(c.user_id, c);
    return m;
  }, [customers]);

  function toggleCol(col: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  const products = Array.from(
    new Map(members.map((m) => [m.product_id, m.product_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = members.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (productFilter !== "all" && m.product_id !== productFilter) return false;
    const customer = m.user_id ? customerMap.get(m.user_id) : undefined;
    if (dateJoinedFilter !== "all") {
      if (new Date(m.joined_at).getTime() < getDateBoundary(dateJoinedFilter)) return false;
    }
    if (lastAccessFilter !== "all") {
      const lastAccess = customer?.lastPurchase ?? m.joined_at;
      if (new Date(lastAccess).getTime() < getDateBoundary(lastAccessFilter)) return false;
    }
    if (spentFilter !== "all") {
      if (!matchesSpent(customer?.totalSpent ?? 0, spentFilter)) return false;
    }
    if (ordersFilter !== "all") {
      if (!matchesOrders(customer?.totalOrders ?? 0, ordersFilter)) return false;
    }
    return true;
  });

  const activeFilters =
    (dateJoinedFilter !== "all" ? 1 : 0) +
    (lastAccessFilter !== "all" ? 1 : 0) +
    (spentFilter       !== "all" ? 1 : 0) +
    (ordersFilter      !== "all" ? 1 : 0);

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Activos"          value={String(summary.activeCount)}        sub="con acceso activo"      accent="blue"   />
        <SummaryCard label="Nuevos (30 días)" value={String(summary.newLast30d)}          sub="últimas 4 semanas"      accent="indigo" />
        <SummaryCard label="Productos"        value={String(summary.productsWithMembers)} sub="con al menos 1 miembro" accent="green"  />
        <SummaryCard
          label="Origen"
          value={`${summary.purchaseCount} / ${summary.manualCount}`}
          sub="compras / manuales"
          accent="yellow"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Left: filter pills */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <PillFilter
            label="Date joined"
            active={dateJoinedFilter !== "all"}
            open={openPill === "dateJoined"}
            onToggle={() => setOpenPill((p) => (p === "dateJoined" ? null : "dateJoined"))}
            onClose={() => setOpenPill(null)}
          >
            <OptionList
              options={DATE_OPTIONS}
              value={dateJoinedFilter}
              onChange={(v) => { setDateJoinedFilter(v); setOpenPill(null); }}
            />
          </PillFilter>

          <PillFilter
            label="Last accessed"
            active={lastAccessFilter !== "all"}
            open={openPill === "lastAccessed"}
            onToggle={() => setOpenPill((p) => (p === "lastAccessed" ? null : "lastAccessed"))}
            onClose={() => setOpenPill(null)}
          >
            <OptionList
              options={DATE_OPTIONS}
              value={lastAccessFilter}
              onChange={(v) => { setLastAccessFilter(v); setOpenPill(null); }}
            />
          </PillFilter>

          <PillFilter
            label="Total spent"
            active={spentFilter !== "all"}
            open={openPill === "totalSpent"}
            onToggle={() => setOpenPill((p) => (p === "totalSpent" ? null : "totalSpent"))}
            onClose={() => setOpenPill(null)}
          >
            <OptionList
              options={SPENT_OPTIONS}
              value={spentFilter}
              onChange={(v) => { setSpentFilter(v); setOpenPill(null); }}
            />
          </PillFilter>

          <PillFilter
            label="Total orders"
            active={ordersFilter !== "all"}
            open={openPill === "totalOrders"}
            onToggle={() => setOpenPill((p) => (p === "totalOrders" ? null : "totalOrders"))}
            onClose={() => setOpenPill(null)}
          >
            <OptionList
              options={ORDERS_OPTIONS}
              value={ordersFilter}
              onChange={(v) => { setOrdersFilter(v); setOpenPill(null); }}
            />
          </PillFilter>

          {/* Status pills */}
          {(["all", "active", "expired"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === f
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {{ all: "Todos", active: "Activos", expired: "Expirados" }[f]}
            </button>
          ))}

          {products.length > 1 && (
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">Todos los productos</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setDateJoinedFilter("all");
                setLastAccessFilter("all");
                setSpentFilter("all");
                setOrdersFilter("all");
              }}
              className="px-2.5 py-1 rounded-full text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}

          <span className="text-xs text-gray-400 whitespace-nowrap">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Right: Exportar + Editar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </button>

          <div className="relative" ref={editRef}>
            <button
              onClick={() => setEditOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                editOpen
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Editar
            </button>
            {editOpen && (
              <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[220px] py-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-1.5">Columnas</p>
                {ALL_COLS.map((col) => (
                  <button
                    key={col}
                    onClick={() => toggleCol(col)}
                    className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {visibleCols.has(col)
                        ? <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        : <span className="w-3.5 h-3.5 shrink-0" />}
                      {COL_LABELS[col]}
                    </div>
                    <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <Users className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {members.length === 0 ? "Todavía no hay miembros registrados." : "No hay miembros con este filtro."}
            </p>
            {members.length === 0 && (
              <p className="text-xs text-gray-400">Aparecerán aquí cuando alguien acceda a tus productos.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Usuario</th>
                  {visibleCols.has("email")        && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Correo electrónico</th>}
                  {visibleCols.has("estado")       && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Estado</th>}
                  {visibleCols.has("pais")         && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">País</th>}
                  {visibleCols.has("ciudad")       && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Ciudad</th>}
                  {visibleCols.has("gasto")        && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Gasto total</th>}
                  {visibleCols.has("seUnio")       && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Se unió el</th>}
                  {visibleCols.has("ultimoAcceso") && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Último acceso</th>}
                  {visibleCols.has("pedidos")      && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Pedidos</th>}
                  {visibleCols.has("contacto")     && <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Contacto</th>}
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <MemberRow key={m.id} member={m} visibleCols={visibleCols} customer={m.user_id ? customerMap.get(m.user_id) : undefined} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {exportOpen && (
        <ExportModal
          members={filtered}
          visibleCols={visibleCols}
          customerMap={customerMap}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}

// ── PillFilter ────────────────────────────────────────────────────────────────

function PillFilter({
  label, active, open, onToggle, onClose, children,
}: {
  label: string; active: boolean; open: boolean;
  onToggle: () => void; onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
          active || open
            ? "border border-brand-400 bg-brand-50 text-brand-700"
            : "border border-dashed border-gray-300 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50"
        }`}
      >
        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center shrink-0">
          {active ? <Check className="w-2 h-2" /> : <Plus className="w-2 h-2" />}
        </span>
        {label}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-30 min-w-[180px] overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
}

function OptionList<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs transition-colors ${
            opt.value === value
              ? "bg-brand-50 text-brand-700 font-medium"
              : "text-gray-700 hover:bg-gray-50"
          }`}
        >
          {opt.value === value
            ? <Check className="w-3 h-3 shrink-0" />
            : <span className="w-3 h-3 shrink-0" />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Export modal ──────────────────────────────────────────────────────────────

function ExportModal({
  members, visibleCols, customerMap, onClose,
}: {
  members: BusinessMember[];
  visibleCols: Set<ColKey>;
  customerMap: Map<string, BusinessCustomer>;
  onClose: () => void;
}) {
  const [timezone, setTimezone] = useState<"local" | "utc">("local");
  const [range, setRange]       = useState<ExportRange>("all");
  const [colsMode, setColsMode] = useState<"all" | "custom">("all");
  const [customCols, setCustomCols] = useState<Set<ColKey>>(new Set(visibleCols));

  function toggleCustomCol(col: ColKey) {
    setCustomCols((prev) => {
      const next = new Set(prev);
      next.has(col) ? next.delete(col) : next.add(col);
      return next;
    });
  }

  function handleExport() {
    const rows = filterByExportRange(members, range);
    const cols = colsMode === "all" ? [...ALL_COLS] : ALL_COLS.filter((c) => customCols.has(c));
    const header = ["Usuario", ...cols.map((c) => COL_LABELS[c])];
    const csvLines = [
      header.join(","),
      ...rows.map((m) => {
        const c = m.user_id ? customerMap.get(m.user_id) : undefined;
        return [
          `"${(m.user_name ?? "Sin nombre").replace(/"/g, '""')}"`,
          ...cols.map((col) => `"${getCellValue(col, m, c).replace(/"/g, '""')}"`),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob(["﻿" + csvLines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "usuarios-mundo-academy.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm pointer-events-auto overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Exportar usuarios</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Timezone */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Huso horario</p>
              <div className="flex gap-2">
                {([["local", "Zona horaria local"], ["utc", "UTC"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setTimezone(v)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      timezone === v ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rango de fechas</p>
              <div className="space-y-0.5">
                {EXPORT_RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setRange(value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      range === value ? "bg-brand-50 text-brand-700 font-medium" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                      range === value ? "border-brand-500 bg-brand-500" : "border-gray-300"
                    }`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Columns */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Columnas</p>
              <div className="flex gap-2 mb-3">
                {([["all", "Todas"], ["custom", "Personalizado"]] as const).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setColsMode(v)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      colsMode === v ? "border-brand-400 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {colsMode === "custom" && (
                <div className="space-y-0.5">
                  {ALL_COLS.map((col) => (
                    <button
                      key={col}
                      onClick={() => toggleCustomCol(col)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {customCols.has(col)
                        ? <Check className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                        : <span className="w-3.5 h-3.5 border border-gray-300 rounded shrink-0" />}
                      {COL_LABELS[col]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Membresías tab ────────────────────────────────────────────────────────────

function ClientesTab({
  customers, summary,
}: {
  customers: BusinessCustomer[];
  summary: CustomerSummary;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState<CustomerSort>("revenue");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [selected, setSelected] = useState<BusinessCustomer | null>(null);
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const filtered = customers
    .filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name?.toLowerCase().includes(q) && !c.email?.toLowerCase().includes(q)) return false;
      }
      if (filter === "repeat" && !c.isRepeatBuyer) return false;
      if (filter === "new" && new Date(c.firstPurchase).getTime() < thirtyDaysAgo) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "revenue") return b.totalSpent - a.totalSpent;
      if (sort === "orders")  return b.totalOrders - a.totalOrders;
      return new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime();
    });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard icon={Users}      label="Total clientes" value={String(summary.totalCustomers)}    sub="compradores únicos"   />
        <KpiCard icon={DollarSign} label="Ingresos"       value={fmtCurrency(summary.totalRevenue)} sub="suma de compras"      accent />
        <KpiCard icon={TrendingUp} label="LTV promedio"   value={fmtCurrency(summary.avgLtv)}       sub="por cliente"          />
        <KpiCard icon={Repeat}     label="Repetidos"      value={String(summary.repeatBuyers)}      sub="compraron 2+ veces"   />
        <KpiCard icon={UserPlus}   label="Nuevos (30d)"   value={String(summary.newLast30d)}        sub="en últimas 4 semanas" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Buscar por nombre o email…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex items-center gap-1">
          {([["all", "Todos"], ["repeat", "Repetidos"], ["new", "Nuevos"]] as [CustomerFilter, string][]).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>{label}</button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as CustomerSort)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="revenue">Mayor gasto</option>
          <option value="recent">Más recientes</option>
          <option value="orders">Más órdenes</option>
        </select>
        <span className="ml-auto text-xs text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Todavía no hay clientes registrados.</p>
            <p className="text-xs text-gray-400">Aparecerán aquí cuando se completen compras.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-2 text-center">
            <Search className="w-6 h-6 text-gray-300" />
            <p className="text-sm text-gray-500">Sin resultados para esta búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-gray-50">
                <tr>
                  {["Cliente", "Productos activos", "Órdenes", "Gasto total", "Primera compra", "Última compra", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <CustomerRow key={c.user_id} customer={c} onView={() => setSelected(c)} fmtCurrency={fmtCurrency} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && <CustomerDrawer customer={selected} onClose={() => setSelected(null)} fmtCurrency={fmtCurrency} />}
    </div>
  );
}

// ── Customer row ──────────────────────────────────────────────────────────────

function CustomerRow({ customer: c, onView, fmtCurrency }: {
  customer: BusinessCustomer; onView: () => void; fmtCurrency: (n: number) => string;
}) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isNew = new Date(c.firstPurchase).getTime() >= thirtyDaysAgo;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onView}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-600">{(c.name ?? c.email ?? "?")[0].toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[130px]">{c.name ?? "Sin nombre"}</p>
              {c.isRepeatBuyer && <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs">★</span>}
              {isNew && <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 text-xs">Nuevo</span>}
            </div>
            <p className="text-xs text-gray-400 truncate max-w-[130px]">{c.email ?? "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {c.activeProductNames.length === 0 ? <span className="text-xs text-gray-300">—</span> : (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {c.activeProductNames.slice(0, 2).map((n) => (
              <span key={n} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs truncate max-w-[80px]">{n}</span>
            ))}
            {c.activeProductNames.length > 2 && <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">+{c.activeProductNames.length - 2}</span>}
          </div>
        )}
      </td>
      <td className="px-5 py-3.5"><span className="text-sm font-medium text-gray-900">{c.totalOrders}</span></td>
      <td className="px-5 py-3.5"><span className="text-sm font-semibold text-gray-900">{fmtCurrency(c.totalSpent)}</span></td>
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(c.firstPurchase)}</td>
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(c.lastPurchase)}</td>
      <td className="px-5 py-3.5">
        <button onClick={(e) => { e.stopPropagation(); onView(); }}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors" title="Ver detalle">
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Customer drawer ───────────────────────────────────────────────────────────

function CustomerDrawer({ customer: c, onClose, fmtCurrency }: {
  customer: BusinessCustomer; onClose: () => void; fmtCurrency: (n: number) => string;
}) {
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isNew = new Date(c.firstPurchase).getTime() >= thirtyDaysAgo;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-base font-bold text-brand-600">{(c.name ?? c.email ?? "?")[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{c.name ?? "Sin nombre"}</p>
              <p className="text-xs text-gray-400">{c.email ?? "—"}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              [fmtCurrency(c.totalSpent), "Gasto total"],
              [String(c.totalOrders),     "Órdenes"],
              [String(c.activeProductsCount), "Activos"],
            ].map(([val, label]) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {c.isRepeatBuyer && <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">★ Comprador repetido</span>}
            {isNew && <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">Nuevo cliente</span>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial</p>
            <div className="space-y-2">
              {[["Primera compra", c.firstPurchase], ["Última compra", c.lastPurchase]].map(([label, date]) => (
                <div key={label} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{label}</span>
                  <span className="text-gray-900 font-medium">{fmtDate(date)}</span>
                </div>
              ))}
            </div>
          </div>
          {c.activeProductNames.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Productos activos</p>
              <div className="space-y-2">
                {c.activeProductNames.map((name) => (
                  <div key={name} className="flex items-center gap-2.5 px-3 py-2 bg-gray-50 rounded-lg">
                    <Package className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                    <p className="text-xs text-gray-700">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {c.stripeSessionIds.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Referencias Stripe</p>
              <div className="space-y-1.5">
                {c.stripeSessionIds.map((id) => (
                  <div key={id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <CreditCard className="w-3 h-3 text-gray-400 shrink-0" />
                    <p className="text-xs font-mono text-gray-500 truncate">{id}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent: "blue" | "indigo" | "green" | "yellow";
}) {
  const textColors = { blue: "text-blue-600", indigo: "text-brand-600", green: "text-green-600", yellow: "text-yellow-700" };
  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${textColors[accent]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <Icon className={`w-4 h-4 ${accent ? "text-brand-500" : "text-gray-300"}`} />
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent ? "text-brand-600" : "text-gray-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function MemberRow({ member: m, visibleCols, customer: c }: {
  member: BusinessMember; visibleCols: Set<ColKey>; customer?: BusinessCustomer;
}) {
  const joined = new Date(m.joined_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const lastAccess = c?.lastPurchase
    ? new Date(c.lastPurchase).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const statusStyle = STATUS_STYLES[m.status] ?? "bg-gray-100 text-gray-500";
  const statusLabel = STATUS_LABELS[m.status] ?? m.status;
  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  function mockAction(label: string, e: React.MouseEvent) {
    e.stopPropagation();
    alert(`${label} — Próximamente disponible`);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-gray-500">
              {(m.user_name ?? m.user_email ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate max-w-[130px]">{m.user_name ?? "Sin nombre"}</p>
        </div>
      </td>
      {visibleCols.has("email")        && <td className="px-5 py-3 text-xs text-gray-500">{m.user_email ?? "—"}</td>}
      {visibleCols.has("estado")       && (
        <td className="px-5 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
        </td>
      )}
      {visibleCols.has("pais")         && <td className="px-5 py-3 text-xs text-gray-400">—</td>}
      {visibleCols.has("ciudad")       && <td className="px-5 py-3 text-xs text-gray-400">—</td>}
      {visibleCols.has("gasto")        && (
        <td className="px-5 py-3 text-xs text-gray-700 font-medium">
          {c ? fmtCurrency(c.totalSpent) : <span className="text-gray-300">—</span>}
        </td>
      )}
      {visibleCols.has("seUnio")       && <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{joined}</td>}
      {visibleCols.has("ultimoAcceso") && <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{lastAccess}</td>}
      {visibleCols.has("pedidos")      && (
        <td className="px-5 py-3 text-xs text-gray-700">
          {c ? String(c.totalOrders) : <span className="text-gray-300">—</span>}
        </td>
      )}
      {visibleCols.has("contacto")     && (
        <td className="px-5 py-3">
          {m.user_email ? (
            <div className="flex items-center gap-1">
              <a href={`mailto:${m.user_email}`} onClick={(e) => e.stopPropagation()}
                className="p-1 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors" title={m.user_email}>
                <Mail className="w-3.5 h-3.5" />
              </a>
              <button onClick={(e) => mockAction("Mensaje", e)}
                className="p-1 rounded text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors" title="Mensaje">
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : <span className="text-gray-300 text-xs">—</span>}
        </td>
      )}
      <td className="px-5 py-3">
        <div className="flex items-center gap-1">
          <ActionButton icon={Eye}           label="Ver detalle"     onClick={(e) => mockAction("Ver detalle", e)} />
          <ActionButton icon={CalendarClock} label="Extender acceso" onClick={(e) => mockAction("Extender acceso", e)} />
          <ActionButton icon={Ban}           label="Revocar acceso"  onClick={(e) => mockAction("Revocar acceso", e)} danger />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({ icon: Icon, label, onClick, danger = false }: {
  icon: React.ElementType; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} title={label}
      className={`p-1.5 rounded-lg transition-colors ${
        danger ? "text-gray-300 hover:bg-red-50 hover:text-red-500" : "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
      }`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
