"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Loader2, Gift, DollarSign, RefreshCw } from "lucide-react";
import { updateProductPricing } from "@/app/actions/products";

const CURRENCIES = [
  { value: "USD", label: "USD", symbol: "$", name: "Dólar americano" },
  { value: "EUR", label: "EUR", symbol: "€", name: "Euro" },
  { value: "MXN", label: "MXN", symbol: "$", name: "Peso mexicano" },
];

const BILLING_PERIODS = [
  { value: "one_time", label: "Pago único", description: "Se cobra una sola vez." },
  { value: "monthly",  label: "Mensual",    description: "Se cobra cada mes." },
  { value: "annual",   label: "Anual",      description: "Se cobra una vez al año." },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {pending ? "Guardando..." : "Guardar cambios"}
    </button>
  );
}

export function PricingForm({
  businessId,
  productId,
  accessType,
  initialPrice,
  initialCurrency,
  initialBillingPeriod,
}: {
  businessId: string;
  productId: string;
  accessType: string;
  initialPrice: number;
  initialCurrency: string;
  initialBillingPeriod: string;
}) {
  const [state, formAction] = useFormState(updateProductPricing, { error: null });
  const [currency, setCurrency]             = useState(initialCurrency || "USD");
  const [billingPeriod, setBillingPeriod]   = useState(initialBillingPeriod || "one_time");
  const [price, setPrice]                   = useState(
    initialPrice > 0 ? String(initialPrice) : ""
  );

  const isFree       = accessType === "gratis";
  const isSubscription = accessType === "suscripcion";
  const currencySymbol = CURRENCIES.find(c => c.value === currency)?.symbol ?? "$";

  const billingOptions = isSubscription
    ? BILLING_PERIODS.filter(p => p.value !== "one_time")
    : BILLING_PERIODS.filter(p => p.value === "one_time");

  const displayPrice = price
    ? `${currencySymbol}${parseFloat(price).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : isFree ? "Gratis" : "—";

  const selectedBillingLabel = BILLING_PERIODS.find(p => p.value === billingPeriod)?.label ?? "Pago único";
  const selectedCurrencyName = CURRENCIES.find(c => c.value === currency)?.name ?? "Dólar americano";

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="businessId"    value={businessId} />
      <input type="hidden" name="productId"     value={productId} />
      <input type="hidden" name="currency"      value={currency} />
      <input type="hidden" name="billing_period" value={billingPeriod} />

      {state.error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Free access banner */}
      {isFree && (
        <div className="flex items-start gap-3 px-4 py-4 rounded-xl bg-green-50 border border-green-100">
          <Gift className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-800">Producto gratuito</p>
            <p className="text-xs text-green-600 mt-0.5 leading-relaxed">
              Este producto tiene acceso <strong>Gratis</strong>. El precio no aplica.
              Si quieres cobrar por él, cambia el método de acceso en la pestaña{" "}
              <span className="font-semibold">Acceso</span>.
            </p>
          </div>
        </div>
      )}

      {/* Price input */}
      <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-5 ${isFree ? "opacity-50 pointer-events-none select-none" : ""}`}>
        <p className="text-sm font-semibold text-gray-900 mb-1">Precio</p>
        <p className="text-xs text-gray-400 mb-4">
          Define cuánto pagarán los usuarios para acceder a este producto.
        </p>

        <div className="flex gap-3">
          {/* Currency selector */}
          <div className="shrink-0">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Moneda</label>
            <div className="flex gap-1.5">
              {CURRENCIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurrency(value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                    currency === value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount input */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Monto</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium select-none">
                {currencySymbol}
              </span>
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billing period — only shown for non-free */}
      {!isFree && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">Periodicidad de cobro</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            {isSubscription
              ? "Define con qué frecuencia se cobra la suscripción."
              : "Pago único: el usuario paga una vez y accede de por vida."}
          </p>

          <div className={`grid gap-2 ${isSubscription ? "grid-cols-2" : "grid-cols-1"}`}>
            {billingOptions.map(({ value, label, description }) => {
              const selected = billingPeriod === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBillingPeriod(value)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                    selected
                      ? "border-gray-900 bg-white shadow-sm"
                      : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? "text-gray-900" : "text-gray-700"}`}>
                    {label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Visual summary */}
      <div className="bg-gray-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-gray-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Resumen de precios
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Precio</p>
            <p className="text-xl font-bold">{displayPrice}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Moneda</p>
            <p className="text-sm font-semibold">{selectedCurrencyName}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Cobro</p>
            <p className="text-sm font-semibold">{isFree ? "Gratis" : selectedBillingLabel}</p>
          </div>
        </div>
      </div>

      {!isFree && (
        <div className="flex justify-end">
          <SubmitButton />
        </div>
      )}
    </form>
  );
}
