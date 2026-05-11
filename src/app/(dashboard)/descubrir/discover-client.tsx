"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Search, X, Star, Users,
  TrendingUp, Sparkles, Gift, BookOpen, Bot, Briefcase,
  Megaphone, Zap, Package, PlusCircle, DollarSign, Flame,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicProduct } from "@/lib/supabase/queries";

// ─── Deterministic mock metrics ───────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const fakeRating  = (id: string) => (4.2 + (hashStr(id) % 16) / 20).toFixed(1);
const fakeReviews = (id: string) => 3 + (hashStr(id + "r") % 497);
const fakeMembers = (id: string) => 20 + (hashStr(id + "m") % 49980);
const fakeSales   = (id: string) => 5  + (hashStr(id + "s") % 995);

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

// ─── Hydration-safe time ──────────────────────────────────────────────────────

const NOW = Date.now();
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1_000;

function isNew(p: PublicProduct): boolean {
  return !!p.created_at && NOW - new Date(p.created_at).getTime() < TWO_WEEKS_MS;
}
function timeAgo(d: string): string {
  const days = Math.floor((NOW - new Date(d).getTime()) / 86_400_000);
  if (days < 1)  return "hoy";
  if (days < 7)  return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

// ─── Keyword filter ───────────────────────────────────────────────────────────

function kw(...words: string[]) {
  return (p: PublicProduct) => {
    const t = `${p.name} ${p.description ?? ""}`.toLowerCase();
    return words.some((w) => t.includes(w));
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-indigo-600",
  comunidad: "from-violet-500 to-purple-700",
  ebook:     "from-emerald-500 to-teal-600",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-rose-500 to-rose-700",
  servicio:  "from-slate-500 to-slate-700",
};
const TYPE_LABELS: Record<string, string> = {
  curso: "Curso", comunidad: "Comunidad", ebook: "Ebook",
  mentoria: "Mentoría", evento: "Evento", servicio: "Servicio",
};
const ACCESS_CLS: Record<string, string> = {
  free:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  one_time:     "bg-blue-50 text-blue-700 border-blue-200",
  subscription: "bg-violet-50 text-violet-700 border-violet-200",
};
const ACCESS_LBL: Record<string, string> = {
  free: "Gratis", one_time: "Pago único", subscription: "Suscripción",
};

function priceStr(p: PublicProduct): string {
  if (p.access_type === "free") return "Gratis";
  const f = formatCurrency(p.price, p.currency);
  return p.access_type === "subscription"
    ? f + (p.billing_period === "monthly" ? "/mes" : "/año") : f;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-56 rounded-xl overflow-hidden bg-white border border-gray-100 animate-pulse">
      <div className="h-28 bg-gray-100" />
      <div className="p-2.5 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-3/4" />
        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
        <div className="flex justify-between">
          <div className="h-3 bg-gray-100 rounded w-14" />
          <div className="h-2.5 bg-gray-100 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

// ─── Compact product card ─────────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const grad     = GRADIENTS[product.type] ?? "from-gray-400 to-gray-600";
  const label    = TYPE_LABELS[product.type] ?? product.type;
  const accCls   = ACCESS_CLS[product.access_type] ?? "";
  const accLbl   = ACCESS_LBL[product.access_type] ?? product.access_type;
  const href     = `/produto/${product.slug ?? product.id}`;
  const initial  = product.name.charAt(0).toUpperCase();
  const showNew  = isNew(product);
  const rating   = fakeRating(product.id);
  const reviews  = fakeReviews(product.id);
  const members  = fmt(fakeMembers(product.id));
  const ago      = product.created_at ? timeAgo(product.created_at) : "";
  const isFree   = product.access_type === "free";

  return (
    <Link
      href={href}
      className="group flex-none w-56 rounded-xl overflow-hidden bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/80 transition-all duration-150 flex flex-col cursor-pointer"
    >
      {/* Banner */}
      <div className={`h-28 bg-gradient-to-br ${grad} relative overflow-hidden shrink-0`}>
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)", backgroundSize: "20px 20px" }} />
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Decorative letter */}
        <div className="absolute -bottom-3 -right-1 text-[72px] font-black text-white/10 leading-none select-none">{initial}</div>
        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          {showNew
            ? <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-white/90 text-orange-600"><Sparkles className="w-2.5 h-2.5" />New</span>
            : <span />}
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-black/25 text-white backdrop-blur-sm">{label}</span>
        </div>
        {/* Access pill bottom-left */}
        <div className="absolute bottom-2 left-2">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border bg-white/90 ${accCls}`}>{accLbl}</span>
        </div>
      </div>

      {/* Body — ultra compact */}
      <div className="p-2.5 flex-1 flex flex-col gap-1">
        {/* Avatar + title */}
        <div className="flex items-start gap-1.5">
          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${grad} flex items-center justify-center shrink-0 mt-0.5`}>
            <span className="text-[9px] font-black text-white select-none">{initial}</span>
          </div>
          <h3 className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 group-hover:text-orange-600 transition-colors duration-100 flex-1">
            {product.name}
          </h3>
        </div>
        {/* Creator */}
        <p className="text-[10px] text-gray-400 truncate pl-7.5">por {product.business_name}</p>
        {/* Footer: price + stats */}
        <div className="mt-auto pt-1.5 border-t border-gray-50 flex items-center justify-between gap-1">
          <span className={`text-xs font-extrabold ${isFree ? "text-emerald-600" : "text-gray-900"}`}>
            {priceStr(product)}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 shrink-0">
            <span className="flex items-center gap-0.5">
              <Star className="w-2.5 h-2.5 fill-amber-400 stroke-amber-400" />{rating}
              <span className="text-gray-300">({reviews})</span>
            </span>
            <span className="text-gray-200">·</span>
            <span className="flex items-center gap-0.5">
              <Users className="w-2.5 h-2.5 text-gray-300" />{members}
            </span>
            {ago && <><span className="text-gray-200">·</span><span className="text-gray-300">{ago}</span></>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Section icon map ─────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  trending:    Flame,
  vendidos:    TrendingUp,
  new:         Sparkles,
  free:        Gift,
  ai:          Bot,
  negocios:    Briefcase,
  marketing:   Megaphone,
  wealth:      DollarSign,
  cursos:      BookOpen,
  comunidades: Users,
  mentoria:    Zap,
  recursos:    BookOpen,
};

// ─── Carousel section ─────────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  title: string;
  filter: (p: PublicProduct) => boolean;
  sort?: (a: PublicProduct, b: PublicProduct) => number;
  maxItems: number;
}

