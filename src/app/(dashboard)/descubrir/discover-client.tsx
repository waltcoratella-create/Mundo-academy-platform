"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, ChevronRight, X, Star, Users, Eye,
  TrendingUp, Sparkles, Gift, BookOpen, Bot, Briefcase,
  Megaphone, Zap, Package, PlusCircle, DollarSign, Flame, ArrowRight,
  Plus, Mic, ArrowUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PublicProduct } from "@/lib/supabase/queries";

// ─── Mock metrics ─────────────────────────────────────────────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const fakeRating  = (id: string) => (4.2 + (hashStr(id) % 16) / 20).toFixed(1);
const fakeReviews = (id: string) => 3  + (hashStr(id + "r") % 497);
const fakeMembers = (id: string) => 20 + (hashStr(id + "m") % 49980);
const fakeViews   = (id: string) => 300 + (hashStr(id + "v") % 299700);
const fakeSales   = (id: string) => 5  + (hashStr(id + "s") % 995);

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

// ─── Time ─────────────────────────────────────────────────────────────────────

const NOW = Date.now();
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1_000;
function isNew(p: PublicProduct) { return !!p.created_at && NOW - new Date(p.created_at).getTime() < TWO_WEEKS_MS; }
function timeAgo(d: string): string {
  const days = Math.floor((NOW - new Date(d).getTime()) / 86_400_000);
  if (days < 1)   return "hoy";
  if (days < 7)   return `${days}d ago`;
  if (days < 30)  return `${Math.floor(days / 7)}sem ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// ─── Keyword filter ───────────────────────────────────────────────────────────

function kw(...words: string[]) {
  return (p: PublicProduct) => {
    const t = `${p.name} ${p.description ?? ""}`.toLowerCase();
    return words.some((w) => t.includes(w));
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const GRADIENTS: Record<string, [string, string]> = {
  curso:     ["from-blue-600 via-blue-500 to-indigo-700",       "#3b82f6"],
  comunidad: ["from-violet-600 via-purple-500 to-fuchsia-700",  "#8b5cf6"],
  ebook:     ["from-emerald-600 via-teal-500 to-green-700",     "#10b981"],
  mentoria:  ["from-amber-500 via-orange-500 to-orange-600",    "#f59e0b"],
  evento:    ["from-rose-600 via-red-500 to-pink-600",          "#e11d48"],
  servicio:  ["from-slate-700 via-slate-600 to-slate-800",      "#475569"],
};
const GRAD_DEFAULT: [string, string] = ["from-gray-500 via-gray-600 to-gray-700", "#6b7280"];

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

// ─────────────────────────────────────────────────────────────────────────────
//  PRODUCT CARD — w-[360px] | aspect-[2/1] banner | Tendencias / carousels
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: PublicProduct }) {
  const [gradCls]  = GRADIENTS[product.type] ?? GRAD_DEFAULT;
  const typeLabel  = TYPE_LABELS[product.type] ?? product.type;
  const accCls     = ACCESS_CLS[product.access_type]  ?? "";
  const accLbl     = ACCESS_LBL[product.access_type]  ?? product.access_type;
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
      className="group flex-none w-[360px] min-w-[360px] rounded-[16px] overflow-hidden bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,.05)] hover:bg-[#f9f9f9] transition-colors duration-200 cursor-pointer flex flex-col"
    >
      {/* Banner */}
      <div className={`relative aspect-[2/1] overflow-hidden bg-gradient-to-br ${gradCls} shrink-0`}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_30%,rgba(255,255,255,0.12),transparent_70%)]" />
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 shadow-2xl flex items-center justify-center ring-1 ring-white/20">
            <span className="text-3xl font-black text-white drop-shadow-lg select-none">{initial}</span>
          </div>
        </div>
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          {showNew
            ? <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400 text-black shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />Nuevo
              </span>
            : <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white/90 ${accCls}`}>{accLbl}</span>
          }
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-sm">{typeLabel}</span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 pr-12 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-[12px] bg-gradient-to-br ${gradCls} flex items-center justify-center shrink-0 shadow-md`}>
            <span className="text-base font-black text-white select-none">{initial}</span>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-[16px] font-bold text-gray-900 leading-6 line-clamp-1 group-hover:text-orange-600 transition-colors duration-150">
              {product.name}
            </h3>
            <p className="text-[12px] text-gray-400 mt-0.5 truncate">por {product.business_name}</p>
          </div>
          <span className={`shrink-0 text-[12px] font-bold ${isFree ? "text-emerald-600" : "text-gray-900"} pt-0.5`}>
            {priceStr(product)}
          </span>
        </div>
        {product.description
          ? <p className="text-[14px] leading-5 text-gray-500 line-clamp-2">{product.description}</p>
          : <p className="text-[14px] leading-5 text-gray-300 italic">Sin descripción disponible</p>
        }
        <div className="mt-auto flex items-center gap-2 text-[12px] text-gray-400 flex-wrap">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />
            {rating}
            <span className="text-gray-300 ml-0.5">({reviews})</span>
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3 text-gray-300" />{members}
          </span>
          <span className="text-gray-200">·</span>
          <span className="flex items-center gap-0.5">
            <Eye className="w-3 h-3 text-gray-300" />{views}
          </span>
          {ago && (
            <>
              <span className="text-gray-200">·</span>
              <span className="text-gray-300 ml-auto">Lanzado {ago}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex-none w-[360px] min-w-[360px] rounded-[16px] overflow-hidden bg-white border border-gray-100 animate-pulse">
      <div className="aspect-[2/1] bg-gray-100" />
      <div className="p-4 pr-12 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-[12px] bg-gray-100 shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-4 bg-gray-100 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-3.5 bg-gray-100 rounded w-10 shrink-0" />
        </div>
        <div className="h-3.5 bg-gray-100 rounded w-full" />
        <div className="h-3.5 bg-gray-100 rounded w-4/5" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 bg-gray-100 rounded w-14" />
          <div className="h-3 bg-gray-100 rounded w-10" />
          <div className="h-3 bg-gray-100 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION ICON MAP
// ─────────────────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  trending: Flame, vendidos: TrendingUp, new: Sparkles, free: Gift,
  ai: Bot, negocios: Briefcase, marketing: Megaphone, wealth: DollarSign,
  cursos: BookOpen, comunidades: Users, mentoria: Zap, recursos: BookOpen,
};

// ─────────────────────────────────────────────────────────────────────────────
//  CAROUSEL SECTION
// ─────────────────────────────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  title: string;
  subtitle?: string;
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
    ref.current?.scrollBy({ left: d === "l" ? -376 : 376, behavior: "smooth" });
  }, []);

  const items = useMemo(() => {
    let list = products.filter(def.filter);
    if (def.sort) list = [...list].sort(def.sort);
    return list.slice(0, def.maxItems);
  }, [products, def]);

  const empty = items.length === 0;
  const Icon  = ICONS[def.id] ?? Package;

  return (
    <section aria-label={def.title} className="min-w-0 overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-orange-500 shrink-0" />
            <h2 className="text-[20px] font-bold text-gray-900 tracking-[-0.4125px] leading-tight">
              {def.title}
            </h2>
          </div>
          {def.subtitle && (
            <p className="text-[14px] text-gray-400 mt-0.5 pl-7">{def.subtitle}</p>
          )}
        </div>
        {!empty && (
          <div className="flex gap-1 shrink-0 pt-0.5">
            <button onClick={() => scroll("l")} disabled={atStart} aria-label="Atrás"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => scroll("r")} disabled={atEnd} aria-label="Adelante"
              className="w-8 h-8 rounded-full border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-sm">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      <div ref={ref} onScroll={onScroll}
        className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}>
        {empty
          ? [1,2,3,4].map((i) => <div key={i} style={{ scrollSnapAlign: "start" }}><SkeletonCard /></div>)
          : items.map((p) => <div key={p.id} style={{ scrollSnapAlign: "start" }}><ProductCard product={p} /></div>)
        }
      </div>

      {empty && (
        <p className="mt-2 text-xs text-gray-300">
          Próximamente ·{" "}
          <Link href="/mis-negocios" className="text-orange-500 hover:text-orange-600 cursor-pointer font-medium">
            Publicar aquí
          </Link>
        </p>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SEARCH RESULTS
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        <b className="text-gray-900">{results.length}</b> resultado{results.length !== 1 ? "s" : ""} para{" "}
        <span className="text-orange-500">&ldquo;{query}&rdquo;</span>
      </p>
      {results.length === 0 ? (
        <div className="rounded-[16px] border-2 border-dashed border-gray-100 py-20 flex flex-col items-center gap-4 text-center">
          <Package className="w-10 h-10 text-gray-200" />
          <div>
            <p className="font-bold text-gray-500">Sin resultados</p>
            <p className="text-sm text-gray-300 mt-1">Intenta con otro término.</p>
          </div>
          <Link href="/mis-negocios"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors cursor-pointer">
            <PlusCircle className="w-4 h-4" />Crear producto
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 sm:gap-5">
          {results.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EMPEZANDO SECTION — 2 starter banner cards (Mundo Academy only)
// ─────────────────────────────────────────────────────────────────────────────

const EMPEZANDO_BANNERS = [
  {
    id: "b1",
    src: "/discover/banners/banner-mundo-academy-stars.png",
    alt: "Aprende de los que ya lo lograron — Mundo Academy",
    href: "/descubrir",
  },
  {
    id: "b4",
    src: "/discover/banners/banner-mundo-academy-logo.png",
    alt: "Mundo Academy — Aprende, crea y crece",
    href: "/descubrir",
  },
];

function EmpezandoSection() {
  return (
    <section className="min-w-0">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-orange-500" />
        <h2 className="text-[20px] font-bold text-gray-900 tracking-[-0.4125px]">Empezando</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {EMPEZANDO_BANNERS.map((banner) => (
          <Link
            key={banner.id}
            href={banner.href}
            className="group relative block rounded-[16px] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,.05)] hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <div className="relative w-full aspect-[2/1]">
              <Image
                src={banner.src}
                alt={banner.alt}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MUNDO EJECUTIVO SECTION — 2 editorial cards, no metadata/badges/price
// ─────────────────────────────────────────────────────────────────────────────

interface EditorialCardDef {
  id: string;
  title: string;
  description: string;
  src: string;
  href: string;
  gradient: string;
  initial: string;
}

const MUNDO_EJECUTIVO_CARDS: EditorialCardDef[] = [
  {
    id: "me1",
    title: "Galería Mundo Ejecutivo",
    description: "Explora nuestras revistas y contenido exclusivo",
    src: "/discover/banners/banner-galeria-mundo-ejecutivo.png",
    href: "/descubrir",
    gradient: "from-amber-600 via-orange-500 to-red-600",
    initial: "G",
  },
  {
    id: "me2",
    title: "Mundo Ejecutivo Noticias",
    description: "Noticias que impulsan líderes y transforman decisiones",
    src: "/discover/banners/banner-mundo-ejecutivo-noticias.png",
    href: "/descubrir",
    gradient: "from-slate-700 via-slate-600 to-slate-800",
    initial: "N",
  },
];

function EditorialCard({ card }: { card: EditorialCardDef }) {
  return (
    <Link
      href={card.href}
      className="group flex-none w-[360px] min-w-[360px] flex flex-col rounded-[16px] overflow-hidden bg-white border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,.05)] hover:bg-[#f9f9f9] transition-colors duration-200 cursor-pointer"
    >
      {/* Banner — same aspect-[2/1] as product cards */}
      <div className={`relative aspect-[2/1] overflow-hidden bg-gradient-to-br ${card.gradient} shrink-0`}>
        <Image
          src={card.src}
          alt={card.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          sizes="(max-width: 640px) 100vw, 50vw"
        />
        {/* Subtle bottom scrim */}
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      {/* Body — avatar + title + description + arrow, no badges/price/metadata */}
      <div className="p-4 flex items-start gap-3">
        <div className={`w-12 h-12 rounded-[12px] bg-gradient-to-br ${card.gradient} flex items-center justify-center shrink-0 shadow-md`}>
          <span className="text-base font-black text-white select-none">{card.initial}</span>
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="text-[16px] font-bold text-gray-900 leading-6 line-clamp-1 group-hover:text-orange-600 transition-colors duration-150">
            {card.title}
          </h3>
          <p className="text-[13px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">
            {card.description}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors shrink-0 mt-1" />
      </div>
    </Link>
  );
}

function MundoEjecutivoSection() {
  return (
    <section className="min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-5 h-5 text-orange-500 shrink-0" />
        <h2 className="text-[20px] font-bold text-gray-900 tracking-[-0.4125px]">Mundo Ejecutivo</h2>
      </div>
      <p className="text-[14px] text-gray-400 mb-4 pl-7">Contenido, noticias y recursos ejecutivos.</p>
      {/* Same carousel track as CarouselSection — cards are 360px, same as ProductCard */}
      <div
        className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {MUNDO_EJECUTIVO_CARDS.map((card) => (
          <div key={card.id} style={{ scrollSnapAlign: "start" }}>
            <EditorialCard card={card} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SECTIONS CONFIG — Tendencias + rest (real products only)
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: SectionDef[] = [
  { id: "trending",    title: "Tendencias",               subtitle: "Los productos más populares del ecosistema",               filter: () => true,                                                                                    maxItems: 10 },
  { id: "vendidos",    title: "Más vendidos",              subtitle: "Los que más negocios han generado",                        filter: () => true,       sort: (a, b) => fakeSales(b.id) - fakeSales(a.id),                        maxItems: 10 },
  { id: "new",         title: "Nuevos lanzamientos",       subtitle: "Publicados recientemente",                                 filter: isNew,                                                                                         maxItems: 8  },
  { id: "free",        title: "Gratis",                    subtitle: "Empieza sin gastar un peso",                               filter: (p) => p.access_type === "free",                                                               maxItems: 10 },
  { id: "ai",          title: "IA & Automatización",       subtitle: "Tecnología que multiplica tu productividad",               filter: kw("ia", "inteligencia artificial", "automatización", "chatgpt", "ai ", "gpt", "openai"),      maxItems: 8  },
  { id: "negocios",    title: "Negocios & Emprendimiento", subtitle: "De la idea al negocio rentable",                          filter: kw("negocio", "emprendimiento", "empresa", "startup", "pyme", "emprender"),                    maxItems: 8  },
  { id: "marketing",   title: "Marketing Digital",         subtitle: "Atrae clientes y escala tu marca",                        filter: kw("marketing", "redes sociales", "seo", "publicidad", "instagram", "tiktok", "ads"),          maxItems: 8  },
  { id: "wealth",      title: "Wealth & Finanzas",         subtitle: "Construye riqueza y libertad financiera",                  filter: kw("inversión", "inversion", "finanzas", "trading", "crypto", "dinero", "riqueza"),            maxItems: 8  },
  { id: "cursos",      title: "Cursos",                    subtitle: "Aprende con los mejores a tu ritmo",                      filter: (p) => p.type === "curso",                                                                     maxItems: 10 },
  { id: "comunidades", title: "Comunidades",               subtitle: "Conecta con personas que piensan como tú",                filter: (p) => p.type === "comunidad",                                                                 maxItems: 8  },
  { id: "mentoria",    title: "Mentorías & Servicios",     subtitle: "Acelera con acompañamiento experto",                      filter: (p) => p.type === "mentoria" || p.type === "servicio",                                         maxItems: 8  },
  { id: "recursos",    title: "Ebooks & Recursos",         subtitle: "Descarga, lee y aplica hoy",                              filter: (p) => p.type === "ebook",                                                                     maxItems: 10 },
];

// ─────────────────────────────────────────────────────────────────────────────
//  WHOP HERO
// ─────────────────────────────────────────────────────────────────────────────

function WhopHero({
  query, setQuery, activeTab, setActiveTab,
}: {
  query: string; setQuery: (v: string) => void;
  activeTab: "discover" | "create"; setActiveTab: (v: "discover" | "create") => void;
}) {
  return (
    <div
      className="relative pt-16 pb-12 px-6 flex flex-col items-center"
      style={{ background: "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 45%, transparent 70%), #ffffff" }}
    >
      <div className="w-full max-w-[750px] flex flex-col items-center gap-8">

        {/* Tab toggle */}
        <div className="inline-flex items-center h-10 p-1 rounded-[8px] bg-black/[0.063]">
          {(["create", "discover"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`h-8 px-2 rounded-[6px] text-[14px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                tab === activeTab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "create" ? "Lanzar" : "Descubrir"}
            </button>
          ))}
        </div>

        {/* Heading group */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[56px] font-normal leading-[1.1] tracking-[-0.04em] max-w-[500px] text-center text-[#202020]">
            Donde los negocios despegan.
          </h1>
          <p className="text-[16px] font-normal leading-[26px] max-w-[512px] text-[#646464] text-center">
            Descubre y lanza productos digitales con más de 21M de emprendedores en Mundo Academy.
          </p>
        </div>

        {/* Search box */}
        <div className="w-full">
          <div className="flex flex-col rounded-[28px] bg-[#f3f3f3] border border-[#dcdcdc] min-h-[102px]">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cursos, mentorías, comunidades..."
              className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none text-base w-full px-5 pt-4 pb-2 min-h-0"
            />
            <div className="mx-3 mb-3 flex items-center justify-between">
              <button
                aria-label="Opciones"
                className="w-8 h-8 rounded-full bg-white border border-[#ebebeb] flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-gray-500" />
              </button>
              <div className="flex items-center gap-2.5">
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    aria-label="Limpiar búsqueda"
                    className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  aria-label="Buscar por voz"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <Mic className="w-[18px] h-[18px]" />
                </button>
                <button
                  aria-label="Buscar"
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-900 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-[16px]">
          <span>
            <span className="font-semibold tracking-tighter text-black/60">3.4M US$</span>
            <span className="text-black/30"> earned</span>
          </span>
          <span className="text-black/[0.14]">·</span>
          <span>
            <span className="font-semibold tracking-tighter text-black/60">22M</span>
            <span className="text-black/30"> users</span>
          </span>
          <span className="text-black/[0.14]">·</span>
          <span>
            <span className="font-semibold tracking-tighter text-black/60">2.9M</span>
            <span className="text-black/30"> businesses</span>
          </span>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  LAUNCH VIEW
// ─────────────────────────────────────────────────────────────────────────────

function LaunchView() {
  return (
    <div className="px-4 lg:px-6 py-16 flex flex-col items-center text-center gap-6 max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
        <PlusCircle className="w-8 h-8 text-orange-500" />
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Publica tu producto</h2>
        <p className="text-sm text-gray-400 mt-2 leading-relaxed">Crea un curso, comunidad, ebook o servicio y empieza a monetizar hoy.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center">
        <Link href="/mis-negocios"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors cursor-pointer shadow-sm shadow-orange-100">
          <PlusCircle className="w-4 h-4" />Crear negocio
        </Link>
        <Link href="/descubrir"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-colors cursor-pointer">
          Ver marketplace
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="min-h-full bg-white w-full overflow-x-hidden">
      <WhopHero query={query} setQuery={setQuery} activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "create" && <LaunchView />}

      {activeTab === "discover" && (
        <div className="max-w-[1280px] mx-auto px-6 py-6 flex flex-col gap-10">
          {isSearching ? (
            <SearchResults products={displayProducts} query={query} />
          ) : (
            <>
              {/* 1. Empezando — 2 Mundo Academy starter banners */}
              <EmpezandoSection />

              {/* 2. Mundo Ejecutivo — 2 editorial cards, no metadata */}
              <MundoEjecutivoSection />

              {/* 3. Tendencias + rest — real products from backend */}
              {SECTIONS.map((def) => (
                <CarouselSection key={def.id} def={def} products={displayProducts} />
              ))}
            </>
          )}
        </div>
      )}

      <footer className="border-t border-gray-100 bg-white py-6 text-center mt-4">
        <p className="text-xs text-gray-300">© {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados</p>
      </footer>
    </div>
  );
}
