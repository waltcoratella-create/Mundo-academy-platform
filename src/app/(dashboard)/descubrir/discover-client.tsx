"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Search, X, Star, Users, Gift, BookOpen,
  TrendingUp, Sparkles, Bot, Briefcase, Megaphone, Zap, Package,
  ArrowRight, PlusCircle,
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
  return (4.4 + (hashStr(id) % 12) / 20).toFixed(1);
}
function fakeMembers(id: string): number {
  return 50 + (hashStr(id + "m") % 1950);
}
function fakeViews(id: string): number {
  return 200 + (hashStr(id + "v") % 9800);
}
function formatCount(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
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
  if (days < 7) return `hace ${days}d`;
  if (days < 30) return `hace ${Math.floor(days / 7)}sem`;
  if (days < 365) return `hace ${Math.floor(days / 30)}mes`;
  return `hace ${Math.floor(days / 365)}año`;
}

// ─── Keyword filter helper ────────────────────────────────────────────────────

function keywordFilter(...words: string[]) {
  return (p: PublicProduct): boolean => {
    const text = `${p.name} ${p.description ?? ""}`.toLowerCase();
    return words.some((w) => text.includes(w));
  };
}

// ─── Design constants ─────────────────────────────────────────────────────────

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-600 via-blue-500 to-indigo-600",
  comunidad: "from-violet-600 via-purple-500 to-purple-700",
  ebook:     "from-emerald-600 via-green-500 to-teal-600",
  mentoria:  "from-amber-500 via-orange-500 to-orange-600",
  evento:    "from-rose-600 via-red-500 to-rose-700",
  servicio:  "from-slate-600 via-slate-500 to-slate-700",
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
  free:         { label: "Gratis",      cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25 ring-emerald-500/10" },
  one_time:     { label: "Pago único",  cls: "bg-sky-500/15 text-sky-400 border-sky-500/25 ring-sky-500/10" },
  subscription: { label: "Suscripción", cls: "bg-violet-500/15 text-violet-400 border-violet-500/25 ring-violet-500/10" },
};

