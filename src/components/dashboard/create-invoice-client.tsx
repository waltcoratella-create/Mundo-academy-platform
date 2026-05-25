"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  ChevronRight,
  Send,
  AlertCircle,
  Building2,
  Globe,
  CreditCard,
  Download,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { createManualInvoice } from "@/app/actions/invoices";
import type { Product } from "@/lib/supabase/queries";

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviewTab = "email" | "link" | "pdf";
type BillingType = "once" | "recurring";

interface Props {
  businessId: string;
  businessName: string;
  products: Product[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENCIES = ["USD", "MXN", "EUR", "COP", "ARS", "CLP", "PEN"];
const QUICK_AMOUNTS = [50, 100, 250];

const PAYMENT_METHODS: {
  id: string;
  label: string;
  emoji: string;
  available: boolean;
}[] = [
  { id: "apple_pay",        label: "Apple Pay",              emoji: "🍎", available: true  },
  { id: "card",             label: "Tarjeta",                emoji: "💳", available: true  },
  { id: "paypal",           label: "PayPal",                 emoji: "🅿️", available: true  },
  { id: "bank",             label: "Transferencia bancaria", emoji: "🏦", available: true  },
  { id: "crypto",           label: "Crypto",                 emoji: "₿",  available: true  },
  { id: "platform_balance", label: "Platform Balance",       emoji: "⚡", available: true  },
  { id: "oxxo",             label: "OXXO",                   emoji: "🏪", available: false },
  { id: "sepa",             label: "SEPA Debit",             emoji: "🇪🇺", available: false },
];

// ── Main component ────────────────────────────────────────────────────────────

export function CreateInvoiceClient({ businessId, businessName, products }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<PreviewTab>("email");
  const [billingType, setBillingType] = useState<BillingType>("once");

  // Form state (mirrored for live preview)
  const [email, setEmail]           = useState("");
  const [productId, setProductId]   = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount]         = useState("");
  const [currency, setCurrency]     = useState("USD");
  const [dueDate, setDueDate]       = useState("");
  const [scheduleDate, setScheduleDate] = useState("");

  // UI toggles
  const [showSchedule, setShowSchedule]     = useState(false);
  const [showAdvanced, setShowAdvanced]     = useState(false);
  const [localCurrency, setLocalCurrency]   = useState(true);
  const [customPayments, setCustomPayments] = useState(false);
  const [enabledMethods, setEnabledMethods] = useState<Set<string>>(
    new Set(["apple_pay", "card", "paypal", "bank", "crypto", "platform_balance"])
  );

  // Derived values
  const selectedProduct = products.find((p) => p.id === productId);
  const amountNum = parseFloat(amount) || 0;

  const now = new Date();
  const savedAt =
    now.toLocaleDateString("es-MX", {
      day:   "numeric",
      month: "numeric",
      year:  "2-digit",
    }) +
    ", " +
    now.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });

  const invoiceDate = now.toLocaleDateString("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  });
  const dueDisplay = dueDate
    ? new Date(dueDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        day:   "numeric",
        year:  "numeric",
      })
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
        month: "long",
        day:   "numeric",
        year:  "numeric",
      });

  function toggleMethod(id: string) {
    setEnabledMethods((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    const formData = new FormData(e.currentTarget);
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
      {/* ══════════════ LEFT PANEL — FORM ══════════════════════════════ */}
      <div className="w-[480px] shrink-0 bg-white flex flex-col h-full border-r border-gray-200">

        {/* Top bar */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 shrink-0">
          <Link
            href={`/mis-negocios/${businessId}/facturas`}
            className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Link
              href={`/mis-negocios/${businessId}/facturas`}
              className="hover:text-gray-800 transition-colors"
            >
              Facturas
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          </div>
          <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
            Borrador guardado en {savedAt}
          </span>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 divide-y divide-gray-100">

            {/* Cliente */}
            <FormSection label="Cliente">
              <input
                type="email"
                name="customer_email"
                required
                placeholder="customer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
              />
            </FormSection>

            {/* Producto */}
            <FormSection label="Producto">
              <select
                name="product_id"
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) {
                    setAmount(String(p.price));
                    setCurrency(p.currency || "USD");
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
            </FormSection>

            {/* Fecha de vencimiento */}
            <FormSection label="Fecha de vencimiento">
              <input
                type="date"
                name="due_date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input-base"
              />
            </FormSection>

            {/* Programar fecha de envío */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Programar fecha de envío</span>
                <Toggle value={showSchedule} onChange={setShowSchedule} />
              </div>
              {showSchedule && (
                <div className="mt-3">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="input-base"
                  />
                </div>
              )}
            </div>

            {/* Descripción */}
            <FormSection label="Descripción">
              <textarea
                name="description"
                rows={3}
                placeholder="Factura de la llamada de coaching de septiembre"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) setDescription(e.target.value);
                }}
                className="input-base resize-none"
              />
              <p className="text-xs text-gray-400 text-right mt-1">
                {description.length} / 1000
              </p>
            </FormSection>

            {/* Tipo + Importe */}
            <FormSection>
              {/* Una vez / Recurrente */}
              <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4">
                {(["once", "recurring"] as BillingType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setBillingType(t)}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      billingType === t
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {t === "once" ? "Una vez" : "Recurrente"}
                  </button>
                ))}
              </div>

              {/* Amount row */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">
                    $
                  </span>
                  <input
                    type="number"
                    name="amount"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="input-base pl-7"
                  />
                </div>
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

              {/* Quick amounts */}
              <div className="flex gap-2 mt-3">
                {QUICK_AMOUNTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmount(String(q))}
                    className="px-3 py-1 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    ${q}
                  </button>
                ))}
              </div>
            </FormSection>

            {/* Opciones avanzadas */}
            <div className="px-6 py-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                    ⚙
                  </div>
                  <span className="text-sm text-gray-700">Opciones avanzadas.</span>
                </div>
                <Toggle value={showAdvanced} onChange={setShowAdvanced} />
              </div>
              {showAdvanced && (
                <div className="mt-4 space-y-3 pl-1">
                  <ToggleRow label="Hacer preguntas antes de la compra" />
                  <ToggleRow label="Redirigir después del pago" />
                  <ToggleRow label="Transferir cargos de procesamiento al cliente" />
                </div>
              )}
            </div>

            {/* Aceptar pagos en moneda local */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Aceptar pagos en moneda local</span>
                </div>
                <Toggle value={localCurrency} onChange={setLocalCurrency} />
              </div>
            </div>

            {/* Personalizar métodos de pago */}
            <div className="px-6 py-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setCustomPayments(!customPayments)}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">Personalizar métodos de pago</span>
                </div>
                <Toggle value={customPayments} onChange={setCustomPayments} />
              </div>
              {customPayments && (
                <div className="mt-4 space-y-1">
                  {PAYMENT_METHODS.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => m.available && toggleMethod(m.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors ${
                        m.available
                          ? "border-gray-100 hover:bg-gray-50 cursor-pointer"
                          : "border-gray-100 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            enabledMethods.has(m.id)
                              ? "bg-brand-500 border-brand-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {enabledMethods.has(m.id) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm mr-1">{m.emoji}</span>
                        <span className="text-sm text-gray-700">{m.label}</span>
                      </div>
                      {!m.available && (
                        <span className="text-xs text-gray-400">Verifica identidad</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Líneas (UI only) */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Líneas</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Opcional</span>
                  <Toggle value={false} onChange={() => {}} />
                </div>
              </div>
              {amountNum === 0 && (
                <p className="text-xs text-red-500 mt-2">
                  Error con el plan #1 - Debe ingresar un precio para el precio único
                </p>
              )}
            </div>

          </div>

          {/* Error banner */}
          {serverError && (
            <div className="mx-6 mb-2 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* Sticky submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 shrink-0">
            <button
              type="submit"
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isPending ? "Enviando…" : "Enviar factura"}
            </button>
          </div>
        </form>
      </div>

      {/* ══════════════ RIGHT PANEL — PREVIEW ══════════════════════════ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-100">

        {/* Tab bar */}
        <div className="bg-gray-100 border-b border-gray-200 px-8 flex items-end gap-0 shrink-0 pt-5">
          {(
            [
              { key: "email", label: "Vista previa del correo electrónico" },
              { key: "link",  label: "Vista previa del enlace de pago" },
              { key: "pdf",   label: "PDF de factura" },
            ] as { key: PreviewTab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setPreviewTab(t.key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors border border-b-0 -mb-px ${
                previewTab === t.key
                  ? "bg-white text-gray-900 border-gray-200"
                  : "bg-transparent text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-10">
          {previewTab === "email" && (
            <EmailPreview
              businessName={businessName}
              email={email}
              amount={amountNum}
              currency={currency}
              dueDisplay={dueDisplay}
              productName={selectedProduct?.name}
              description={description}
            />
          )}
          {previewTab === "link" && (
            <PaymentLinkPreview
              businessName={businessName}
              amount={amountNum}
              currency={currency}
              productName={selectedProduct?.name}
              description={description}
            />
          )}
          {previewTab === "pdf" && (
            <PDFPreview
              businessName={businessName}
              invoiceDate={invoiceDate}
              dueDisplay={dueDisplay}
              amount={amountNum}
              currency={currency}
              productName={selectedProduct?.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══ PREVIEW: EMAIL ═════════════════════════════════════════════════════════════

function EmailPreview({
  businessName,
  email,
  amount,
  currency,
  dueDisplay,
  productName,
  description,
}: {
  businessName: string;
  email: string;
  amount: number;
  currency: string;
  dueDisplay: string;
  productName?: string;
  description?: string;
}) {
  return (
    <div className="w-full max-w-[520px] bg-white rounded-2xl shadow border border-gray-200 overflow-hidden">
      {/* Email client header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold text-gray-700">{businessName}</span>{" "}
          via tu plataforma
        </p>
        <p className="text-xs font-semibold text-gray-900 mt-0.5">
          Tienes una nueva factura
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          A: {email || "customer@example.com"}
        </p>
      </div>

      {/* Email body */}
      <div className="px-8 py-8 space-y-6">
        {/* Logo + name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-gray-900">{businessName}</span>
        </div>

        {/* Big amount */}
        <div>
          <p className="text-4xl font-bold text-gray-900 tabular-nums">
            {formatCurrency(amount, currency)}
          </p>
          <p className="text-sm text-gray-400 mt-1.5">Vence {dueDisplay}</p>
        </div>

        {/* Download link */}
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Descargar factura
        </button>

        {/* Invoice number */}
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Número de factura</p>
          <p className="text-sm font-mono font-semibold text-gray-700">#00000001</p>
        </div>

        {/* Pay now CTA */}
        <button
          type="button"
          className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Pagar ahora.
        </button>

        {/* Line items */}
        <div className="border-t border-gray-100 pt-5 space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day:   "numeric",
              year:  "numeric",
            })}
          </p>
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">
              {productName || description || "Producto / Servicio"}
            </span>
            <span className="font-medium text-gray-900 tabular-nums">
              {formatCurrency(amount, currency)}
            </span>
          </div>
          <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-2">
            <span className="text-gray-700">Total</span>
            <span className="text-gray-900 tabular-nums">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ PREVIEW: PAYMENT LINK ══════════════════════════════════════════════════════

function PaymentLinkPreview({
  businessName,
  amount,
  currency,
  productName,
  description,
}: {
  businessName: string;
  amount: number;
  currency: string;
  productName?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Phone chassis */}
      <div
        className="relative bg-gray-900 shadow-2xl"
        style={{
          width: 320,
          borderRadius: 44,
          padding: "12px 10px",
        }}
      >
        {/* Notch bar */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-gray-900 z-10"
          style={{ width: 120, height: 28, borderRadius: 20 }}
        />
        {/* Screen */}
        <div
          className="bg-white overflow-hidden"
          style={{ borderRadius: 34, minHeight: 600 }}
        >
          <div className="px-5 pt-12 pb-6 space-y-5">
            {/* Business header */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{businessName}</p>
                {description && (
                  <p className="text-[11px] text-gray-400 leading-tight">{description}</p>
                )}
              </div>
            </div>

            {/* Product + amount */}
            <div>
              <p className="text-xs text-gray-400">
                {productName || "Producto"}
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-0.5 tabular-nums">
                {formatCurrency(amount, currency)}
              </p>
            </div>

            <hr className="border-gray-100" />

            {/* Promo code placeholder */}
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Agregar código promocional
            </button>

            {/* Total */}
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Total adeudado hoy</span>
              <span className="font-semibold text-gray-900 tabular-nums">
                {formatCurrency(amount, currency)}
              </span>
            </div>

            <hr className="border-gray-100" />

            {/* Email input */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">
                Correo electrónico
              </p>
              <div className="border border-gray-200 rounded-lg px-3 py-2.5">
                <p className="text-xs text-gray-300">johnappleseed@gmail.com</p>
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Método de pago
              </p>
              <div className="space-y-1.5">
                {[
                  { label: "Tarjeta",              emoji: "💳", selected: true },
                  { label: "Saldo de plataforma",  emoji: "⚡", selected: false },
                ].map((m) => (
                  <div
                    key={m.label}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs ${
                      m.selected
                        ? "border-brand-400 bg-brand-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        m.selected
                          ? "border-brand-500"
                          : "border-gray-300"
                      }`}
                    >
                      {m.selected && (
                        <div className="w-2 h-2 rounded-full bg-brand-500" />
                      )}
                    </div>
                    <span>{m.emoji}</span>
                    <span className="text-gray-700">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pay button */}
            <button
              type="button"
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-semibold"
            >
              Pagar {formatCurrency(amount, currency)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ PREVIEW: PDF ═══════════════════════════════════════════════════════════════

function PDFPreview({
  businessName,
  invoiceDate,
  dueDisplay,
  amount,
  currency,
  productName,
}: {
  businessName: string;
  invoiceDate: string;
  dueDisplay: string;
  amount: number;
  currency: string;
  productName?: string;
}) {
  const display = (n: number) =>
    n === 0
      ? "$0.00"
      : formatCurrency(n, currency);

  return (
    <div className="w-full max-w-[580px] bg-white rounded-xl shadow border border-gray-200 overflow-hidden">

      {/* PDF header */}
      <div className="px-10 py-8 border-b border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {businessName}
            </span>
          </div>
        </div>
        <div className="flex gap-10 text-xs">
          <div>
            <p className="text-gray-400 mb-0.5">Invoice number</p>
            <p className="font-mono font-semibold text-gray-800">00000001</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Date of issue</p>
            <p className="font-medium text-gray-800">{invoiceDate}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Date due</p>
            <p className="font-medium text-gray-800">{dueDisplay}</p>
          </div>
        </div>
      </div>

      {/* Bill from / to */}
      <div className="px-10 py-5 border-b border-gray-100 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold text-gray-900">{businessName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">Bill to</p>
        </div>
      </div>

      {/* Line items */}
      <div className="px-10 py-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="pb-2 text-left text-xs font-medium text-gray-500">
                Product
              </th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-50">
              <td className="py-3 text-sm text-gray-700">
                {productName || "Producto / Servicio"}
              </td>
              <td className="py-3 text-right text-sm text-gray-700 tabular-nums">
                {display(amount)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 text-xs text-gray-400">Subtotal</td>
              <td className="pt-3 text-right text-xs text-gray-400 tabular-nums">
                {display(amount)}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="pt-2 text-sm font-bold text-gray-900">
                Amount due
              </td>
              <td className="pt-2 text-right text-sm font-bold text-gray-900 tabular-nums">
                {display(amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legal footer */}
      <div className="px-10 py-4 bg-gray-50 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          Invoice has been issued by the seller in the name and on behalf of{" "}
          {businessName} ({businessName.toLowerCase().replace(/\s/g, "_")}).
        </p>
      </div>
    </div>
  );
}

// ══ UI HELPERS ════════════════════════════════════════════════════════════════

function FormSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-5">
      {label && (
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {label}
        </label>
      )}
      {children}
    </div>
  );
}

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange(!value);
      }}
      className={`relative inline-flex shrink-0 rounded-full transition-colors duration-200 ${
        value ? "bg-brand-500" : "bg-gray-200"
      }`}
      style={{ width: 40, height: 22 }}
      aria-checked={value}
      role="switch"
    >
      <span
        className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

function ToggleRow({ label }: { label: string }) {
  const [v, setV] = useState(false);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <Toggle value={v} onChange={setV} />
    </div>
  );
}
