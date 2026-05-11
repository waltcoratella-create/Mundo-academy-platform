"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X, Star, Users, Package } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicProduct } from "@/lib/supabase/queries";

// ─── Deterministic mock metrics ─────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

function fakeRating(id: string): string {
  return (4.5 + (hashStr(id) % 10) / 20).toFixed(1);
}

function fakeMembers(id: string): string {
  const n = 40 + (hashStr(id + "m") % 960);
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}

// ─── Hydration-safe isNew check ──────────────────────────────────────────────

const NOW = Date.now();
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

function isNew(p: PublicProduct): boolean {
  if (!p.created_at) return false;
  return NOW - new Date(p.created_at).getTime() < TWO_WEEKS;
}

// ─── Shared constants ────────────────────────────────────────────────────────

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-blue-700",
  comunidad: "from-purple-500 to-purple-700",
  ebook:     "from-green-500 to-green-700",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-red-500 to-red-700",
  servicio:  "from-slate-500 to-slate-700",
};

const TYPE_LABELS: Record<string, string> = {
  curso:     "Curso",
  comunidad: "Comunidad",
  ebook:     "Ebook",
  mentoria:  "Mentoría",
  evento:    "Evento",
  servicio:  "Servicio",
};

const ACCESS_BADGES: Record<string, { label: string; cls: string }> = {
  free:         { label: "Gratis",      cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  one_time:     { label: "Pago único",  cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  subscription: { label: "Suscripción", cls: "bg-violet-500/20 text-violet-300 border-violet-500/30" },
};

function priceLabel(p: PublicProduct): string {
  if (p.access_type === "free") return "Gratis";
  const fmt = formatCurrency(p.price, p.currency);
  if (p.access_type === "subscription") {
    return fmt + (p.billing_period === "monthly" ? "/mes" : "/año");
  }
  return fmt;
}

// ─── Skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-64 rounded-2xl overflow-hidden bg-white/5 border border-white/10 animate-pulse">
      <div className="h-28 bg-white/10" />
      <div className="p-4 space-y-2.5">
        <div className="h-3.5 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
        <div className="h-3 bg-white/10 rounded w-full" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
          <div className="h-4 bg-white/10 rounded w-16" />
          <div className="h-4 bg-white/10 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const gradient    = TYPE_GRADIENTS[product.type] ?? "from-gray-500 to-gray-700";
  const typeLabel   = TYPE_LABELS[product.type]    ?? product.type;
  const accessBadge = ACCESS_BADGES[product.access_type];
  const href        = `/produto/${product.slug ?? product.id}`;
  const initial     = product.name.charAt(0).toUpperCase();
  const showNew     = isNew(product);
  const rating      = fakeRating(product.id);
  const members     = fakeMembers(product.id);

  return (
    <Link
      href={href}
      className="group flex-none w-64 rounded-2xl overflow-visible bg-white/[0.06] border border-white/10 hover:border-white/25 hover:bg-white/[0.09] transition-all duration-200 flex flex-col"
    >
      {/* Banner */}
      <div className={`h-28 bg-gradient-to-br ${gradient} relative rounded-t-2xl overflow-visible shrink-0`}>
        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-10 rounded-t-2xl"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          {showNew ? (
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/30 text-white backdrop-blur-sm">
              Nuevo
            </span>
          ) : <span />}
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        {/* Overlapping avatar */}
        <div className="absolute -bottom-5 left-4 w-10 h-10 rounded-xl bg-white shadow-lg border-2 border-white/10 flex items-center justify-center z-10">
          <span className="text-sm font-bold text-gray-800 select-none">{initial}</span>
        </div>
      </div>

      {/* Body */}
      <div className="pt-7 px-4 pb-4 flex-1 flex flex-col gap-1.5">
        {/* Name + access badge */}
        <div className="flex items-start justify-between gap-2 min-h-0">
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
            {product.name}
          </h3>
          {accessBadge && (
            <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${accessBadge.cls}`}>
              {accessBadge.label}
            </span>
          )}
        </div>

        {/* Creator */}
        <p className="text-xs text-slate-400">{product.business_name}</p>

        {/* Description */}
        {product.description ? (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{product.description}</p>
        ) : (
          <p className="text-xs text-slate-600 italic">Sin descripción</p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
          <span className={`text-sm font-bold ${product.access_type === "free" ? "text-emerald-400" : "text-white"}`}>
            {priceLabel(product)}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Star className="w-3 h-3 fill-yellow-400 stroke-yellow-400" />
              {rating}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
              <Users className="w-3 h-3" />
              {members}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Carousel section ─────────────────────────────────────────────────────────

interface SectionConfig {
  id: string;
  emoji: string;
  title: string;
  subtitle?: string;
  filter: (p: PublicProduct) => boolean;
  maxItems: number;
}

function CarouselSection({
  config,
  products,
}: {
  config: SectionConfig;
  products: PublicProduct[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = useCallback((dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });
  }, []);

  const items = useMemo(
    () => products.filter(config.filter).slice(0, config.maxItems),
    [products, config]
  );

  const isEmpty = items.length === 0;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-6 sm:px-8">
        <div>
          <h2 className="text-base font-bold text-white">
            {config.emoji} {config.title}
          </h2>
          {config.subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">{config.subtitle}</p>
          )}
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors"
              aria-label="Scroll izquierda"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-colors"
              aria-label="Scroll derecha"
            >
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Carousel track */}
      <div
        ref={ref}
        className="flex gap-4 overflow-x-auto px-6 sm:px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {isEmpty ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ scrollSnapAlign: "start" }}>
                <SkeletonCard />
              </div>
            ))}
          </>
        ) : (
          items.map((p) => (
            <div key={p.id} style={{ scrollSnapAlign: "start" }}>
              <ProductCard product={p} />
            </div>
          ))
        )}
      </div>

      {/* Próximamente label for empty sections */}
      {isEmpty && (
        <p className="px-6 sm:px-8 text-[11px] text-slate-500 -mt-1">
          Próximamente · Sé el primero en publicar aquí
        </p>
      )}
    </section>
  );
}

// ─── Search results grid ──────────────────────────────────────────────────────

function SearchResults({ products, query }: { products: PublicProduct[]; query: string }) {
  const q = query.toLowerCase().trim();
  const results = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          p.business_name.toLowerCase().includes(q)
      ),
    [products, q]
  );

  return (
    <div className="px-6 sm:px-8 space-y-4">
      <p className="text-xs text-slate-400">
        {results.length} resultado{results.length !== 1 ? "s" : ""} para &quot;{query}&quot;
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-24 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-300">Sin resultados</p>
            <p className="text-xs text-slate-500 mt-1.5 max-w-xs leading-relaxed">
              Intenta con otro término de búsqueda.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

interface HeroProps {
  query: string;
  setQuery: (v: string) => void;
  totalProducts: number;
}

function Hero({ query, setQuery, totalProducts }: HeroProps) {
  return (
    <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 overflow-hidden">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[400px] rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 sm:px-8 pt-14 pb-12 flex flex-col items-center text-center gap-6">
        {/* Headline */}
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight max-w-2xl">
          Descubre el ecosistema que{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">
            construye negocios.
          </span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-md leading-relaxed">
          Cursos, comunidades, mentorías y recursos creados por emprendedores para emprendedores.
        </p>

        {/* Search bar */}
        <div className="relative w-full max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, creadores, temas..."
            className="w-full pl-11 pr-11 py-3.5 text-sm bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition backdrop-blur-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 sm:gap-10 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{totalProducts}</p>
            <p className="text-xs text-slate-500 mt-0.5">Productos</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-bold text-white">2.4k+</p>
            <p className="text-xs text-slate-500 mt-0.5">Miembros</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div>
            <p className="text-2xl font-bold text-white">180+</p>
            <p className="text-xs text-slate-500 mt-0.5">Creadores</p>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div className="hidden sm:block">
            <p className="text-2xl font-bold text-white">4.8</p>
            <p className="text-xs text-slate-500 mt-0.5">Rating medio</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sections config ──────────────────────────────────────────────────────────

const SECTIONS_CONFIG: SectionConfig[] = [
  {
    id: "trending",
    emoji: "🔥",
    title: "Tendencias",
    subtitle: "Los más populares ahora mismo",
    filter: () => true,
    maxItems: 8,
  },
  {
    id: "new",
    emoji: "✨",
    title: "Nuevos lanzamientos",
    subtitle: "Publicados en las últimas 2 semanas",
    filter: isNew,
    maxItems: 6,
  },
  {
    id: "free",
    emoji: "🎁",
    title: "Gratis",
    subtitle: "Empieza sin gastar un peso",
    filter: (p) => p.access_type === "free",
    maxItems: 6,
  },
  {
    id: "cursos",
    emoji: "🎓",
    title: "Cursos",
    subtitle: "Aprende a tu ritmo",
    filter: (p) => p.type === "curso",
    maxItems: 6,
  },
  {
    id: "comunidades",
    emoji: "👥",
    title: "Comunidades",
    subtitle: "Conecta con personas afines",
    filter: (p) => p.type === "comunidad",
    maxItems: 6,
  },
  {
    id: "mentoria",
    emoji: "⚡",
    title: "Mentorías & Servicios",
    subtitle: "Acelera con expertos",
    filter: (p) => p.type === "mentoria" || p.type === "servicio",
    maxItems: 6,
  },
  {
    id: "recursos",
    emoji: "📚",
    title: "Ebooks & Recursos",
    subtitle: "Descarga y aplica ya",
    filter: (p) => p.type === "ebook",
    maxItems: 6,
  },
];

// ─── Main client component ────────────────────────────────────────────────────

export function DiscoverClient({ products }: { products: PublicProduct[] }) {
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-900 -m-8">
      <Hero query={query} setQuery={setQuery} totalProducts={products.length} />

      <div className="py-10 space-y-12">
        {isSearching ? (
          <SearchResults products={products} query={query} />
        ) : (
          SECTIONS_CONFIG.map((cfg) => (
            <CarouselSection key={cfg.id} config={cfg} products={products} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-8 text-center">
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
