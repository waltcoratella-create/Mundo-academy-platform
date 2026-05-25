"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  Mail,
  Eye,
  DollarSign,
  CheckCircle2,
  Receipt,
  TrendingUp,
  Search,
  ChevronRight,
  Plus,
  Copy,
  Terminal,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ── Unified display type (merges purchase receipts + manual invoices) ─────────

export interface DisplayInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  buyer_email: string | null;
  buyer_name: string | null;
  product_name: string | null;
  kind: "purchase" | "manual";
}

// ── Constants ──────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "succeeded" | "pending" | "failed" | "sent" | "draft";

const STATUS_LABELS: Record<string, string> = {
  succeeded: "Pagado",
  pending:   "Pendiente",
  failed:    "Fallido",
  sent:      "Enviada",
  draft:     "Borrador",
};

const STATUS_STYLES: Record<string, string> = {
  succeeded: "bg-green-100 text-green-700",
  pending:   "bg-yellow-100 text-yellow-700",
  failed:    "bg-red-100 text-red-600",
  sent:      "bg-blue-100 text-blue-700",
  draft:     "bg-gray-100 text-gray-600",
};

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",       label: "Todos" },
  { key: "succeeded", label: "Pagados" },
  { key: "sent",      label: "Enviadas" },
  { key: "pending",   label: "Pendientes" },
  { key: "failed",    label: "Fallidos" },
  { key: "draft",     label: "Borradores" },
];

// ── KPI summary ───────────────────────────────────────────────────────────────

interface InvoiceSummary {
  total: number;
  paid: number;
  totalAmount: number;
  amount30d: number;
}

function summarize(invoices: DisplayInvoice[]): InvoiceSummary {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let totalAmount = 0;
  let amount30d = 0;
  let paid = 0;

  for (const inv of invoices) {
    if (inv.status === "succeeded") {
      paid++;
      totalAmount += inv.amount;
      if (new Date(inv.created_at).getTime() >= cutoff) amount30d += inv.amount;
    }
  }

  return { total: invoices.length, paid, totalAmount, amount30d };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  invoices: DisplayInvoice[];
  businessId: string;
  businessName: string;
  tableExists: boolean;
  migrationSQL: string;
}

