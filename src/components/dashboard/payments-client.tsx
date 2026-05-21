"use client";

import { useState } from "react";
import { Receipt, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Payment, PaymentSummary } from "@/lib/supabase/queries";

type Filter = "all" | "succeeded" | "pending" | "failed";

interface Props {
  payments: Payment[];
  summary: PaymentSummary;
  businessName: string;
}

const STATUS_LABELS: Record<string, string> = {
  succeeded: "Exitoso",
  pending:   "Pendiente",
  failed:    "Fallido",
};

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  failed:    "bg-red-100 text-red-600",
};

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",       label: "Todos" },
  { key: "succeeded", label: "Exitosos" },
  { key: "pending",   label: "Pendientes" },
  { key: "failed",    label: "Fallidos" },
];

export function PaymentsClient({ payments, summary, businessName }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered =
    filter === "all" ? payments : payments.filter((p) => p.status === filter);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pagos</h1>
        <p className="text-gray-500 text-sm mt-1">{businessName} · Historial completo</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          label="Ingresos totales"
          value={formatCurrency(summary.totalRevenue)}
          sub="histórico"
          color="blue"
        />
        <SummaryCard
          label="Ingresos (30 días)"
          value={formatCurrency(summary.revenue30d)}
          sub="últimos 30 días"
          color="indigo"
        />
        <SummaryCard
          label="Pagos exitosos"
          value={String(summary.successCount)}
          sub="completados"
          color="green"
        />
        <SummaryCard
          label="Pendientes / Fallidos"
          value={String(summary.pendingOrFailedCount)}
          sub="requieren atención"
          color="yellow"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
            {key !== "all" && (
              <span className="ml-1.5 text-xs opacity-75">
                ({payments.filter((p) => p.status === key).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} resultados</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <Receipt className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              {payments.length === 0
                ? "Todavía no hay pagos registrados."
                : "No hay pagos con este filtro."}
            </p>
            {payments.length === 0 && (
              <p className="text-xs text-gray-400">
                Aparecerán aquí cuando tus clientes realicen pagos.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="bg-gray-50">
                <tr>
                  {["Comprador", "Producto", "Importe", "Estado", "Fecha", "Referencias"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
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
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "indigo" | "green" | "yellow";
}) {
  const colorMap = {
    blue:   "bg-blue-50 text-blue-600",
    indigo: "bg-brand-50 text-brand-600",
    green:  "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div className="kpi-card">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${colorMap[color].split(" ")[1]}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function PaymentRow({ payment: p }: { payment: Payment }) {
  const date = new Date(p.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusStyle = STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[p.status] ?? p.status;

  const shortId = (id: string | null) =>
    id ? `${id.slice(0, 6)}…${id.slice(-4)}` : null;

  return (
    <tr className="hover:bg-gray-50">
      {/* Comprador */}
      <td className="px-5 py-3">
        <div className="min-w-0">
          {p.buyer_name && (
            <p className="text-xs font-medium text-gray-900 truncate max-w-[140px]">
              {p.buyer_name}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate max-w-[140px]">
            {p.buyer_email ?? "—"}
          </p>
        </div>
      </td>

      {/* Producto */}
      <td className="px-5 py-3 text-xs text-gray-600 max-w-[160px]">
        <span className="truncate block max-w-[160px]">{p.product_name ?? "—"}</span>
      </td>

      {/* Importe */}
      <td className="px-5 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatCurrency(p.amount, p.currency)}
      </td>

      {/* Estado */}
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </td>

      {/* Fecha */}
      <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{date}</td>

      {/* Referencias */}
      <td className="px-5 py-3">
        <div className="space-y-0.5">
          {p.stripe_session_id && (
            <p className="text-xs text-gray-400 font-mono">
              <span className="text-gray-300 mr-1">cs</span>
              {shortId(p.stripe_session_id)}
            </p>
          )}
          {p.stripe_payment_intent_id && (
            <p className="text-xs text-gray-400 font-mono">
              <span className="text-gray-300 mr-1">pi</span>
              {shortId(p.stripe_payment_intent_id)}
            </p>
          )}
          {!p.stripe_session_id && !p.stripe_payment_intent_id && (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