function priceLabel(p: PublicProduct): string {
  if (p.access_type === "free") return "Gratis";
  const fmt = formatCurrency(p.price, p.currency);
  if (p.access_type === "subscription") {
    return fmt + (p.billing_period === "monthly" ? "/mes" : "/año");
  }
  return fmt;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-[268px] rounded-2xl overflow-hidden bg-stone-900/80 border border-stone-800 animate-pulse">
      <div className="h-36 bg-stone-800/60" />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-stone-800" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3 bg-stone-800 rounded w-3/4" />
            <div className="h-2.5 bg-stone-800 rounded w-1/2" />
          </div>
        </div>
        <div className="h-2.5 bg-stone-800 rounded w-full" />
        <div className="h-2.5 bg-stone-800 rounded w-2/3" />
        <div className="pt-2 border-t border-stone-800/60 flex justify-between">
          <div className="h-4 bg-stone-800 rounded w-14" />
          <div className="h-4 bg-stone-800 rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const gradient    = TYPE_GRADIENTS[product.type] ?? "from-stone-600 to-stone-700";
  const typeLabel   = TYPE_LABELS[product.type]    ?? product.type;
  const accessBadge = ACCESS_BADGES[product.access_type];
  const href        = `/produto/${product.slug ?? product.id}`;
  const initial     = product.name.charAt(0).toUpperCase();
  const showNew     = isNew(product);
  const rating      = fakeRating(product.id);
  const members     = formatCount(fakeMembers(product.id));
  const views       = formatCount(fakeViews(product.id));
  const ago         = product.created_at ? timeAgo(product.created_at) : "";
  const isFree      = product.access_type === "free";

  return (
    <Link
      href={href}
      className="group flex-none w-[268px] rounded-2xl overflow-visible bg-stone-900 border border-stone-800/80 hover:border-amber-600/40 hover:shadow-xl hover:shadow-amber-900/10 transition-all duration-200 flex flex-col cursor-pointer"
    >
      {/* Banner */}
      <div className={`h-36 bg-gradient-to-br ${gradient} relative rounded-t-2xl overflow-hidden shrink-0`}>
        {/* Mesh texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "24px 24px, 32px 32px",
          }}
        />
        {/* Noise grain overlay */}
        <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-gradient-to-t from-black/40 to-transparent" />

        {/* Badges top */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
          {showNew ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/90 text-black backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" />
              Nuevo
            </span>
          ) : <span />}
          <span className="text-[9px] font-semibold px-2 py-1 rounded-full bg-black/30 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>

        {/* Bottom gradient for avatar breathing room */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-stone-900/80 to-transparent" />
      </div>

      {/* Avatar — overlapping banner */}
      <div className="relative px-4 -mt-5 flex items-end justify-between">
        <div className="w-10 h-10 rounded-xl bg-stone-900 border-2 border-stone-800 shadow-lg flex items-center justify-center z-10 group-hover:border-amber-600/40 transition-colors duration-200">
          <span className="text-sm font-bold text-white select-none">{initial}</span>
        </div>
        {accessBadge && (
          <span className={`text-[9px] font-semibold px-2 py-1 rounded-full border ring-1 ${accessBadge.cls}`}>
            {accessBadge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 pt-2.5 pb-4 flex-1 flex flex-col gap-2">
        {/* Title */}
        <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors duration-200">
          {product.name}
        </h3>

        {/* Creator + time */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-stone-400 truncate max-w-[60%]">{product.business_name}</p>
          {ago && <p className="text-[10px] text-stone-600">{ago}</p>}
        </div>

        {/* Description */}
        {product.description ? (
          <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        ) : (
          <p className="text-[11px] text-stone-700 italic">Sin descripción</p>
        )}

        {/* Stats + price footer */}
        <div className="mt-auto pt-3 border-t border-stone-800/60 flex items-center justify-between gap-2">
          <span className={`text-sm font-bold ${isFree ? "text-emerald-400" : "text-white"}`}>
            {priceLabel(product)}
          </span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-0.5 text-[10px] text-stone-500" title={`${rating} estrellas`}>
              <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
              {rating}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-stone-500" title={`${members} miembros`}>
              <Users className="w-3 h-3 text-stone-600" />
              {members}
            </span>
            <span className="text-[10px] text-stone-600" title={`${views} vistas`}>
              {views} vistas
            </span>
          </div>
        </div>
      </div>
    </Link>
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
  viewAllHref?: string;
}

function CarouselSection({
  config,
  products,
}: {
  config: SectionConfig;
  products: PublicProduct[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const handleScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  const scroll = useCallback((dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  }, []);

  const items = useMemo(
    () => products.filter(config.filter).slice(0, config.maxItems),
    [products, config]
  );

  const isEmpty = items.length === 0;
  const SectionIcon = SECTION_ICONS[config.id] ?? Package;

  return (
    <section className="space-y-4" aria-label={config.title}>
      {/* Section header */}
      <div className="flex items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-600/15 border border-amber-600/20 flex items-center justify-center shrink-0">
            <SectionIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{config.title}</h2>
            <p className="text-[11px] text-stone-500 mt-0.5">{config.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {config.viewAllHref && !isEmpty && (
            <Link
              href={config.viewAllHref}
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
            >
              Ver todos
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
          {!isEmpty && (
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label="Anterior"
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-stone-300" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label="Siguiente"
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 border border-stone-700 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-stone-300" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto px-6 lg:px-8 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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

      {/* Empty state CTA */}
      {isEmpty && (
        <div className="px-6 lg:px-8 flex items-center gap-3">
          <p className="text-[11px] text-stone-600">
            Próximamente · Sé el primero en publicar aquí
          </p>
          <Link
            href="/crear"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-500 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3 h-3" />
            Crear producto
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
    <div className="px-6 lg:px-8 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          <span className="font-semibold text-white">{results.length}</span>{" "}
          resultado{results.length !== 1 ? "s" : ""} para{" "}
          <span className="text-amber-400">&ldquo;{query}&rdquo;</span>
        </p>
      </div>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-800 py-24 flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center">
            <Search className="w-7 h-7 text-stone-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-300">Sin resultados</p>
            <p className="text-xs text-stone-600 mt-1.5 max-w-xs leading-relaxed">
              Intenta con otro término. O conviértete en el primero en crear ese contenido.
            </p>
          </div>
          <Link
            href="/crear"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
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
  { label: "Todo",         value: "" },
  { label: "Cursos",       value: "curso" },
  { label: "Comunidades",  value: "comunidad" },
  { label: "Mentorías",    value: "mentoria" },
  { label: "Ebooks",       value: "ebook" },
  { label: "Servicios",    value: "servicio" },
  { label: "Eventos",      value: "evento" },
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
    <div className="relative overflow-hidden" style={{ background: "#0C0A09" }}>
      {/* Grid lines */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #CA8A04 1px, transparent 1px), linear-gradient(to bottom, #CA8A04 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {/* Dual glow */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-blue-700/10 blur-[80px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[250px] rounded-full bg-violet-700/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[100px] rounded-full bg-amber-600/5 blur-[60px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-6 sm:px-8 pt-12 pb-10 flex flex-col items-center text-center gap-7">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-900/80 border border-stone-800 backdrop-blur-sm">
          <button
            onClick={() => setActiveTab("discover")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "discover"
                ? "bg-amber-600 text-black shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Descubrir
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
              activeTab === "create"
                ? "bg-amber-600 text-black shadow-sm"
                : "text-stone-400 hover:text-stone-200"
            }`}
          >
            Crear
          </button>
        </div>

        {activeTab === "discover" ? (
          <>
            {/* Headline */}
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs font-semibold text-amber-500 tracking-widest uppercase">
                Mundo Academy Marketplace
              </p>
              <h1 className="text-4xl sm:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight">
                Donde los emprendedores{" "}
                <span className="relative">
                  <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                    construyen negocios.
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0" />
                </span>
              </h1>
              <p className="text-stone-400 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                Descubre cursos, comunidades, mentorías y herramientas creadas por emprendedores para emprendedores.
              </p>
            </div>

            {/* Search bar */}
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar cursos, comunidades, creadores..."
                className="w-full pl-11 pr-11 py-4 text-sm rounded-2xl text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-600/50 transition-all duration-200"
                style={{
                  background: "#1C1917",
                  border: "1px solid rgba(202,138,4,0.25)",
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-300 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 sm:gap-10">
              {[
                { value: totalProducts > 0 ? `${totalProducts}+` : "—", label: "Productos" },
                { value: "2.4k+",  label: "Miembros" },
                { value: "180+",   label: "Creadores" },
                { value: "$2.1M+", label: "Generados", hideMobile: true },
              ].map(({ value, label, hideMobile }, i, arr) => (
                <div key={label} className={`flex items-center gap-5 sm:gap-10 ${hideMobile ? "hidden sm:flex" : ""}`}>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{value}</p>
                    <p className="text-[10px] text-stone-600 mt-0.5 uppercase tracking-widest">{label}</p>
                  </div>
                  {i < arr.length - 1 && !arr[i + 1]?.hideMobile && (
                    <div className="w-px h-7 bg-stone-800" />
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Create tab */
          <div className="py-8 space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-amber-600/15 border border-amber-600/20 flex items-center justify-center mx-auto">
              <PlusCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Publica tu producto</h2>
              <p className="text-stone-400 text-sm mt-2 leading-relaxed">
                Comparte tu conocimiento. Crea un curso, comunidad, ebook o servicio y empieza a monetizar hoy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
              <Link
                href="/mis-negocios"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-black text-sm font-bold transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                Crear negocio
              </Link>
              <Link
                href="/descubrir"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm font-semibold transition-colors cursor-pointer"
              >
                Ver marketplace
              </Link>
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
    subtitle: "Los más populares ahora mismo",
    filter: () => true,
    maxItems: 10,
  },
  {
    id: "new",
    title: "Nuevos lanzamientos",
    subtitle: "Publicados recientemente en el ecosistema",
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
    filter: keywordFilter("ia", "inteligencia artificial", "automatización", "chatgpt", "ai ", "automation", "robot", "gpt", "openai"),
    maxItems: 8,
  },
  {
    id: "negocios",
    title: "Negocios & Emprendimiento",
    subtitle: "De la idea al negocio rentable",
    filter: keywordFilter("negocio", "emprendimiento", "empresa", "startup", "pyme", "ventas", "emprender", "b2b"),
    maxItems: 8,
  },
  {
    id: "marketing",
    title: "Marketing Digital",
    subtitle: "Atrae clientes y escala tu marca",
    filter: keywordFilter("marketing", "redes sociales", "seo", "publicidad", "instagram", "tiktok", "contenido", "ads", "marca"),
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
    subtitle: "Descarga, lee y aplica ya",
    filter: (p) => p.type === "ebook",
    maxItems: 8,
  },
];

// ─── Main client component ────────────────────────────────────────────────────

export function DiscoverClient({ products }: { products: PublicProduct[] }) {
  const [query,     setQuery]     = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"discover" | "create">("discover");

  const isSearching = query.trim().length > 0;

  const filteredProducts = useMemo(() => {
    if (!typeFilter) return products;
    return products.filter((p) => p.type === typeFilter);
  }, [products, typeFilter]);

  return (
    <div className="min-h-screen -m-8" style={{ background: "#0C0A09" }}>
      {/* Hero */}
      <Hero
        query={query}
        setQuery={setQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalProducts={products.length}
      />

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-600/20 to-transparent" />

      {/* Category pills */}
      {activeTab === "discover" && !isSearching && (
        <div className="sticky top-0 z-20 px-6 lg:px-8 py-3 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-stone-900/80 backdrop-blur-md"
          style={{ background: "rgba(12,10,9,0.92)" }}
        >
          {CATEGORY_PILLS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer ${
                typeFilter === value
                  ? "bg-amber-600 text-black"
                  : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800 hover:border-stone-600"
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
            <SearchResults products={filteredProducts} query={query} />
          ) : (
            SECTIONS.map((cfg) => (
              <CarouselSection key={cfg.id} config={cfg} products={filteredProducts} />
            ))
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-stone-900 py-8 text-center mt-4">
        <p className="text-[11px] text-stone-700">
          © {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