export function InvoicesClient({
  invoices,
  businessId,
  businessName,
  tableExists,
  migrationSQL,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const summary = useMemo(() => summarize(invoices), [invoices]);

  const filtered = useMemo(() => {
    let result =
      statusFilter === "all"
        ? invoices
        : invoices.filter((inv) => inv.status === statusFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          (inv.buyer_email ?? "").toLowerCase().includes(q) ||
          (inv.buyer_name ?? "").toLowerCase().includes(q) ||
          (inv.product_name ?? "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [invoices, statusFilter, search]);

  function copySQL() {
    navigator.clipboard.writeText(migrationSQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {businessName} · Recibos y facturas
          </p>
        </div>
        <Link
          href={`/mis-negocios/${businessId}/facturas/crear`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva factura
        </Link>
      </div>

      {/* Migration banner (only when table doesn't exist) */}
      {!tableExists && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Terminal className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Migración requerida
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                La tabla <code className="font-mono">manual_invoices</code> no
                existe aún. Ejecuta el siguiente SQL en Supabase → SQL Editor.
              </p>
            </div>
          </div>
          <div className="relative">
            <pre className="text-xs font-mono bg-white border border-amber-200 rounded-lg p-4 overflow-x-auto text-gray-700 leading-relaxed">
              {migrationSQL}
            </pre>
            <button
              onClick={copySQL}
              className="absolute top-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          icon={FileText}
          label="Total recibos"
          value={String(summary.total)}
          sub="emitidos"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Recibos pagados"
          value={String(summary.paid)}
          sub="completados"
          accent
        />
        <KpiCard
          icon={DollarSign}
          label="Monto facturado"
          value={formatCurrency(summary.totalAmount)}
          sub="histórico"
        />
        <KpiCard
          icon={TrendingUp}
          label="Últimos 30 días"
          value={formatCurrency(summary.amount30d)}
          sub="período actual"
        />
      </div>

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar recibo, comprador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {filtered.length} recibo{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyState businessId={businessId} />
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-2 text-center">
            <Search className="w-6 h-6 text-gray-300" />
            <p className="text-sm text-gray-500">Sin resultados para esta búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50">
                <tr>
                  {["Recibo", "Tipo", "Comprador", "Producto", "Importe", "Estado", "Fecha", ""].map((h) => (
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
                {filtered.map((inv) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    businessId={businessId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="kpi-card">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold ${accent ? "text-brand-600" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

// ── Table row ─────────────────────────────────────────────────────────────────

function InvoiceRow({
  invoice: inv,
  businessId,
}: {
  invoice: DisplayInvoice;
  businessId: string;
}) {
  const date = new Date(inv.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const statusStyle = STATUS_STYLES[inv.status] ?? "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[inv.status] ?? inv.status;

  return (
    <tr className="hover:bg-gray-50 group">
      {/* Invoice number */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
            <Receipt className="w-3.5 h-3.5 text-brand-500" />
          </div>
          <span className="text-xs font-mono font-semibold text-gray-700">
            {inv.invoiceNumber}
          </span>
        </div>
      </td>

      {/* Kind badge */}
      <td className="px-5 py-3.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            inv.kind === "manual"
              ? "bg-purple-100 text-purple-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {inv.kind === "manual" ? "Manual" : "Venta"}
        </span>
      </td>

      {/* Buyer */}
      <td className="px-5 py-3.5">
        <div className="min-w-0">
          {inv.buyer_name && (
            <p className="text-xs font-medium text-gray-900 truncate max-w-[130px]">
              {inv.buyer_name}
            </p>
          )}
          <p className="text-xs text-gray-400 truncate max-w-[130px]">
            {inv.buyer_email ?? "—"}
          </p>
        </div>
      </td>

      {/* Product */}
      <td className="px-5 py-3.5">
        <span className="text-xs text-gray-600 truncate block max-w-[160px]">
          {inv.product_name ?? "—"}
        </span>
      </td>

      {/* Amount */}
      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
        {formatCurrency(inv.amount, inv.currency)}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
          {statusLabel}
        </span>
      </td>

      {/* Date */}
      <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
        {date}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Link
            href={`/mis-negocios/${businessId}/facturas/${inv.id}`}
            title="Ver recibo"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          <ActionBtn
            title="Descargar PDF"
            onClick={() => alert("Descargar PDF: Próximamente")}
          >
            <Download className="w-3.5 h-3.5" />
          </ActionBtn>
          <ActionBtn
            title="Enviar por email"
            onClick={() => alert("Enviar por email: Próximamente")}
          >
            <Mail className="w-3.5 h-3.5" />
          </ActionBtn>
          <Link
            href={`/mis-negocios/${businessId}/facturas/${inv.id}`}
            className="p-1.5 rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Abrir detalle"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function ActionBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ businessId }: { businessId: string }) {
  return (
    <div className="py-20 flex flex-col items-center gap-6 text-center px-8">
      {/* Illustration */}
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-brand-50 border-2 border-brand-100 flex items-center justify-center">
          <FileText className="w-9 h-9 text-brand-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center shadow-sm">
          <Plus className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Text */}
      <div className="max-w-xs">
        <p className="text-base font-semibold text-gray-800">
          Crea tu primera factura
        </p>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Envía facturas manuales a tus clientes o aquí aparecerán los
          recibos de compras completadas.
        </p>
      </div>

      {/* CTA */}
      <Link
        href={`/mis-negocios/${businessId}/facturas/crear`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Nueva factura
      </Link>
    </div>
  );
}
