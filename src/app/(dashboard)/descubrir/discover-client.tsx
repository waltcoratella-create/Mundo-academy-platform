"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Package, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicProduct } from "@/lib/supabase/queries";

// ─── Shared constants ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  curso:     "Curso",
  comunidad: "Comunidad",
  ebook:     "Ebook",
  mentoria:  "Mentoría",
  evento:    "Evento",
  servicio:  "Servicio",
};

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-blue-700",
  comunidad: "from-purple-500 to-purple-700",
  ebook:     "from-green-500 to-green-700",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-red-500 to-red-700",
  servicio:  "from-slate-500 to-slate-700",
};

const ACCESS_BADGES: Record<string, { label: string; cls: string }> = {
  free:         { label: "Gratis",      cls: "bg-green-50 text-green-700 border-green-100" },
  one_time:     { label: "Pago único",  cls: "bg-blue-50 text-blue-700 border-blue-100" },
  subscription: { label: "Suscripción", cls: "bg-purple-50 text-purple-700 border-purple-100" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function priceLabel(p: PublicProduct): string {
  if (p.access_type === "free") return "Gratis";
  const fmt = formatCurrency(p.price, p.currency);
  if (p.access_type === "subscription") {
    return fmt + (p.billing_period === "monthly" ? " / mes" : " / año");
  }
  return fmt;
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const typeLabel  = TYPE_LABELS[product.type]     ?? product.type;
  const gradient   = TYPE_GRADIENTS[product.type]  ?? "from-gray-500 to-gray-700";
  const accessBadge = ACCESS_BADGES[product.access_type];
  const href       = `/produto/${product.slug ?? product.id}`;
  const initial    = product.name.charAt(0).toUpperCase();

  return (
    <Link
      href={href}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      {/* Banner */}
      <div className={`h-32 bg-gradient-to-br ${gradient} relative`}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="absolute inset-0 flex items-end px-4 pb-3 justify-between">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-base font-bold text-white select-none">{initial}</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
            {product.name}
          </h3>
          {accessBadge && (
            <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${accessBadge.cls}`}>
              {accessBadge.label}
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400">{product.business_name}</p>

        {product.description ? (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{product.description}</p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin descripción</p>
        )}

        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">{priceLabel(product)}</span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
            Ver producto
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { value: "",          label: "Todos" },
  { value: "curso",     label: "Cursos" },
  { value: "comunidad", label: "Comunidades" },
  { value: "ebook",     label: "Ebooks" },
  { value: "mentoria",  label: "Mentorías" },
  { value: "evento",    label: "Eventos" },
  { value: "servicio",  label: "Servicios" },
];

export function DiscoverClient({ products }: { products: PublicProduct[] }) {
  const [query, setQuery]   = useState("");
  const [type, setType]     = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return products.filter((p) => {
      const matchesType = !type || p.type === type;
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.business_name.toLowerCase().includes(q);
      return matchesType && matchesQuery;
    });
  }, [products, query, type]);

  return (
    <div className="space-y-6">
      {/* Search + filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, creadores..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                type === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-400">
        {filtered.length} producto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Sin resultados</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
              {query || type
                ? "Intenta con otra búsqueda o categoría."
                : "Todavía no hay productos publicados en la plataforma."}
            </p>
          </div>
          {(query || type) && (
            <button
              onClick={() => { setQuery(""); setType(""); }}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