function CarouselSection({ def, products }: { def: SectionDef; products: PublicProduct[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd,   setAtEnd]   = useState(false);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft < 8);
    setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 8);
  }, []);

  const scroll = useCallback((d: "l" | "r") => {
    ref.current?.scrollBy({ left: d === "l" ? -300 : 300, behavior: "smooth" });
  }, []);

  const items = useMemo(() => {
    let list = products.filter(def.filter);
    if (def.sort) list = [...list].sort(def.sort);
    return list.slice(0, def.maxItems);
  }, [products, def]);

  const empty = items.length === 0;
  const Icon  = ICONS[def.id] ?? Package;

  return (
    <section className="space-y-1.5" aria-label={def.title}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
          <span className="text-xs font-bold text-gray-900">{def.title}</span>
        </div>
        {!empty && (
          <div className="flex gap-0.5">
            <button onClick={() => scroll("l")} disabled={atStart} aria-label="Atrás"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <ChevronLeft className="w-3 h-3 text-gray-500" />
            </button>
            <button onClick={() => scroll("r")} disabled={atEnd} aria-label="Adelante"
              className="w-6 h-6 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors">
              <ChevronRight className="w-3 h-3 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Track */}
      <div ref={ref} onScroll={onScroll}
        className="flex gap-2.5 overflow-x-auto px-4 lg:px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}>
        {empty
          ? [1, 2, 3, 4, 5].map((i) => <div key={i} style={{ scrollSnapAlign: "start" }}><SkeletonCard /></div>)
          : items.map((p)  => <div key={p.id} style={{ scrollSnapAlign: "start" }}><ProductCard product={p} /></div>)
        }
      </div>

      {empty && (
        <p className="px-4 lg:px-6 text-[10px] text-gray-300">
          Próximamente ·{" "}
          <Link href="/mis-negocios" className="text-orange-400 hover:text-orange-500 cursor-pointer">
            Publicar
          </Link>
        </p>
      )}
    </section>
  );
}

// ─── Search results ───────────────────────────────────────────────────────────

function SearchResults({ products, query }: { products: PublicProduct[]; query: string }) {
  const q = query.toLowerCase().trim();
  const results = useMemo(
    () => products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description ?? "").toLowerCase().includes(q) ||
      p.business_name.toLowerCase().includes(q)
    ),
    [products, q]
  );

  return (
    <div className="px-4 lg:px-6 space-y-3">
      <p className="text-xs text-gray-400">
        <b className="text-gray-900">{results.length}</b> resultado{results.length !== 1 ? "s" : ""} para{" "}
        <span className="text-orange-500">&ldquo;{query}&rdquo;</span>
      </p>
      {results.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-100 py-16 flex flex-col items-center gap-4 text-center">
          <Package className="w-8 h-8 text-gray-200" />
          <div>
            <p className="text-sm font-bold text-gray-500">Sin resultados</p>
            <p className="text-xs text-gray-300 mt-1">Intenta con otro término.</p>
          </div>
          <Link href="/mis-negocios"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors cursor-pointer">
            <PlusCircle className="w-3.5 h-3.5" />Crear producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

// ─── Category pills ───────────────────────────────────────────────────────────

const PILLS = [
  { label: "Todo",        value: "" },
  { label: "Cursos",      value: "curso" },
  { label: "Comunidades", value: "comunidad" },
  { label: "Mentorías",   value: "mentoria" },
  { label: "Ebooks",      value: "ebook" },
  { label: "Servicios",   value: "servicio" },
  { label: "Eventos",     value: "evento" },
];

// ─── Compact hero ─────────────────────────────────────────────────────────────

function CompactHero({
  query, setQuery,
  activeTab, setActiveTab,
  totalProducts,
}: {
  query: string;
  setQuery: (v: string) => void;
  activeTab: "discover" | "create";
  setActiveTab: (v: "discover" | "create") => void;
  totalProducts: number;
}) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 lg:px-6 py-4">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Brand + tab */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-extrabold text-gray-900 tracking-tight">Mundo Academy</span>
          <div className="flex gap-0.5 p-0.5 rounded-lg border border-gray-200 bg-gray-50">
            <button onClick={() => setActiveTab("discover")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${activeTab === "discover" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
              Descubrir
            </button>
            <button onClick={() => setActiveTab("create")}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${activeTab === "create" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
              Lanzar
            </button>
          </div>
        </div>

        {/* Search — grows to fill */}
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cursos, comunidades, creadores..."
            className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Limpiar"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Stats inline */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] shrink-0">
          <span className="font-bold text-gray-900">{totalProducts > 0 ? `${totalProducts}+` : "—"}</span>
          <span className="text-gray-400">productos</span>
          <span className="text-gray-200">·</span>
          <span className="font-bold text-gray-900">2.4k+</span>
          <span className="text-gray-400">usuarios</span>
          <span className="text-gray-200">·</span>
          <span className="font-bold text-gray-900">180+</span>
          <span className="text-gray-400">creadores</span>
        </div>

        {/* CTA */}
        <Link href="/mis-negocios"
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0">
          <PlusCircle className="w-3 h-3" />Lanzar
        </Link>
      </div>
    </div>
  );
}

// ─── Launch tab content ───────────────────────────────────────────────────────

function LaunchView() {
  return (
    <div className="px-4 lg:px-6 py-12 flex flex-col items-center text-center gap-6 max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
        <PlusCircle className="w-7 h-7 text-orange-500" />
      </div>
      <div>
        <h2 className="text-xl font-extrabold text-gray-900">Publica tu producto</h2>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">
          Crea un curso, comunidad, ebook o servicio y empieza a monetizar.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
        <Link href="/mis-negocios"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors cursor-pointer">
          <PlusCircle className="w-4 h-4" />Crear negocio
        </Link>
        <Link href="/descubrir"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors cursor-pointer">
          Ver marketplace
        </Link>
      </div>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  { id: "trending",    title: "Tendencias",              filter: () => true,                                                                  maxItems: 12 },
  { id: "vendidos",    title: "Más vendidos",             filter: () => true,       sort: (a, b) => fakeSales(b.id) - fakeSales(a.id),         maxItems: 10 },
  { id: "new",         title: "Nuevos lanzamientos",      filter: isNew,                                                                       maxItems: 8  },
  { id: "free",        title: "Gratis",                   filter: (p) => p.access_type === "free",                                             maxItems: 10 },
  { id: "ai",          title: "IA & Automatización",      filter: kw("ia", "inteligencia artificial", "automatización", "chatgpt", "ai ", "gpt", "openai", "automation"), maxItems: 8 },
  { id: "negocios",    title: "Negocios & Emprendimiento",filter: kw("negocio", "emprendimiento", "empresa", "startup", "pyme", "emprender"),  maxItems: 8  },
  { id: "marketing",   title: "Marketing Digital",        filter: kw("marketing", "redes sociales", "seo", "publicidad", "instagram", "tiktok", "ads", "contenido"), maxItems: 8 },
  { id: "wealth",      title: "Wealth & Finanzas",        filter: kw("inversión", "inversion", "finanzas", "trading", "crypto", "dinero", "riqueza", "activos"), maxItems: 8 },
  { id: "cursos",      title: "Cursos",                   filter: (p) => p.type === "curso",                                                  maxItems: 10 },
  { id: "comunidades", title: "Comunidades",              filter: (p) => p.type === "comunidad",                                              maxItems: 8  },
  { id: "mentoria",    title: "Mentorías & Servicios",    filter: (p) => p.type === "mentoria" || p.type === "servicio",                      maxItems: 8  },
  { id: "recursos",    title: "Ebooks & Recursos",        filter: (p) => p.type === "ebook",                                                  maxItems: 8  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DiscoverClient({ products }: { products: PublicProduct[] }) {
  const [query,      setQuery]      = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [activeTab,  setActiveTab]  = useState<"discover" | "create">("discover");

  const isSearching = query.trim().length > 0;

  const displayProducts = useMemo(
    () => typeFilter ? products.filter((p) => p.type === typeFilter) : products,
    [products, typeFilter]
  );

  return (
    <div className="min-h-screen bg-gray-50 -m-8">
      {/* Compact hero */}
      <CompactHero
        query={query}
        setQuery={setQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        totalProducts={products.length}
      />

      {/* Sticky category pills */}
      {activeTab === "discover" && !isSearching && (
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 lg:px-6 py-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PILLS.map(({ label, value }) => (
            <button key={value} onClick={() => setTypeFilter(value)}
              className={`flex-none px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                typeFilter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Launch tab */}
      {activeTab === "create" && <LaunchView />}

      {/* Discover content */}
      {activeTab === "discover" && (
        <div className="py-4 space-y-5">
          {isSearching
            ? <SearchResults products={displayProducts} query={query} />
            : SECTIONS.map((def) => (
                <CarouselSection key={def.id} def={def} products={displayProducts} />
              ))
          }
        </div>
      )}

      <footer className="border-t border-gray-100 bg-white py-6 text-center mt-2">
        <p className="text-[10px] text-gray-300">
          © {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
