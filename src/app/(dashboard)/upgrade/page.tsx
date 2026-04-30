"use client";

import { useState } from "react";
import { Zap, Check, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "Dashboard de negocio en tiempo real",
  "Venture AI — asesor ilimitado powered by Claude",
  "Panel completo de pagos y transacciones",
  "Analíticas avanzadas y cohortes de miembros",
  "Acceso al App Store de herramientas",
  "Soporte prioritario",
];

export default function UpgradePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al iniciar pago");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-3 py-1 rounded-full text-sm font-medium">
          <Zap className="w-3.5 h-3.5" />
          Mundo Academy Pro
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Desbloquea todo</h1>
        <p className="text-gray-500 text-sm">
          Construye, lanza y escala tu negocio con las herramientas de los mejores emprendedores LATAM.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold text-gray-900">$49</span>
          <span className="text-gray-400 mb-2 text-sm">/mes</span>
        </div>

        <ul className="space-y-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-3 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button onClick={handleCheckout} disabled={loading} size="lg" className="w-full">
          <Zap className="w-4 h-4" />
          {loading ? "Redirigiendo a Stripe..." : "Comenzar con Pro — $49/mes"}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          Pago seguro con Stripe · Cancela cuando quieras
        </div>
      </div>
    </div>
  );
}
