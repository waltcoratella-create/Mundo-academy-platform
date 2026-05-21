"use client";

import { useState } from "react";
import { Users, Eye, Ban, CalendarClock } from "lucide-react";
import type { BusinessMember, MemberSummary } from "@/lib/supabase/queries";

type StatusFilter = "all" | "active" | "expired";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-green-100 text-green-700",
  expired:  "bg-gray-100 text-gray-500",
  inactive: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, string> = {
  active:   "Activo",
  expired:  "Expirado",
  inactive: "Inactivo",
};

const ORIGIN_STYLES: Record<string, string> = {
  purchase: "bg-brand-50 text-brand-600",
  manual:   "bg-yellow-50 text-yellow-700",
};

const ORIGIN_LABELS: Record<string, string> = {
  purchase: "Compra",
  manual:   "Manual",
};

interface Props {
  members: BusinessMember[];
  summary: MemberSummary;
  businessName: string;
}

export function MembersClient({ members, summary, businessName }: Props) {
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
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">{businessName} · Miembros y accesos</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Miembros activos"    value={String(summary.activeCount)}          sub="con acceso activo"     accent="blue" />
        <SummaryCard label="Nuevos (30 días)"    value={String(summary.newLast30d)}            sub="últimas 4 semanas"     accent="indigo" />
        <SummaryCard label="Productos activos"   value={String(summary.productsWithMembers)}   sub="con al menos 1 miembro" accent="green" />
        <SummaryCard
          label="Origen"
          value={`${summary.purchaseCount} / ${summary.manualCount}`}
          sub="compras / manuales"
          accent="yellow"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "active", "expired"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {{ all: "Todos", active: "Activos", expired: "Expirados" }[f]}
            </button>
          ))}
        </div>

        {/* Product filter */}
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

        <span className="ml-auto text-xs text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
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
              <p className="text-xs text-gray-400">
                Aparecerán aquí cuando alguien acceda a tus productos.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-gray-50">
                <tr>
                  {["Usuario", "Producto", "Estado", "Origen", "Acceso desde", "Expira", "Acciones"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((m) => (
                  <MemberRow key={m.id} member={m} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label, value, sub, accent,
}: {
  label: string; value: string; sub: string;
  accent: "blue" | "indigo" | "green" | "yellow";
}) {
  const textColors = {
    blue:   "text-blue-600",
    indigo: "text-brand-600",
    green:  "text-green-600",
    yellow: "text-yellow-700",
  };
  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${textColors[accent]}`}>{value}</p>
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
      {/* Usuario */}
      <td className="px-5 py-3">
        <div className="min-w-0">
          {m.user_name && (
            <p className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{m.user_name}</p>
          )}
          <p className="text-xs text-gray-400 truncate max-w-[150px]">{m.user_email ?? "—"}</p>
        </div>
      </td>

      {/* Producto */}
      <td className="px-5 py-3">
        <p className="text-xs text-gray-700 truncate max-w-[160px]">{m.product_name}</p>
        <p className="text-xs text-gray-400">{m.product_type}</p>
      </td>

      {/* Estado */}
      <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </td>

      {/* Origen */}
      <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${originStyle}`}>
          {originLabel}
        </span>
      </td>

      {/* Acceso desde */}
      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{joined}</td>

      {/* Expira */}
      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
        {m.expires_at
          ? new Date(m.expires_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })
          : <span className="text-gray-300">Sin límite</span>}
      </td>

      {/* Acciones */}
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
