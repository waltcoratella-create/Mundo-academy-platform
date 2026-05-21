"use client";

import { useState } from "react";
import {
  Users, ShoppingBag, Eye, Ban, CalendarClock, Search,
  X, DollarSign, TrendingUp, Repeat, UserPlus, Package, CreditCard,
} from "lucide-react";
import type {
  BusinessMember, MemberSummary,
  BusinessCustomer, CustomerSummary,
} from "@/lib/supabase/queries";

type Tab = "miembros" | "clientes";
type StatusFilter = "all" | "active" | "expired";
type CustomerFilter = "all" | "repeat" | "new";
type CustomerSort = "revenue" | "recent" | "orders";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  expired:  "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-600",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Activo", expired: "Expirado", inactive: "Inactivo",
};
const ORIGIN_STYLES: Record<string, string> = {
  purchase: "bg-brand-50 text-brand-600",
  manual:   "bg-yellow-50 text-yellow-700",
};
const ORIGIN_LABELS: Record<string, string> = {
  purchase: "Compra", manual: "Manual",
};

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">{businessName} · Miembros y clientes</p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {([
          ["miembros", "Miembros", members.length],
          ["clientes", "Clientes", customers.length],
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
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
              {count}
            </span>
          </button>
        ))}
      </div>

      {tab === "miembros" && <MiembrosTab members={members} summary={summary} />}
      {tab === "clientes" && <ClientesTab customers={customers} summary={customerSummary} />}
    </div>
  );
}

// ── Miembros tab ──────────────────────────────────────────────────────────────

