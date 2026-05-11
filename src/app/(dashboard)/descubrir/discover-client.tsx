"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Search, X, Star, Users, Eye,
  TrendingUp, Sparkles, Gift, BookOpen, Bot, Briefcase,
  Megaphone, Zap, Package, PlusCircle, ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicProduct } from "@/lib/supabase/queries";

// ─── Deterministic mock metrics ───────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function fakeRating(id: string): string {
  return (4.3 + (hashStr(id) % 14) / 20).toFixed(1);
}
function fakeReviews(id: string): number {
  return 4 + (hashStr(id + "r") % 340);
}
function fakeMembers(id: string): number {
  return 30 + (hashStr(id + "m") % 49970);
}
function fakeViews(id: string): number {
  return 500 + (hashStr(id + "v") % 299500);
}
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

// ─── Hydration-safe time helpers ─────────────────────────────────────────────

const NOW = Date.now();
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

function isNew(p: PublicProduct): boolean {
  if (!p.created_at) return false;
  return NOW - new Date(p.created_at).getTime() < TWO_WEEKS_MS;
}

function timeAgo(dateStr: string): string {
  const diff = NOW - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}sem ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Keyword filter ───────────────────────────────────────────────────────────

function kwFilter(...words: string[]) {
  return (p: PublicProduct): boolean => {
    const t = `${p.name} ${p.description ?? ""}`.toLowerCase();
    return words.some((w) => t.includes(w));
  };
}

// ─── Design constants ─────────────────────────────────────────────────────────

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-indigo-600",
  comunidad: "from-violet-500 to-purple-700",
  ebook:     "from-emerald-500 to-teal-600",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-rose-500 to-rose-700",
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

const ACCESS_COLORS: Record<string, string> = {
  free:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  one_time:     "bg-blue-50 text-blue-700 border-blue-200",
  subscription: "bg-violet-50 text-violet-700 border-violet-200",
};

const ACCESS_LABELS: Record<string, string> = {
  free: "Gratis", one_time: "Pago único", subscription: "Suscripción",
};

