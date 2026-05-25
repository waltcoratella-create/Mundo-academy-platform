"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  AlertCircle,
  Building2,
  User,
  Package,
  FileText,
  DollarSign,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { createManualInvoice } from "@/app/actions/invoices";
import type { Product } from "@/lib/supabase/queries";

interface Props {
  businessId: string;
  businessName: string;
  products: Product[];
}

const CURRENCIES = ["USD", "MXN", "EUR", "COP", "ARS", "CLP", "PEN"];

export function CreateInvoiceClient({ businessId, businessName, products }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  // Form state for live preview
  const [email, setEmail] = useState("");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [dueDate, setDueDate] = useState("");

  const selectedProduct = products.find((p) => p.id === productId);
  const amountNum = parseFloat(amount) || 0;

  const previewDate = new Date().toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await createManualInvoice(businessId, formData);
      if (result.error) {
        setServerError(result.error);
        return;
      }
      router.push(`/mis-negocios/${businessId}/facturas/${result.id}`);
    });
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Left panel — form ─────────────────────────────────────── */}
      <div className="w-[420px] shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-y-auto">
        {/* Back link */}
        <div className="px-7 pt-7 pb-4">
          <Link
            href={`/mis-negocios/${businessId}/facturas`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Facturas
          </Link>
        </div>

        {/* Title */}
        <div className="px-7 pb-6">
          <h1 className="text-xl font-bold text-gray-900">Nueva factura</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            La factura se enviará como <span className="font-medium">enviada</span>.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-7 pb-10 space-y-5 flex-1">
          {/* Email */}
          <FormField
            label="Email del cliente"
            icon={User}
            required
          >
            <input
              type="email"
              name="customer_email"
              required
              placeholder="cliente@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-base"
            />
          </FormField>

          {/* Product */}
          <FormField label="Producto (opcional)" icon={Package}>
            <select
              name="product_id"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const prod = products.find((p) => p.id === e.target.value);
                if (prod) {
                  setAmount(String(prod.price));
                  setCurrency(prod.currency || "USD");
                }
              }}
              className="input-base"
            >
              <option value="">Sin producto vinculado</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Description */}
          <FormField label="Descripción" icon={FileText}>
            <textarea
              name="description"
              rows={3}
              placeholder="Descripción del servicio o producto…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-base resize-none"
            />
          </FormField>

          {/* Amount + currency */}
          <FormField label="Importe" icon={DollarSign} required>
            <div className="flex gap-2">
              <input
                type="number"
                name="amount"
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-base flex-1"
              />
              <select
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="input-base w-[90px]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </FormField>

          {/* Due date */}
          <FormField label="Fecha de vencimiento (opcional)" icon={Calendar}>
            <input
              type="date"
              name="due_date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="input-base"
            />
          </FormField>

          {/* Error banner */}
          {serverError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {isPending ? "Enviando…" : "Enviar factura"}
          </button>
        </form>
      </div>

      {/* ── Right panel — live preview ────────────────────────────── */}
      <div className="flex-1 bg-gray-50 flex items-start justify-center overflow-y-auto py-10 px-8">
        <div className="w-full max-w-[580px] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header stripe */}
          <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-gray-900">{businessName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Factura</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-0.5">Número</p>
              <p className="text-lg font-mono font-bold text-gray-900 tracking-wide">
                FAC-{new Date().getFullYear()}-XXXX
              </p>
            </div>
          </div>

          {/* Status row */}
          <div className="px-8 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-700 border-blue-200">
              Enviada
            </span>
            <p className="text-xs text-gray-500">{previewDate}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">
            {/* Buyer + Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <PreviewBlock label="Cliente">
                {email ? (
                  <p className="text-sm text-gray-700">{email}</p>
                ) : (
                  <p className="text-sm text-gray-300 italic">Email del cliente</p>
                )}
              </PreviewBlock>
              <PreviewBlock label="Producto">
                {selectedProduct ? (
                  <p className="text-sm font-semibold text-gray-900">{selectedProduct.name}</p>
                ) : (
                  <p className="text-sm text-gray-300 italic">Sin producto vinculado</p>
                )}
              </PreviewBlock>
            </div>

            {/* Line item table */}
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
                        {description || selectedProduct?.name || (
                          <span className="text-gray-300 italic">Descripción del servicio</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">1 unidad</p>
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {formatCurrency(amountNum, currency)}
                    </td>
                  </tr>
                </tbody>
                <tfoot className="border-t border-gray-200 bg-gray-50">
                  <tr>
                    <td className="px-5 py-3 text-sm font-semibold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right text-base font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(amountNum, currency)}{" "}
                      <span className="text-xs font-medium text-gray-400">{currency}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Due date */}
            {dueDate && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5" />
                Vence:{" "}
                {new Date(dueDate + "T12:00:00").toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Factura emitida por {businessName}. No constituye una factura fiscal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function FormField({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon: React.ElementType;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function PreviewBlock({
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
