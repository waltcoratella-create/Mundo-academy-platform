"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Home, MessageCircle, Puzzle, ShoppingBag, Info,
  Plus, Package, BookOpen, FileText, Calendar, Layers,
  Heart, MessageSquare, Eye, Share2, Pin, Radio,
  Image as ImageIcon, Smile, BarChart2, DollarSign, Users,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Product, DashboardKPIs } from "@/lib/supabase/queries";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "home",      label: "Home",      icon: Home },
  { id: "chats",     label: "Chats",     icon: MessageCircle },
  { id: "apps",      label: "Apps",      icon: Puzzle },
  { id: "productos", label: "Productos", icon: ShoppingBag },
  { id: "acerca",    label: "Acerca",    icon: Info },
] as const;

type TabId = typeof TABS[number]["id"];

// ─── App type theme ───────────────────────────────────────────────────────────

interface TypeTheme { bg: string; text: string; Icon: LucideIcon }

const TYPE_THEME: Record<string, TypeTheme> = {
  curso:       { bg: "bg-blue-50",   text: "text-blue-600",   Icon: BookOpen },
  ebook:       { bg: "bg-purple-50", text: "text-purple-600", Icon: FileText },
  evento:      { bg: "bg-orange-50", text: "text-orange-600", Icon: Calendar },
  comunidad:   { bg: "bg-green-50",  text: "text-green-600",  Icon: Users },
  recurso:     { bg: "bg-amber-50",  text: "text-amber-600",  Icon: FileText },
  programa:    { bg: "bg-rose-50",   text: "text-rose-600",   Icon: Layers },
  herramienta: { bg: "bg-teal-50",   text: "text-teal-600",   Icon: Layers },
};

const DEFAULT_THEME: TypeTheme = { bg: "bg-gray-50", text: "text-gray-500", Icon: Package };

const TYPE_LABEL: Record<string, string> = {
  curso:       "Curso",
  ebook:       "Ebook",
  evento:      "Evento",
  comunidad:   "Comunidad",
  recurso:     "Recurso",
  programa:    "Programa",
  herramienta: "Herramienta",
};

const POST_ICONS = [
  { Icon: ImageIcon, title: "Imagen" },
  { Icon: Smile,     title: "Emoji" },
  { Icon: BarChart2, title: "Encuesta" },
  { Icon: DollarSign,title: "Monetizar" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-[rgba(0,0,0,0.45)]">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        Publicado
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 text-[12px] text-[rgba(0,0,0,0.45)]">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
        Activo
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[12px] text-[rgba(0,0,0,0.45)]">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
      Borrador
    </span>
  );
}