function MiembrosTab({
  members, summary,
}: {
  members: BusinessMember[];
  summary: MemberSummary;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [productFilter, setProductFilter] = useState<string>("all");

  const products = Array.from(
    new Map(members.map((m) => [m.product_id, m.product_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = members.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (productFilter !== "all" && m.product_id !== productFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Miembros activos"    value={String(summary.activeCount)}         sub="con acceso activo"      accent="blue" />
        <SummaryCard label="Nuevos (30 días)"    value={String(summary.newLast30d)}           sub="últimas 4 semanas"      accent="indigo" />
        <SummaryCard label="Productos activos"   value={String(summary.productsWithMembers)}  sub="con al menos 1 miembro" accent="green" />
        <SummaryCard
          label="Origen"
          value={`${summary.purchaseCount} / ${summary.manualCount}`}
          sub="compras / manuales"
          accent="yellow"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          {(["all", "active", "expired"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {{ all: "Todos", active: "Activos", expired: "Expirados" }[f]}
            </button>
          ))}
        </div>
        {products.length > 1 && (
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <Users className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {members.length === 0
                ? "Todavía no hay miembros registrados."
                : "No hay miembros con este filtro."}
            </p>
            {members.length === 0 && (
              <p className="text-xs text-gray-400">Aparecerán aquí cuando alguien acceda a tus productos.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50">
                <tr>
                  {["Usuario", "Producto", "Estado", "Origen", "Acceso desde", "Expira", "Acciones"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => <MemberRow key={m.id} member={m} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Clientes tab ──────────────────────────────────────────────────────────────

function ClientesTab({
  customers, summary,
}: {
  customers: BusinessCustomer[];
  summary: CustomerSummary;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CustomerSort>("revenue");
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
      if (sort === "orders") return b.totalOrders - a.totalOrders;
      return new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime();
    });

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency", currency: "USD", maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard icon={Users}     label="Total clientes"  value={String(summary.totalCustomers)} sub="compradores únicos"    />
        <KpiCard icon={DollarSign} label="Ingresos"       value={fmtCurrency(summary.totalRevenue)} sub="suma de compras"   accent />
        <KpiCard icon={TrendingUp} label="LTV promedio"   value={fmtCurrency(summary.avgLtv)}   sub="por cliente"           />
        <KpiCard icon={Repeat}    label="Repetidos"       value={String(summary.repeatBuyers)}   sub="compraron 2+ veces"   />
        <KpiCard icon={UserPlus}  label="Nuevos (30d)"    value={String(summary.newLast30d)}     sub="en últimas 4 semanas" />
      </div>

      {/* Search + filters + sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-1">
          {([["all", "Todos"], ["repeat", "Repetidos"], ["new", "Nuevos"]] as [CustomerFilter, string][]).map(([f, label]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as CustomerSort)}
          className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="revenue">Mayor gasto</option>
          <option value="recent">Más recientes</option>
          <option value="orders">Más órdenes</option>
        </select>

        <span className="ml-auto text-xs text-gray-400">
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
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
                    <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((c) => (
                  <CustomerRow
                    key={c.user_id}
                    customer={c}
                    onView={() => setSelected(c)}
                    fmtCurrency={fmtCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          fmtCurrency={fmtCurrency}
        />
      )}
    </div>
  );
}

// ── Customer row ──────────────────────────────────────────────────────────────

function CustomerRow({
  customer: c, onView, fmtCurrency,
}: {
  customer: BusinessCustomer;
  onView: () => void;
  fmtCurrency: (n: number) => string;
}) {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isNew = new Date(c.firstPurchase).getTime() >= thirtyDaysAgo;
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onView}>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-brand-600">
              {(c.name ?? c.email ?? "?")[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900 truncate max-w-[130px]">
                {c.name ?? "Sin nombre"}
              </p>
              {c.isRepeatBuyer && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs">★</span>
              )}
              {isNew && (
                <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 text-xs">Nuevo</span>
              )}
            </div>
            <p className="text-xs text-gray-400 truncate max-w-[130px]">{c.email ?? "—"}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-3.5">
        {c.activeProductNames.length === 0 ? (
          <span className="text-xs text-gray-300">—</span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {c.activeProductNames.slice(0, 2).map((n) => (
              <span key={n} className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs truncate max-w-[80px]">{n}</span>
            ))}
            {c.activeProductNames.length > 2 && (
              <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">+{c.activeProductNames.length - 2}</span>
            )}
          </div>
        )}
      </td>

      <td className="px-5 py-3.5">
        <span className="text-sm font-medium text-gray-900">{c.totalOrders}</span>
      </td>

      <td className="px-5 py-3.5">
        <span className="text-sm font-semibold text-gray-900">{fmtCurrency(c.totalSpent)}</span>
      </td>

      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(c.firstPurchase)}</td>
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(c.lastPurchase)}</td>

      <td className="px-5 py-3.5">
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Ver detalle"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Customer drawer ───────────────────────────────────────────────────────────

function CustomerDrawer({
  customer: c, onClose, fmtCurrency,
}: {
  customer: BusinessCustomer;
  onClose: () => void;
  fmtCurrency: (n: number) => string;
}) {
  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const isNew = new Date(c.firstPurchase).getTime() >= thirtyDaysAgo;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-base font-bold text-brand-600">
                {(c.name ?? c.email ?? "?")[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{c.name ?? "Sin nombre"}</p>
              <p className="text-xs text-gray-400">{c.email ?? "—"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{fmtCurrency(c.totalSpent)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Gasto total</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{c.totalOrders}</p>
              <p className="text-xs text-gray-400 mt-0.5">Órdenes</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{c.activeProductsCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Activos</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {c.isRepeatBuyer && (
              <span className="px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                ★ Comprador repetido
              </span>
            )}
            {isNew && (
              <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                Nuevo cliente
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Historial</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Primera compra</span>
                <span className="text-gray-900 font-medium">{fmtDate(c.firstPurchase)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Última compra</span>
                <span className="text-gray-900 font-medium">{fmtDate(c.lastPurchase)}</span>
              </div>
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

function SummaryCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string;
  accent: "blue" | "indigo" | "green" | "yellow";
}) {
  const textColors = {
    blue: "text-blue-600", indigo: "text-brand-600",
    green: "text-green-600", yellow: "text-yellow-700",
  };
  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${textColors[accent]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, accent = false,
}: {
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

function MemberRow({ member: m }: { member: BusinessMember }) {
  const joined = new Date(m.joined_at).toLocaleDateString("es-MX", {
    day: "numeric", month: "short", year: "numeric",
  });
  const statusStyle = STATUS_STYLES[m.status] ?? "bg-gray-100 text-gray-500";
  const statusLabel = STATUS_LABELS[m.status] ?? m.status;
  const originStyle = ORIGIN_STYLES[m.origin];
  const originLabel = ORIGIN_LABELS[m.origin];

  function mockAction(label: string) {
    alert(`${label} — Próximamente disponible`);
  }

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-3">
        <div className="min-w-0">
          {m.user_name && (
            <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{m.user_name}</p>
          )}
          <p className="text-xs text-gray-400 truncate max-w-[150px]">{m.user_email ?? "—"}</p>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="text-xs text-gray-700 truncate max-w-[160px]">{m.product_name}</p>
        <p className="text-xs text-gray-400">{m.product_type}</p>
      </td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${originStyle}`}>
          {originLabel}
        </span>
      </td>
      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{joined}</td>
      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
        {m.expires_at
          ? new Date(m.expires_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
          : <span className="text-gray-300">Sin límite</span>}
      </td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1">
          <ActionButton icon={Eye}          label="Ver detalle"      onClick={() => mockAction("Ver detalle")} />
          <ActionButton icon={CalendarClock} label="Extender acceso" onClick={() => mockAction("Extender acceso")} />
          <ActionButton icon={Ban}          label="Revocar acceso"   onClick={() => mockAction("Revocar acceso")} danger />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  icon: Icon, label, onClick, danger = false,
}: {
  icon: React.ElementType; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-lg transition-colors ${
        danger
          ? "text-gray-300 hover:bg-red-50 hover:text-red-500"
          : "text-gray-300 hover:bg-gray-100 hover:text-gray-600"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}
