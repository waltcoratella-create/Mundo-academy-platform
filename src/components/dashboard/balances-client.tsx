"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowDown,
  Receipt,
  RefreshCw,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Payment, PaymentSummary } from "@/lib/supabase/queries";

type BalanceTab = "balances" | "actividad" | "retiros" | "recargas";

const TABS: { key: BalanceTab; label: string }[] = [
  { key: "balances",  label: "Balances" },
  { key: "actividad", label: "Toda la actividad" },
  { key: "retiros",   label: "Retiros" },
  { key: "recargas",  label: "Recargas" },
];

interface Props {
  payments: Payment[];
  summary: PaymentSummary;
  businessName: string;
}

export function BalancesClient({ payments, summary, businessName }: Props) {
  const [tab, setTab] = useState<BalanceTab>("balances");

  const availableBalance = summary.totalRevenue;

  const fmtBalance = new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(availableBalance);

  function toast(action: string) {
    alert(`${action}: Próximamente`);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div>
        <p className="text-xs text-gray-400 mb-3 font-medium">{businessName}</p>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Saldo total</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900 tracking-tight font-jakarta">
                {fmtBalance} US$
              </span>
              <span className="text-lg font-semibold text-gray-400">USD</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ActionBtn icon={ArrowDownLeft} label="Depósito" onClick={() => toast("Depósito")} />
            <ActionBtn icon={ArrowUpRight}  label="Retirar"  onClick={() => toast("Retirar")} />
            <ActionBtn icon={ArrowLeftRight} label="Mover"   onClick={() => toast("Mover")} />
            <button
              onClick={() => toast("Más opciones")}
              title="Más opciones"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center border-b border-gray-100">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === key
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tab === "balances"  && <BalancesTab  summary={summary} availableBalance={availableBalance} />}
      {tab === "actividad" && <ActividadTab payments={payments} />}
      {tab === "retiros"   && <RetirosTab />}
      {tab === "recargas"  && <RecargasTab />}
    </div>
  );
}

// ── Shared: action button ─────────────────────────────────────────────────────

function ActionBtn({
  icon: Icon, label, onClick,
}: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

// ── Shared: KPI card ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, accent = false,
}: {
  icon: React.ElementType; label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-brand-600" : "text-gray-900"}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ── Tab: Balances ─────────────────────────────────────────────────────────────

function BalancesTab({
  summary,
  availableBalance,
}: {
  summary: PaymentSummary;
  availableBalance: number;
}) {
  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Ingresos totales"
          value={formatCurrency(summary.totalRevenue)}
          sub="histórico"
        />
        <KpiCard
          icon={TrendingUp}
          label="Ingresos (30 días)"
          value={formatCurrency(summary.revenue30d)}
          sub="últimos 30 días"
          accent
        />
        <KpiCard
          icon={CheckCircle2}
          label="Pagos exitosos"
          value={String(summary.successCount)}
          sub="completados"
        />
        <KpiCard
          icon={Clock}
          label="Pendientes/Fallidos"
          value={String(summary.pendingOrFailedCount)}
          sub="requieren atención"
        />
      </div>

      {/* Blue promo banner */}
      <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-brand-50 border border-brand-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-700">Gasta tu saldo al instante</p>
          <p className="text-xs text-brand-500 mt-0.5">
            Administra ingresos, retiros y movimientos de tu negocio.
          </p>
        </div>
        <button
          onClick={() => alert("Configurar pagos: Próximamente")}
          className="shrink-0 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Configurar pagos
        </button>
      </div>

      {/* Efectivo card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Efectivo</h3>
        </div>

        {availableBalance === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Sin saldo disponible</p>
              <p className="text-xs text-gray-400 mt-1">
                Tus ingresos aparecerán aquí cuando completes ventas.
              </p>
            </div>
          </div>
        ) : (
          <div className="px-5 py-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Disponible</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(availableBalance)}
              </p>
            </div>
            <button
              onClick={() => alert("Retirar: Próximamente")}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Retirar fondos
            </button>
          </div>
        )}
      </div>

      {/* Legal note */}
      <p className="text-xs text-gray-400 leading-relaxed text-center max-w-2xl mx-auto pt-2">
        Mundo Academy no es un banco. Los saldos mostrados son informativos y corresponden
        a transacciones procesadas a través de la plataforma. Los fondos son gestionados
        por proveedores de pago de terceros.
      </p>
    </div>
  );
}

// ── Tab: Toda la actividad ────────────────────────────────────────────────────

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

const TYPE_LABELS: Record<string, string> = {
  succeeded: "Ingreso",
  pending:   "Pendiente",
  failed:    "Fallido",
};

function ActividadTab({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3 text-center">
        <Receipt className="w-8 h-8 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">Sin actividad todavía</p>
        <p className="text-xs text-gray-400">Las transacciones aparecerán aquí.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead className="bg-gray-50">
            <tr>
              {["Fecha", "Tipo", "Producto", "Comprador", "Monto", "Estado"].map((h) => (
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
            {payments.map((p) => (
              <ActivityRow key={p.id} payment={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityRow({ payment: p }: { payment: Payment }) {
  const date = new Date(p.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = new Date(p.created_at).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const statusStyle = STATUS_STYLES[p.status] ?? "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[p.status] ?? p.status;
  const typeLabel   = TYPE_LABELS[p.status]   ?? "Movimiento";

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-3.5">
        <p className="text-xs font-medium text-gray-900 whitespace-nowrap">{date}</p>
        <p className="text-xs text-gray-400">{time}</p>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs font-medium text-gray-700">{typeLabel}</span>
      </td>
      <td className="px-5 py-3.5">
        <span className="text-xs text-gray-600 truncate block max-w-[160px]">
          {p.product_name ?? "—"}
        </span>
      </td>
      <td className="px-5 py-3.5">
        <div className="min-w-0">
          {p.buyer_name && (
            <p className="text-xs font-medium text-gray-900 truncate max-w-[130px]">
              {p.buyer_name}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate max-w-[130px]">
            {p.buyer_email ?? "—"}
          </p>
        </div>
      </td>
      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatCurrency(p.amount, p.currency)}
      </td>
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}
        >
          {statusLabel}
        </span>
      </td>
    </tr>
  );
}

// ── Tab: Retiros ──────────────────────────────────────────────────────────────

function RetirosTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <ArrowUpRight className="w-7 h-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Aún no tienes retiros</p>
        <p className="text-xs text-gray-400 mt-1">
          Aquí aparecerán tus solicitudes de retiro de fondos.
        </p>
      </div>
      <button
        onClick={() => alert("Solicitar retiro: Próximamente")}
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <ArrowDown className="w-4 h-4" />
        Solicitar retiro
      </button>
    </div>
  );
}

// ── Tab: Recargas ─────────────────────────────────────────────────────────────

function RecargasTab() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 py-20 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <RefreshCw className="w-7 h-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700">Aún no tienes recargas</p>
        <p className="text-xs text-gray-400 mt-1">
          Las recargas realizadas aparecerán en esta sección.
        </p>
      </div>
    </div>
  );
}
