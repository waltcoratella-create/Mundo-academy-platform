"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { Loader2, Gift, CreditCard, RefreshCw, UserCheck, Globe, Lock } from "lucide-react";
import { updateProductAccess } from "@/app/actions/products";

const ACCESS_TYPES = [
  {
    value: "gratis",
    label: "Gratis",
    description: "Cualquier persona puede acceder sin pagar.",
    icon: Gift,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-500",
  },
  {
    value: "pago_unico",
    label: "Pago único",
    description: "Acceso de por vida con un solo pago.",
    icon: CreditCard,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-500",
  },
  {
    value: "suscripcion",
    label: "Suscripción",
    description: "Acceso recurrente con cobro mensual o anual.",
    icon: RefreshCw,
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-500",
  },
  {
    value: "manual",
    label: "Invitación",
    description: "Tú controlas quién puede acceder manualmente.",
    icon: UserCheck,
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-500",
  },
] as const;

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

export function AccessForm({
  businessId,
  productId,
  initialAccessType,
  initialIsPublic,
}: {
  businessId: string;
  productId: string;
  initialAccessType: string;
  initialIsPublic: boolean;
}) {
  const [state, formAction] = useFormState(updateProductAccess, { error: null });
  const [accessType, setAccessType] = useState(initialAccessType || "manual");
  const [isPublic, setIsPublic] = useState(initialIsPublic);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="productId"  value={productId} />
      <input type="hidden" name="access_type" value={accessType} />
      <input type="hidden" name="is_public"   value={String(isPublic)} />

      {state.error && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Access type cards */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-semibold text-gray-900 mb-1">Método de acceso</p>
        <p className="text-xs text-gray-400 mb-4">
          Define cómo los usuarios obtienen acceso a este producto.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACCESS_TYPES.map(({ value, label, description, icon: Icon, color, bg, border }) => {
            const selected = accessType === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setAccessType(value)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selected
                    ? `${border} bg-white shadow-sm`
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${selected ? "text-gray-900" : "text-gray-700"}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{description}</p>
                  </div>
                  {selected && (
                    <div className={`w-4 h-4 rounded-full border-2 ${border} flex items-center justify-center shrink-0 mt-0.5`}>
                      <div className={`w-2 h-2 rounded-full ${bg.replace("bg-", "bg-").replace("-50", "-500").replace("-100", "-500")}`} />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visibility toggle */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPublic ? "bg-green-50" : "bg-gray-100"}`}>
              {isPublic
                ? <Globe className="w-4 h-4 text-green-600" />
                : <Lock className="w-4 h-4 text-gray-500" />
              }
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Visibilidad pública</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isPublic
                  ? "El producto aparece en el directorio y es descubrible."
                  : "El producto está oculto — solo acceden quienes tengan el enlace."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              isPublic ? "bg-green-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ${
                isPublic ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