function AppCard({ product, base }: { product: Product; base: string }) {
  const theme = TYPE_THEME[product.type] ?? DEFAULT_THEME;
  const { Icon } = theme;
  const typeLabel = TYPE_LABEL[product.type] ?? "Producto";

  return (
    <Link
      href={`${base}/productos/${product.id}`}
      className="group block bg-white border border-black/[0.07] rounded-2xl p-4 hover:bg-gray-50/70 hover:border-black/[0.10] transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold leading-[24px] text-[#202020] truncate group-hover:text-black">
            {product.name}
          </p>

          {product.description ? (
            <p className="mt-0.5 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.61)] line-clamp-2">
              {product.description}
            </p>
          ) : (
            <p className="mt-0.5 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.30)] italic">
              Sin descripción
            </p>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[12px] text-[rgba(0,0,0,0.45)]">{typeLabel}</span>
            <span className="text-[rgba(0,0,0,0.20)] text-[12px]">·</span>
            <StatusBadge status={product.status} />
          </div>
        </div>

        {/* Arrow hint */}
        <ArrowRight className="w-4 h-4 text-[rgba(0,0,0,0.20)] shrink-0 mt-1 group-hover:text-[rgba(0,0,0,0.40)] transition-colors" />
      </div>
    </Link>
  );
}

// ─── Tab views ────────────────────────────────────────────────────────────────

interface HomeProps {
  kpis: DashboardKPIs;
  initial: string;
  businessName: string;
  base: string;
}

function HomeContent({ kpis, initial, businessName, base }: HomeProps) {
  return (
    <div className="space-y-5">
      {/* Products section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Productos</h3>
          <div className="flex items-center gap-2">
            <Link href={`${base}/productos`} className="text-xs text-brand-600 hover:underline font-medium">
              Ver todo
            </Link>
            <Link
              href={`${base}/productos`}
              className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-gray-600" />
            </Link>
          </div>
        </div>

        {kpis.productCount === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 py-10 flex flex-col items-center gap-2.5 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Sin productos todavía</p>
              <p className="text-xs text-gray-400 mt-0.5 max-w-xs">
                Crea tu primer producto para que tus miembros puedan acceder a tu contenido.
              </p>
            </div>
            <Link
              href={`${base}/productos`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Crear producto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700 relative">
                <div className="absolute bottom-2 left-2">
                  <span className="bg-white/20 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                    Acceso completo
                  </span>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold text-gray-900">Membresía {businessName}</p>
                <p className="text-xs text-gray-400 mt-0.5">Gratis · Acceso inmediato</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Community post box */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 select-none">
            {initial}
          </div>
          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100">
            ¿En qué estás pensando?
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {POST_ICONS.map(({ Icon, title }) => (
              <button
                key={title}
                title={title}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Radio className="w-3 h-3 text-red-500" /> Activar en vivo
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors">
              Publicar
            </button>
          </div>
        </div>
      </div>

      {/* Pinned post */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 select-none">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-gray-900">{businessName}</span>
              <span className="text-xs text-gray-400">· hace 2 días</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-medium">
                <Pin className="w-2.5 h-2.5" /> Fijado
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              ¡Bienvenido a{" "}
              <span className="font-semibold">{businessName}</span>! 🎉 Este es tu espacio en
              Mundo Academy. Comparte contenido, conecta con tus miembros y haz crecer tu
              negocio. ¡Empieza publicando tu primer post!
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <button className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                <Heart className="w-3.5 h-3.5" /> 0
              </button>
              <button className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                <MessageSquare className="w-3.5 h-3.5" /> 0 comentarios
              </button>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> 1 vista
              </span>
              <button className="flex items-center gap-1 hover:text-gray-600 transition-colors ml-auto">
                <Share2 className="w-3.5 h-3.5" /> Compartir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AppsProps {
  products: Product[];
  base: string;
}

function AppsContent({ products, base }: AppsProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[18px] font-bold leading-[26px] text-[#202020]">Apps</h3>
          <p className="mt-1 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.61)] max-w-md">
            Gestiona el contenido, cursos, recursos y experiencias que forman parte de este negocio.
          </p>
        </div>
        <Link
          href={`${base}/productos/nuevo`}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#202020] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors shrink-0"
        >
          <Plus className="w-[15px] h-[15px]" />
          Crear app
        </Link>
      </div>

      {products.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-black/[0.06] flex items-center justify-center">
            <Puzzle className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#202020]">
              Este negocio todavía no tiene apps
            </p>
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.61)] max-w-xs">
              Crea cursos, recursos o experiencias para tus miembros.
            </p>
          </div>
          <Link
            href={`${base}/productos/nuevo`}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-[#202020] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors"
          >
            <Plus className="w-[15px] h-[15px]" />
            Crear primera app
          </Link>
        </div>
      ) : (
        /* Apps grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <AppCard key={product.id} product={product} base={base} />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarHint({ label, base, path }: { label: string; base: string; path: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-[15px] text-[rgba(0,0,0,0.45)]">
        Accede a{" "}
        <span className="font-semibold text-[#202020]">{label}</span>{" "}
        desde la navegación lateral.
      </p>
      <Link
        href={`${base}/${path}`}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:underline"
      >
        Ir a {label} <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export interface BusinessTabsProps {
  products: Product[];
  kpis: DashboardKPIs;
  businessId: string;
  businessName: string;
  initial: string;
  base: string;
}

export function BusinessTabs({
  products,
  kpis,
  businessId,
  businessName,
  initial,
  base,
}: BusinessTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("home");

  return (
    <>
      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div className="flex items-stretch border-b border-black/[0.08] -mx-5 px-5 mt-6 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 h-14 text-[14px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
              activeTab === id
                ? "border-[#202020] text-[#202020]"
                : "border-transparent text-[rgba(0,0,0,0.50)] hover:text-[#202020] hover:border-black/[0.15]"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────────────────────── */}
      <div className="py-6">
        {activeTab === "home" && (
          <HomeContent
            kpis={kpis}
            initial={initial}
            businessName={businessName}
            base={base}
          />
        )}
        {activeTab === "apps" && (
          <AppsContent products={products} base={base} />
        )}
        {activeTab === "chats" && (
          <SidebarHint label="Chats" base={base} path="chats" />
        )}
        {activeTab === "productos" && (
          <SidebarHint label="Productos" base={base} path="productos" />
        )}
        {activeTab === "acerca" && (
          <SidebarHint label="Acerca" base={base} path="configuraciones" />
        )}
      </div>
    </>
  );
}
