"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Mail,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  Send,
  FileEdit,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ── Unified view type (consumed by both purchase receipts + manual invoices) ──

export interface InvoiceView {
  kind: "purchase" | "manual";
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  buyer_email: string | null;
  buyer_name: string | null;
  product_id: string | null;
  product_name: string | null;
  // Purchase-specific
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  // Manual-specific
  due_date: string | null;
  description: string | null;
}

interface Props {
  invoice: InvoiceView;
  businessId: string;
  businessName: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; style: string; icon: React.ElementType }
> = {
  succeeded: {
    label: "Pagado",
    style: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pendiente",
    style: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  failed: {
    label: "Fallido",
    style: "bg-red-100 text-red-600 border-red-200",
    icon: XCircle,
  },
  sent: {
    label: "Enviada",
    style: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Send,
  },
  draft: {
    label: "Borrador",
    style: "bg-gray-100 text-gray-600 border-gray-200",
    icon: FileEdit,
  },
};

export function InvoiceDetailClient({ invoice: inv, businessId, businessName }: Props) {
  const statusCfg =
    STATUS_CONFIG[inv.status] ?? {
      label: inv.status,
      style: "bg-gray-100 text-gray-600 border-gray-200",
      icon: Receipt,
    };
  const StatusIcon = statusCfg.icon;

  const date = new Date(inv.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortId = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`;

  const isManual = inv.kind === "manual";
  const typeLabel = isManual ? "Factura manual" : "Recibo de pago interno";

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Back + actions bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link
          href={`/mis-negocios/${businessId}/facturas`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Facturas
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert("Descargar PDF: Próximamente")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar PDF
          </button>
          <button
            onClick={() => alert("Enviar por email: Próximamente")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Enviar
          </button>
        </div>
      </div>

      {/* Receipt card */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header stripe */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">{businessName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{typeLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400 mb-0.5">Número</p>
            <p className="text-lg font-mono font-bold text-gray-900 tracking-wide">
              {inv.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Status + date row */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.style}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {statusCfg.label}
          </span>
          <p className="text-xs text-gray-500">{date}</p>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-6">
          {/* Buyer + Product grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoBlock label="Cliente">
              {inv.buyer_name && (
                <p className="text-sm font-semibold text-gray-900">{inv.buyer_name}</p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {inv.buyer_email ?? "—"}
              </p>
            </InfoBlock>
            <InfoBlock label="Producto">
              <p className="text-sm font-semibold text-gray-900">
                {inv.product_name ?? "—"}
              </p>
              {inv.product_id && (
                <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
                  {inv.product_id}
                </p>
              )}
            </InfoBlock>
          </div>

          {/* Description (manual only) */}
          {inv.description && (
            <InfoBlock label="Descripción">
              <p className="text-sm text-gray-700 leading-relaxed">{inv.description}</p>
            </InfoBlock>
          )}

          {/* Due date (manual only) */}
          {inv.due_date && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              Vence:{" "}
              {new Date(inv.due_date).toLocaleDateString("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          )}

          {/* Line items */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Descripción
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      {inv.description || inv.product_name || "Producto / Servicio"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">1 unidad</p>
                  </td>
                  <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(inv.amount, inv.currency)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t border-gray-200 bg-gray-50">
                <tr>
                  <td className="px-5 py-3 text-sm font-semibold text-gray-700">
                    Total
                  </td>
                  <td className="px-5 py-3 text-right text-base font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(inv.amount, inv.currency)}{" "}
                    <span className="text-xs font-medium text-gray-400">
                      {inv.currency}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Stripe references (purchase only) */}
          {(inv.stripe_session_id || inv.stripe_payment_intent_id) && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Referencias de pago
              </p>
              <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1.5 border border-gray-100">
                {inv.stripe_session_id && (
                  <ReferenceRow
                    label="Sesión"
                    value={shortId(inv.stripe_session_id)}
                    full={inv.stripe_session_id}
                  />
                )}
                {inv.stripe_payment_intent_id && (
                  <ReferenceRow
                    label="Payment Intent"
                    value={shortId(inv.stripe_payment_intent_id)}
                    full={inv.stripe_payment_intent_id}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 text-center leading-relaxed">
            {isManual
              ? `Factura emitida por ${businessName}. No constituye una factura fiscal.`
              : `Este es un recibo interno de ${businessName}. No constituye una factura fiscal.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function ReferenceRow({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-mono text-gray-600 cursor-default" title={full}>
        {value}
      </span>
    </div>
  );
}
