"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Home, MessageCircle, Puzzle, ShoppingBag, Info,
  Plus, Package, BookOpen, FileText, Calendar, Layers,
  Heart, MessageSquare, Eye, Share2, Pin, Radio,
  Image as ImageIcon, Smile, BarChart2, DollarSign, Users,
  ArrowRight, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Product, DashboardKPIs } from "@/lib/supabase/queries";
import { ACCESS_TYPE_LABELS, BILLING_PERIOD_SUFFIX } from "@/lib/constants/products";
import { BusinessChat } from "./business-chat";
import { BusinessAbout } from "./business-about";

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
        {/* Icon / cover thumbnail */}
        <div
          className={`w-12 h-12 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0 overflow-hidden`}
        >
          {product.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.cover_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Icon className="w-5 h-5" />
          )}
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

// ─── Home product card (Home tab only) ───────────────────────────────────────

function HomeProductCard({ product, base }: { product: Product; base: string }) {
  const theme = TYPE_THEME[product.type] ?? DEFAULT_THEME;
  const { Icon } = theme;
  const { main: priceMain, suffix: priceSuffix } = formatPrice(product);

  return (
    <Link
      href={`${base}/productos/${product.id}`}
      className="shrink-0 flex flex-col bg-white rounded-[12px] overflow-hidden group"
      style={{
        width: "266px",
        minWidth: "220px",
        height: "219px",
        boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
      }}
    >
      {/* ── Thumbnail — 150px ──────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "150px", width: "100%" }}>
        {/* Real cover or type-themed fallback */}
        {product.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.cover_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${theme.bg} flex items-center justify-center`}>
            <Icon className={`w-14 h-14 ${theme.text} opacity-20`} />
          </div>
        )}

        {/* Dark gradient overlay — always present so title is legible */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,.70), transparent)" }}
        />

        {/* Title inside overlay */}
        <div className="absolute bottom-0 left-0 right-0" style={{ padding: "24px 12px 10px 12px" }}>
          <p
            className="text-white line-clamp-2"
            style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px" }}
          >
            {product.name}
          </p>
        </div>
      </div>

      {/* ── Price — 32px ───────────────────────────────────────────── */}
      <div
        className="flex items-center"
        style={{ padding: "8px 12px", height: "32px" }}
      >
        <p style={{ fontSize: "12px", fontWeight: 500, lineHeight: "16px", letterSpacing: "0.0075px", color: "#345BC8" }}>
          {priceMain}{priceSuffix}
        </p>
      </div>

      {/* ── Action bar — 37px ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "6px 12px", height: "37px", borderTop: "1px solid rgba(0,0,0,.12)" }}
      >
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => e.preventDefault()}
            className="w-6 h-6 rounded-[6px] flex items-center justify-center"
            style={{ background: "transparent", color: "rgba(0,49,186,.8)" }}
            title="Ver"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            className="w-6 h-6 rounded-[6px] flex items-center justify-center"
            style={{ background: "transparent", color: "rgba(0,49,186,.8)" }}
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
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
  products: Product[];
}

function HomeContent({ kpis, initial, businessName, base, products }: HomeProps) {
  void kpis; // kept in interface for future KPI widgets
  return (
    <div className="space-y-8">

      {/* ── Products ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontSize: "18px", fontWeight: 600, lineHeight: "24px", color: "#202020" }}>
            Productos
          </h3>
          <div className="flex items-center gap-2">
            <Link
              href={`${base}/productos`}
              style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "#345BC8" }}
              className="hover:underline transition-opacity"
            >
              Ver todo
            </Link>
            <Link
              href={`${base}/productos/nuevo`}
              className="w-7 h-7 rounded-[8px] flex items-center justify-center transition-colors hover:opacity-80"
              style={{ background: "rgba(2,82,242,0.08)", color: "rgba(0,49,186,.8)" }}
              title="Nuevo producto"
            >
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {products.length === 0 ? (
          <div
            className="bg-white flex flex-col items-center gap-3 py-12 text-center"
            style={{ borderRadius: "16px", border: "1px dashed rgba(0,0,0,.12)" }}
          >
            <div className="w-12 h-12 rounded-[12px] bg-gray-50 flex items-center justify-center">
              <Package className="w-5 h-5" style={{ color: "#838383" }} />
            </div>
            <div className="space-y-1">
              <p style={{ fontSize: "15px", fontWeight: 600, color: "#202020", lineHeight: "21px" }}>
                Sin productos todavía
              </p>
              <p style={{ fontSize: "15px", fontWeight: 400, color: "#646464", lineHeight: "21px", letterSpacing: "-0.084px" }}>
                Crea tu primer producto para que tus miembros puedan acceder.
              </p>
            </div>
            <Link
              href={`${base}/productos/nuevo`}
              className="inline-flex items-center gap-2 bg-[#345BC8] text-white rounded-full transition-opacity hover:opacity-90"
              style={{ height: "40px", padding: "0 16px", fontSize: "16px", fontWeight: 500, lineHeight: "24px" }}
            >
              <Plus className="w-4 h-4" /> Crear producto
            </Link>
          </div>
        ) : (
          <div className="flex flex-row overflow-x-auto scrollbar-hide pb-1" style={{ gap: "12px" }}>
            {products.map((product) => (
              <HomeProductCard key={product.id} product={product} base={base} />
            ))}
          </div>
        )}
      </section>

      {/* ── Composer ───────────────────────────────────────────────── */}
      <section
        className="bg-white"
        style={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,.08)", padding: "16px" }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 select-none"
            style={{ fontSize: "14px", fontWeight: 700 }}
          >
            <span className="text-brand-700">{initial}</span>
          </div>
          <div
            className="flex-1 cursor-pointer transition-colors hover:opacity-80"
            style={{
              background: "#F5F5F5",
              borderRadius: "9999px",
              padding: "9px 16px",
              fontSize: "15px",
              fontWeight: 400,
              lineHeight: "21px",
              color: "#838383",
            }}
          >
            ¿En qué estás pensando?
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {POST_ICONS.map(({ Icon, title }) => (
              <button
                key={title}
                title={title}
                className="w-8 h-8 rounded-[8px] flex items-center justify-center transition-colors hover:bg-[rgba(0,0,0,.05)]"
                style={{ color: "#838383" }}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-full transition-opacity hover:opacity-90"
              style={{
                height: "40px",
                padding: "0 16px",
                background: "rgba(213,45,3,.10)",
                color: "rgba(202,16,0,.88)",
                fontSize: "16px",
                fontWeight: 500,
                lineHeight: "24px",
              }}
            >
              <Radio className="w-4 h-4" />
              Activar en vivo
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#345BC8] text-white transition-opacity hover:opacity-90"
              style={{ height: "40px", padding: "0 16px", fontSize: "16px", fontWeight: 500, lineHeight: "24px" }}
            >
              Publicar
            </button>
          </div>
        </div>
      </section>

      {/* ── Pinned post ─────────────────────────────────────────────── */}
      <section
        className="bg-white"
        style={{ borderRadius: "16px", border: "1px solid rgba(0,0,0,.08)", padding: "16px" }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0 select-none mt-0.5"
            style={{ fontSize: "14px", fontWeight: 700 }}
          >
            <span className="text-brand-700">{initial}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Author row */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span style={{ fontSize: "15px", fontWeight: 600, color: "#202020", lineHeight: "22px" }}>
                {businessName}
              </span>
              <span style={{ fontSize: "14px", fontWeight: 400, color: "#646464", lineHeight: "20px" }}>
                · hace 2 días
              </span>
              {/* Pinned badge — Whop blue */}
              <span
                className="inline-flex items-center gap-1"
                style={{
                  height: "24px",
                  padding: "0 8px",
                  borderRadius: "9999px",
                  background: "rgba(2,82,242,0.08)",
                  color: "rgba(0,49,186,0.8)",
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                <Pin className="w-3 h-3" /> Fijado
              </span>
            </div>

            {/* Post body */}
            <p style={{ fontSize: "15px", fontWeight: 400, lineHeight: "21px", letterSpacing: "-0.084px", color: "#202020" }}>
              ¡Bienvenido a{" "}
              <span style={{ fontWeight: 600 }}>{businessName}</span>! 🎉 Este es tu espacio
              en Mundo Academy. Comparte contenido, conecta con tus miembros y haz crecer tu
              negocio. ¡Empieza publicando tu primer post!
            </p>

            {/* Actions */}
            <div
              className="flex items-center gap-4 mt-3"
              style={{ fontSize: "14px", color: "#838383" }}
            >
              <button className="flex items-center gap-1.5 transition-colors hover:text-[#646464]">
                <Heart className="w-4 h-4" /> 0
              </button>
              <button className="flex items-center gap-1.5 transition-colors hover:text-[#646464]">
                <MessageSquare className="w-4 h-4" /> 0 comentarios
              </button>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> 1 vista
              </span>
              <button className="flex items-center gap-1.5 transition-colors hover:text-[#646464] ml-auto">
                <Share2 className="w-4 h-4" /> Compartir
              </button>
            </div>
          </div>
        </div>
      </section>

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

// ─── Products tab ─────────────────────────────────────────────────────────────

function formatPrice(product: Product): { main: string; suffix: string } {
  if (product.access_type === "free" || product.price === 0) {
    return { main: "Gratis", suffix: "" };
  }
  const symbol = product.currency === "USD" ? "$" : `${product.currency} `;
  const amount = product.price % 1 === 0
    ? product.price.toFixed(0)
    : product.price.toFixed(2);
  const suffix = BILLING_PERIOD_SUFFIX[product.billing_period] ?? "";
  return { main: `${symbol}${amount}`, suffix };
}

function ProductCard({ product, base }: { product: Product; base: string }) {
  const theme   = TYPE_THEME[product.type] ?? DEFAULT_THEME;
  const { Icon } = theme;
  const typeLabel   = TYPE_LABEL[product.type] ?? "Producto";
  const accessLabel = ACCESS_TYPE_LABELS[product.access_type] ?? product.access_type;
  const { main: priceMain, suffix: priceSuffix } = formatPrice(product);
  const isFree = product.access_type === "free" || product.price === 0;

  return (
    <Link
      href={`${base}/productos/${product.id}`}
      className="group block bg-white border border-black/[0.07] rounded-2xl overflow-hidden hover:border-black/[0.12] hover:shadow-[0_4px_24px_rgba(0,0,0,0.07)] transition-all duration-150"
    >
      {/* Cover area */}
      <div className={`relative h-[140px] ${theme.bg} flex items-center justify-center overflow-hidden`}>
        {product.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.cover_url}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            {/* Soft radial highlight */}
            <div
              className="absolute inset-0 opacity-40"
              style={{ background: "radial-gradient(circle at 65% 25%, white, transparent 65%)" }}
            />
            <Icon className={`w-12 h-12 ${theme.text} opacity-30`} />
          </>
        )}

        {/* Access type pill — always visible */}
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-white/85 backdrop-blur-sm text-[11px] font-semibold text-[#202020] shadow-sm">
          {accessLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[16px] font-bold leading-[24px] text-[#202020] truncate group-hover:text-black transition-colors">
          {product.name}
        </p>

        {product.description ? (
          <p className="mt-1 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.61)] line-clamp-2">
            {product.description}
          </p>
        ) : (
          <p className="mt-1 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.30)] italic">
            Sin descripción
          </p>
        )}

        {/* Bottom row: meta + price */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[12px] text-[rgba(0,0,0,0.45)] truncate">{typeLabel}</span>
            <span className="text-[rgba(0,0,0,0.20)] text-[12px] shrink-0">·</span>
            <StatusBadge status={product.status} />
          </div>

          <p className={`text-[16px] font-bold shrink-0 ${isFree ? "text-emerald-600" : "text-[#202020]"}`}>
            {priceMain}
            {priceSuffix && (
              <span className="text-[12px] font-normal text-[rgba(0,0,0,0.45)]">{priceSuffix}</span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}

function ProductsContent({ products, base }: { products: Product[]; base: string }) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[18px] font-bold leading-[26px] text-[#202020]">Products</h3>
          <p className="mt-1 text-[14px] font-normal leading-[20px] text-[rgba(0,0,0,0.61)] max-w-md">
            Explora los productos y ofertas disponibles de este negocio.
          </p>
        </div>
        <Link
          href={`${base}/productos/nuevo`}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#202020] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors shrink-0"
        >
          <Plus className="w-[15px] h-[15px]" />
          Crear producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-black/[0.06] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#202020]">No hay productos todavía</p>
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.61)] max-w-xs">
              Crea tu primer producto para comenzar a vender.
            </p>
          </div>
          <Link
            href={`${base}/productos/nuevo`}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-[#202020] text-white text-[13px] font-semibold hover:bg-[#333] transition-colors"
          >
            <Plus className="w-[15px] h-[15px]" />
            Crear producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} base={base} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar hint ─────────────────────────────────────────────────────────────

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
            products={products}
          />
        )}
        {activeTab === "apps" && (
          <AppsContent products={products} base={base} />
        )}
        {activeTab === "chats" && (
          <BusinessChat businessId={businessId} canWrite={true} />
        )}
        {activeTab === "productos" && (
          <ProductsContent products={products} base={base} />
        )}
        {activeTab === "acerca" && (
          <BusinessAbout businessId={businessId} />
        )}
      </div>
    </>
  );
}