function priceLabel(p: PublicProduct): string {
  if (p.access_type === "free") return "Gratis";
  const f = formatCurrency(p.price, p.currency);
  return p.access_type === "subscription"
    ? f + (p.billing_period === "monthly" ? "/mes" : "/año")
    : f;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-72 rounded-2xl overflow-hidden bg-white border border-gray-100 animate-pulse">
      <div className="h-44 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-100 shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-2/3" />
        <div className="pt-2 border-t border-gray-100 flex gap-3">
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

// ─── Product card (Whop-style) ────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const gradient   = TYPE_GRADIENTS[product.type] ?? "from-gray-400 to-gray-600";
  const typeLabel  = TYPE_LABELS[product.type]    ?? product.type;
  const accessCls  = ACCESS_COLORS[product.access_type]  ?? "";
  const accessLbl  = ACCESS_LABELS[product.access_type]  ?? product.access_type;
  const href       = `/produto/${product.slug ?? product.id}`;
  const initial    = product.name.charAt(0).toUpperCase();
  const showNew    = isNew(product);
  const rating     = fakeRating(product.id);
  const reviews    = fakeReviews(product.id);
  const members    = fmt(fakeMembers(product.id));
  const views      = fmt(fakeViews(product.id));
  const ago        = product.created_at ? timeAgo(product.created_at) : "";
  const isFree     = product.access_type === "free";

  return (
    <Link
      href={href}
      className="group flex-none w-72 rounded-2xl overflow-hidden bg-white border border-gray-100 hover:border-gray-200 hover:shadow-xl hover:shadow-gray-100 transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Banner */}
      <div className={`h-44 bg-gradient-to-br ${gradient} relative overflow-hidden shrink-0`}>
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Dark scrim bottom */}
        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
        {/* NEW badge */}
        {showNew && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/90 text-orange-600">
              <Sparkles className="w-2.5 h-2.5" />
              Nuevo
            </span>
          </div>
        )}
        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/25 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>
        {/* Big initial letter as background decoration */}
        <div className="absolute -bottom-4 -right-2 text-[96px] font-black text-white/10 leading-none select-none">
          {initial}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex-1 flex flex-col gap-2.5">
        {/* Logo + title row */}
        <div className="flex items-start gap-3">
          {/* Square avatar */}
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <span className="text-base font-extrabold text-white select-none">{initial}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors duration-150">
              {product.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 truncate">por {product.business_name}</p>
          </div>

          {/* Access badge */}
          <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${accessCls}`}>
            {accessLbl}
          </span>
        </div>

        {/* Description */}
        {product.description ? (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin descripción</p>
        )}

        {/* Stats line */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-extrabold mr-1 ${isFree ? "text-emerald-600" : "text-gray-900"}`}>
            {priceLabel(product)}
          </span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
            {rating}
            <span className="text-gray-300 ml-0.5">({reviews})</span>
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
            <Users className="w-3 h-3 text-gray-300" />
            {members}
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
            <Eye className="w-3 h-3 text-gray-300" />
            {views}
          </span>
          {ago && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-[11px] text-gray-300 ml-auto">Lanzado {ago}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Featured card (big, 2-column) ────────────────────────────────────────────

function FeaturedCard({ product }: { product: PublicProduct }) {
  const gradient  = TYPE_GRADIENTS[product.type] ?? "from-gray-400 to-gray-600";
  const typeLabel = TYPE_LABELS[product.type]    ?? product.type;
  const href      = `/produto/${product.slug ?? product.id}`;
  const initial   = product.name.charAt(0).toUpperCase();

  return (
    <Link
      href={href}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white border border-gray-100 hover:shadow-xl hover:shadow-gray-100 transition-all duration-200"
      style={{ minHeight: 200 }}
    >
      {/* Full-bleed background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* Big decorative letter */}
      <div className="absolute -bottom-6 -right-4 text-[140px] font-black text-white/10 leading-none select-none">
        {initial}
      </div>
      {/* Scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative p-5 h-full flex flex-col justify-between" style={{ minHeight: 200 }}>
        {/* Top: type badge */}
        <div>
          <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>
        {/* Bottom: info */}
        <div>
          <p className="text-lg font-extrabold text-white leading-tight line-clamp-2 group-hover:text-white/90 transition-colors">
            {product.name}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-white/70">{product.business_name}</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-white/80 group-hover:text-white group-hover:gap-2 transition-all">
              Ver más <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
          {product.description && (
            <p className="text-xs text-white/60 mt-1 line-clamp-1">{product.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Featured section (2 big cards) ──────────────────────────────────────────

function FeaturedSection({ products }: { products: PublicProduct[] }) {
  const featured = products.slice(0, 2);
  if (featured.length === 0) return null;

  return (
    <section className="px-6 lg:px-8">
      <h2 className="text-sm font-bold text-gray-900 mb-3">Para empezar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featured.map((p) => (
          <FeaturedCard key={p.id} product={p} />
        ))}
        {featured.length === 1 && (
          <Link
            href="/mis-negocios"
            className="rounded-2xl border-2 border-dashed border-gray-100 hover:border-orange-200 hover:bg-orange-50/50 transition-all duration-200 flex flex-col items-center justify-center gap-3 p-8 cursor-pointer group"
            style={{ minHeight: 200 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-6 h-6 text-orange-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-700">Publica tu producto</p>
              <p className="text-xs text-gray-400 mt-1">Sé parte del marketplace</p>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── Section icon map ─────────────────────────────────────────────────────────

const SECTION_ICONS: Record<string, React.ElementType> = {
  trending:    TrendingUp,
  new:         Sparkles,
  free:        Gift,
  ai:          Bot,
  negocios:    Briefcase,
  marketing:   Megaphone,
  cursos:      BookOpen,
  comunidades: Users,
  mentoria:    Zap,
  recursos:    BookOpen,
};

// ─── Carousel section ─────────────────────────────────────────────────────────

interface SectionConfig {
  id: string;
  title: string;
  subtitle: string;
  filter: (p: PublicProduct) => boolean;
  maxItems: number;
}

function CarouselSection({ config, products }: { config: SectionConfig; products: PublicProduct[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd,   setAtEnd]   = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 8);
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -340 : 340, behavior: "smooth" });
  }, []);

  const items = useMemo(
    () => products.filter(config.filter).slice(0, config.maxItems),
    [products, config]
  );

  const isEmpty = items.length === 0;
  const Icon = SECTION_ICONS[config.id] ?? Package;

  return (
    <section aria-label={config.title}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 lg:px-8 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-500 shrink-0" />
            <h2 className="text-sm font-bold text-gray-900">{config.title}</h2>
          </div>
          {config.subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 pl-6">{config.subtitle}</p>
          )}
        </div>
        {!isEmpty && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => scroll("left")}
              disabled={atStart}
              aria-label="Anterior"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => scroll("right")}
              disabled={atEnd}
              aria-label="Siguiente"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}
      </div>

      {/* Track */}
      <div
        ref={ref}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto px-6 lg:px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {isEmpty ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{ scrollSnapAlign: "start" }}>
              <SkeletonCard />
            </div>
          ))
        ) : (
          items.map((p) => (
            <div key={p.id} style={{ scrollSnapAlign: "start" }}>
              <ProductCard product={p} />
            </div>
          ))
        )}
      </div>

      {isEmpty && (
        <div className="px-6 lg:px-8 mt-2 flex items-center gap-2">
          <p className="text-xs text-gray-300">Próximamente</p>
          <span className="text-gray-200">·</span>
          <Link href="/mis-negocios" className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors cursor-pointer inline-flex items-center gap-1">
            <PlusCircle className="w-3 h-3" />
            Sé el primero
          </Link>
        </div>
      )}
    </section>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

function SearchResults({ products, query }: { products: PublicProduct[]; query: string }) {
  const q = query.toLowerCase().trim();
  const results = useMemo(
    () => products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q) ||
        p.business_name.toLowerCase().includes(q)
    ),
    [products, q]
  );

  return (
    <div className="px-6 lg:px-8 space-y-4">
      <p className="text-xs text-gray-400">
        <span className="font-bold text-gray-900">{results.length}</span> resultado{results.length !== 1 ? "s" : ""} para{" "}
        <span className="text-orange-500 font-medium">&ldquo;{query}&rdquo;</span>
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-100 py-24 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">Sin resultados</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
              Intenta con otro término, o conviértete en el primero en crear ese contenido.
            </p>
          </div>
          <Link
            href="/mis-negocios"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors cursor-pointer shadow-sm shadow-orange-100"
          >
            <PlusCircle className="w-4 h-4" />
            Crear producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((p) => (
            <div key={p.id} className="w-full">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Category pills ───────────────────────────────────────────────────────────

const CATEGORY_PILLS = [
  { label: "Todo",        value: "" },
  { label: "Cursos",      value: "curso" },
  { label: "Comunidades", value: "comunidad" },
  { label: "Mentorías",   value: "mentoria" },
  { label: "Ebooks",      value: "ebook" },
  { label: "Servicios",   value: "servicio" },
  { label: "Eventos",     value: "evento" },
];

// ─── Hero ─────────────────────────────────────────────────────────────────────

interface HeroProps {
  query: string;
  setQuery: (v: string) => void;
  activeTab: "discover" | "create";
  setActiveTab: (v: "discover" | "create") => void;
  totalProducts: number;
}

function Hero({ query, setQuery, activeTab, setActiveTab, totalProducts }: HeroProps) {
  return (
    <div className="bg-white pt-12 pb-10 border-b border-gray-100">
      <div className="max-w-3xl mx-auto px-6 sm:px-8 flex flex-col items-center text-center gap-8">

        {/* Tab switcher — minimal Whop-style */}
        <div className="inline-flex items-center gap-0.5 p-1 rounded-lg border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setActiveTab("discover")}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "discover"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Descubrir
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-1.5 rounded-md text-sm font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "create"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Lanzar
          </button>
        </div>

        {activeTab === "discover" ? (
          <>
            {/* Massive headline */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-7xl font-extrabold text-gray-900 leading-[0.92] tracking-tight">
                Donde los negocios{" "}
                <span className="text-orange-500">despegan.</span>
              </h1>
              <p className="text-gray-500 text-base sm:text-lg leading-relaxed max-w-md mx-auto">
                Descubre cursos, comunidades y herramientas creadas por emprendedores.
              </p>
            </div>

            {/* Search bar — large pill */}
            <div className="w-full max-w-2xl">
              <div
                className="flex items-center gap-3 px-5 py-4 rounded-2xl border border-gray-200 bg-gray-50 hover:border-gray-300 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-50 transition-all duration-200"
              >
                <Search className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cursos, comunidades, creadores..."
                  className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Limpiar"
                    className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Inline stats — Whop style */}
            <div className="flex items-center gap-1.5 text-sm flex-wrap justify-center">
              <span className="font-extrabold text-gray-900">
                {totalProducts > 0 ? `${totalProducts}+` : "—"}
              </span>
              <span className="text-gray-400">productos</span>
              <span className="text-gray-200 mx-1">·</span>
              <span className="font-extrabold text-gray-900">2.4k+</span>
              <span className="text-gray-400">usuarios</span>
              <span className="text-gray-200 mx-1">·</span>
              <span className="font-extrabold text-gray-900">180+</span>
              <span className="text-gray-400">creadores</span>
              <span className="text-gray-200 mx-1 hidden sm:inline">·</span>
              <span className="font-extrabold text-gray-900 hidden sm:inline">$2.1M+</span>
              <span className="text-gray-400 hidden sm:inline">generados</span>
            </div>
          </>
        ) : (
          /* Launch tab */
          <div className="py-6 space-y-6 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto">
              <PlusCircle className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Publica tu producto</h2>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Comparte tu conocimiento. Crea un curso, comunidad, ebook o servicio y empieza a monetizar hoy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/mis-negocios"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors cursor-pointer shadow-sm shadow-orange-100"
              >
                <PlusCircle className="w-4 h-4" />
                Crear negocio
              </Link>
              <button
                onClick={() => setActiveTab("discover")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors cursor-pointer"
              >
                Ver marketplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sections config ──────────────────────────────────────────────────────────

const SECTIONS: SectionConfig[] = [
  {
    id: "trending",
    title: "Tendencias",
    subtitle: "Lo más popular del ecosistema ahora mismo",
    filter: () => true,
    maxItems: 10,
  },
  {
    id: "new",
    title: "Nuevos lanzamientos",
    subtitle: "Publicados recientemente por la comunidad",
    filter: isNew,
    maxItems: 8,
  },
  {
    id: "free",
    title: "Gratis",
    subtitle: "Empieza sin invertir un peso",
    filter: (p) => p.access_type === "free",
    maxItems: 8,
  },
  {
    id: "ai",
    title: "IA & Automatización",
    subtitle: "Tecnología que multiplica tu productividad",
    filter: kwFilter("ia", "inteligencia artificial", "automatización", "chatgpt", "ai ", "automation", "gpt", "openai"),
    maxItems: 8,
  },
  {
    id: "negocios",
    title: "Negocios & Emprendimiento",
    subtitle: "De la idea al negocio rentable",
    filter: kwFilter("negocio", "emprendimiento", "empresa", "startup", "pyme", "emprender", "b2b"),
    maxItems: 8,
  },
  {
    id: "marketing",
    title: "Marketing Digital",
    subtitle: "Atrae clientes y escala tu marca",
    filter: kwFilter("marketing", "redes sociales", "seo", "publicidad", "instagram", "tiktok", "contenido", "ads"),
    maxItems: 8,
  },
  {
    id: "cursos",
    title: "Cursos",
    subtitle: "Aprende con los mejores a tu ritmo",
    filter: (p) => p.type === "curso",
    maxItems: 8,
  },
  {
    id: "comunidades",
    title: "Comunidades",
    subtitle: "Conecta con personas que piensan como tú",
    filter: (p) => p.type === "comunidad",
    maxItems: 8,
  },
  {
    id: "mentoria",
    title: "Mentorías & Servicios",
    subtitle: "Acelera con acompañamiento experto",
    filter: (p) => p.type === "mentoria" || p.type === "servicio",
    maxItems: 8,
  },
  {
    id: "recursos",
    title: "Ebooks & Recursos",
    subtitle: "Descarga, lee y aplica hoy",
    filter: (p) => p.type === "ebook",
    maxItems: 8,
  },
];

// ─── Main client component ────────────────────────────────────────────────────

export function DiscoverClient({ products }: { products: PublicProduct[] }) {
  const [query,      setQuery]      = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab,  setActiveTab]  = useState<"discover" | "create">("discover");

  const isSearching = query.trim().length > 0;

  const displayProducts = useMemo(
    () => (typeFilter ? products.filter((p) => p.type === typeFilter) : products),
    [products, typeFilter]
  );

  return (
    <div className="min-h-screen bg-gray-50 -m-8">
      {/* Hero */}
      <Hero
        query={query}
        setQuery={setQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalProducts={products.length}
      />

      {/* Category pills — sticky below hero */}
      {activeTab === "discover" && !isSearching && (
        <div
          className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 lg:px-8 py-2.5 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORY_PILLS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                typeFilter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {activeTab === "discover" && (
        <div className="py-8 space-y-10">
          {isSearching ? (
            <SearchResults products={displayProducts} query={query} />
          ) : (
            <>
              {/* 2-card featured section */}
              <FeaturedSection products={displayProducts} />

              {/* Carousels */}
              {SECTIONS.map((cfg) => (
                <CarouselSection key={cfg.id} config={cfg} products={displayProducts} />
              ))}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center mt-6 bg-white">
        <p className="text-xs text-gray-300">
          © {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
