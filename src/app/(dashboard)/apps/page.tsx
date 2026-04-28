import { Puzzle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const INSTALLED = ["Comunidad", "Chat", "Cursos", "Eventos", "Pagos", "Email"];

const APPS = [
  { name: "CRM Simple",           price: "$29/mes",  category: "Ventas",      desc: "Gestión de pipeline de ventas y seguimiento de clientes." },
  { name: "Afiliados",            price: "$19/mes",  category: "Marketing",   desc: "Sistema de referidos con tracking de comisiones automático." },
  { name: "Certificados",         price: "$9/mes",   category: "Contenido",   desc: "Certificados personalizables con código QR y validación." },
  { name: "Automatizaciones Pro", price: "$39/mes",  category: "Operaciones", desc: "Flows avanzados, webhooks y lógica condicional compleja." },
  { name: "Analytics Pro",        price: "$29/mes",  category: "Analytics",   desc: "Heatmaps, funnel analysis y cohortes de retención." },
  { name: "Booking / Mentorías",  price: "$19/mes",  category: "Ventas",      desc: "Calendario inteligente con pagos por sesión integrados." },
  { name: "Marketplace Interno",  price: "$49/mes",  category: "Ventas",      desc: "Permite a tus miembros comprar y vender dentro de la comunidad." },
  { name: "Venture AI Pro",       price: "$99/mes",  category: "IA",          desc: "Análisis avanzado con integraciones a Stripe, Meta y Google Ads." },
];

const CATEGORIES = ["Todas", "Ventas", "Marketing", "Contenido", "Operaciones", "Analytics", "IA"];

export default function AppsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2">
          <Puzzle className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold text-gray-900">Tienda de Apps</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">Expande tu negocio con apps especializadas</p>
      </div>

      <div className="flex gap-6">
        {/* Category sidebar */}
        <aside className="w-44 shrink-0 space-y-1">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                i === 0
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat === "Todas" ? "✓ Instaladas" : cat}
            </button>
          ))}
        </aside>

        {/* App grid */}
        <div className="flex-1 space-y-6">
          {/* Installed */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Apps nativas instaladas
            </p>
            <div className="flex flex-wrap gap-2">
              {INSTALLED.map((app) => (
                <div
                  key={app}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium"
                >
                  <Check className="w-3.5 h-3.5" />
                  {app}
                </div>
              ))}
            </div>
          </div>

          {/* Premium apps */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Apps premium
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {APPS.map((app) => (
                <div
                  key={app.name}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{app.name}</h3>
                    <Badge variant="default">{app.category}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{app.desc}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-gray-900 text-sm">{app.price}</span>
                    <Button size="sm">Instalar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
