import { Search, TrendingUp, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  "Todos", "Negocios", "Marketing", "IA", "Finanzas",
  "E-commerce", "Desarrollo Personal", "Startups",
];

const PRODUCTS = [
  {
    id: "1", rank: 1, trending: true,
    name: "Agencia de Social Media en 60 días",
    creator: "@carmenmkt", rating: 4.9, reviews: 234,
    description: "De cero a tu primera agencia con clientes reales.",
    price: "$97/mes", category: "Marketing",
  },
  {
    id: "2", rank: 2, trending: true,
    name: "Dropshipping Avanzado 2026",
    creator: "@ecomlatam", rating: 4.8, reviews: 189,
    description: "El método actualizado para tiendas de 6 cifras.",
    price: "$197", category: "E-commerce",
  },
  {
    id: "3", rank: 3, trending: false,
    name: "IA para Negocios: Automatiza Todo",
    creator: "@iaempresa", rating: 4.9, reviews: 312,
    description: "Usa Claude, GPT y agentes IA para escalar sin contratar.",
    price: "$297", category: "IA",
  },
  {
    id: "4", rank: 4, trending: false,
    name: "Club de Inversión LATAM",
    creator: "@inverlatam", rating: 4.7, reviews: 98,
    description: "Comunidad de inversores ángel hispanohablantes.",
    price: "$149/mes", category: "Finanzas",
  },
  {
    id: "5", rank: 5, trending: true,
    name: "Consultoría de Marketing Digital",
    creator: "@pepemkt",  rating: 4.6, reviews: 67,
    description: "Servicio de agencia con resultados garantizados.",
    price: "$500/mes", category: "Marketing",
  },
  {
    id: "6", rank: 6, trending: false,
    name: "SaaS Builder — De idea a producto",
    creator: "@devsaas", rating: 4.8, reviews: 145,
    description: "Construye y lanza tu SaaS en 8 semanas.",
    price: "$397", category: "Startups",
  },
];

export default function DescubrirPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Descubrir</h1>
          <p className="text-gray-500 text-sm mt-1">Los mejores negocios y cursos del ecosistema</p>
        </div>
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos, creadores..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              i === 0
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Trending section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-gray-900">🔥 Trending esta semana</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.filter((p) => p.trending).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* All products */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-yellow-500" />
          <h2 className="font-semibold text-gray-900">⭐ Más vendidos del mes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRODUCTS.filter((p) => !p.trending).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: typeof PRODUCTS[0] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 bg-gradient-to-br from-brand-500 to-brand-700 relative">
        {product.trending && (
          <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            🔥 TRENDING #{product.rank}
          </span>
        )}
        <Badge className="absolute top-3 right-3" variant="default">
          {product.category}
        </Badge>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-xs text-gray-400">{product.creator}</span>
          <span className="text-gray-300">·</span>
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs text-gray-600">{product.rating} ({product.reviews})</span>
        </div>
        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{product.description}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-bold text-gray-900">{product.price}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm">Ver más</Button>
            <Button size="sm">Unirse</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
