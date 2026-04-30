import Link from "next/link";
import { Lock, Zap, Check } from "lucide-react";

const FEATURES = [
  "Dashboard de negocio en tiempo real",
  "Venture AI — asesor ilimitado powered by Claude",
  "Panel de pagos y transacciones",
  "Analíticas avanzadas de miembros",
];

export function UpgradeCTA() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center">
          <Lock className="w-6 h-6 text-brand-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Función Pro</h2>
          <p className="text-gray-500 text-sm">
            Activa tu plan para desbloquear esta sección y todo el ecosistema.
          </p>
        </div>

        <ul className="text-left space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
              <Check className="w-4 h-4 text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <Link
          href="/upgrade"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Zap className="w-4 h-4" />
          Desbloquear Pro — $49/mes
        </Link>
      </div>
    </div>
  );
}
