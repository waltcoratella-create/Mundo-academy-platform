import { Fish, TrendingUp, DollarSign, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const LISTINGS = [
  {
    id: "1", name: "DentaSoft", sector: "SaaS", country: "🇲🇽 México",
    mrr: 8200, growth: 34, raising: 150000, valuation: 1500000,
    description: "Plataforma de gestión para clínicas dentales. 42 clientes activos.",
    stage: "seed",
  },
  {
    id: "2", name: "EcomLatam", sector: "E-commerce", country: "🇨🇴 Colombia",
    mrr: 42000, growth: 12, raising: 80000, valuation: 800000,
    description: "Marketplace B2B para productos naturales de LATAM. $42k GMV/mes.",
    stage: "pre_seed",
  },
  {
    id: "3", name: "AgentesIA MX", sector: "IA", country: "🇲🇽 México",
    mrr: 5600, growth: 67, raising: 200000, valuation: 2000000,
    description: "Agentes IA para automatizar soporte de e-commerce. 12 clientes enterprise.",
    stage: "seed",
  },
  {
    id: "4", name: "FinEduca", sector: "EdTech", country: "🇦🇷 Argentina",
    mrr: 3200, growth: 28, raising: 60000, valuation: 600000,
    description: "Educación financiera gamificada para millennials. 800 suscriptores.",
    stage: "pre_seed",
  },
];

export default function SharkTankPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Fish className="w-6 h-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900">Shark Tank</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Deal flow de startups hispanas — conecta con founders e inversores
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <TrendingUp className="w-4 h-4" /> Listar mi startup
          </Button>
          <Button>
            <DollarSign className="w-4 h-4" /> Acceso inversor — $299/mes
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-gray-400" />
        {[
          { label: "Sector", options: ["Todos", "SaaS", "E-commerce", "IA", "EdTech"] },
          { label: "País", options: ["LATAM", "México", "Colombia", "Argentina", "España"] },
          { label: "Stage", options: ["Todos", "Pre-seed", "Seed", "Serie A"] },
        ].map(({ label, options }) => (
          <select
            key={label}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Listings */}
      <div className="space-y-4">
        {LISTINGS.map((startup) => (
          <div key={startup.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="font-bold text-gray-900">{startup.name}</h2>
                  <Badge variant="info">{startup.sector}</Badge>
                  <span className="text-sm text-gray-500">{startup.country}</span>
                  <Badge variant={startup.stage === "seed" ? "success" : "warning"}>
                    {startup.stage === "seed" ? "Seed" : "Pre-seed"}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-2">{startup.description}</p>
                <div className="flex gap-6 mt-3">
                  <div>
                    <p className="text-xs text-gray-400">MRR</p>
                    <p className="font-bold text-gray-900">${startup.mrr.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Crecimiento</p>
                    <p className="font-bold text-green-600">+{startup.growth}% MoM</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Buscando</p>
                    <p className="font-bold text-gray-900">${startup.raising.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Valoración</p>
                    <p className="font-bold text-gray-900">
                      ${(startup.valuation / 1000000).toFixed(1)}M
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <Button variant="secondary" size="sm">Ver deck</Button>
                <Button variant="secondary" size="sm">Ver métricas</Button>
                <Button size="sm">Contactar</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
