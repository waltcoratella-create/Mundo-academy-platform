"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  FileText,
  ShoppingBag,
  CalendarDays,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { RealPostCard } from "@/components/dashboard/inicio/real-post-card";
import type { BusinessProfile, BusinessProduct } from "./actions";
import type { FeedPost } from "@/app/(dashboard)/inicio/actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

const COVER_GRADIENTS = [
  "from-slate-700 to-slate-500",
  "from-blue-800 to-indigo-600",
  "from-violet-800 to-purple-600",
  "from-emerald-700 to-teal-500",
  "from-orange-600 to-amber-400",
  "from-rose-700 to-pink-500",
  "from-cyan-700 to-sky-500",
  "from-indigo-700 to-blue-500",
];

const LOGO_COLORS = [
  "bg-blue-600",
  "bg-violet-600",
  "bg-emerald-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-indigo-600",
  "bg-amber-500",
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function coverGradient(id: string): string {
  return COVER_GRADIENTS[hashId(id) % COVER_GRADIENTS.length];
}

function logoColor(id: string): string {
  return LOGO_COLORS[(hashId(id) + 3) % LOGO_COLORS.length];
}

function bizInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10_000 ? 0 : 1) + "k";
  return String(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
  });
}

function productTypeLabel(type: string): string {
  const map: Record<string, string> = {
    curso: "Curso",
    comunidad: "Comunidad",
    membresia: "Membresía",
    mentoria: "Mentoría",
    coaching: "Coaching",
    evento: "Evento",
    template: "Plantilla",
  };
  return map[type] ?? "Producto";
}

function productTypeColor(type: string): string {
  const map: Record<string, string> = {
    curso:     "bg-blue-50 text-blue-700 border-blue-100",
    comunidad: "bg-purple-50 text-purple-700 border-purple-100",
    membresia: "bg-emerald-50 text-emerald-700 border-emerald-100",
    mentoria:  "bg-orange-50 text-orange-700 border-orange-100",
    coaching:  "bg-amber-50 text-amber-700 border-amber-100",
    evento:    "bg-pink-50 text-pink-700 border-pink-100",
    template:  "bg-slate-50 text-slate-700 border-slate-100",
  };
  return map[type] ?? "bg-gray-50 text-gray-600 border-gray-100";
}

function fmtPrice(price: number, currency: string, billingPeriod: string): string {
  if (price === 0) return "Gratis";
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
  if (billingPeriod === "monthly") return `${formatted}/mes`;
  if (billingPeriod === "yearly") return `${formatted}/año`;
  return formatted;
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = "publicaciones" | "productos" | "informacion";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CurrentUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  profile: BusinessProfile;
  posts: FeedPost[];
  products: BusinessProduct[];
  currentUser: CurrentUser | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BusinessProfileClient({
  profile,
  posts,
  products,
  currentUser,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("publicaciones");

  const cover    = coverGradient(profile.id);
  const logoBg   = logoColor(profile.id);

  const tabs: { id: Tab; label: string }[] = [
    { id: "publicaciones", label: "Publicaciones" },
    { id: "productos",     label: "Productos"     },
    { id: "informacion",   label: "Información"   },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto pb-10">

        {/* ── Header card ── */}
        <div className="bg-white border-b border-gray-200 shadow-sm">

          {/* Cover banner */}
          {profile.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.cover_url}
              alt=""
              className="w-full h-32 sm:h-40 object-cover"
            />
          ) : (
            <div className={`h-32 sm:h-40 bg-gradient-to-br ${cover}`} />
          )}

          {/* Logo + join button row */}
          <div className="px-5 sm:px-6 flex items-end justify-between -mt-10 sm:-mt-12 mb-4">
            {/* Logo */}
            <div className="ring-4 ring-white rounded-2xl shrink-0">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt={profile.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center text-white text-2xl sm:text-3xl font-bold ${logoBg}`}
                >
                  {bizInitials(profile.name)}
                </div>
              )}
            </div>

            {/* Join / Enter button (UI only — no membership logic yet) */}
            <div className="mb-1">
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all shadow-sm">
                Unirme
              </button>
            </div>
          </div>

          {/* Name, description, owner */}
          <div className="px-5 sm:px-6 pb-4 space-y-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
                {profile.name}
              </h1>
              {profile.description && (
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  {profile.description}
                </p>
              )}
              {profile.owner_name && (
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-blue-500 shrink-0" />
                  Creado por{" "}
                  {profile.owner_clerk_id ? (
                    <Link
                      href={`/u/${profile.owner_clerk_id}`}
                      className="font-medium text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                    >
                      {profile.owner_name}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-600">{profile.owner_name}</span>
                  )}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 pt-1">
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{fmtCount(profile.members_count)}</span>
                <span className="text-gray-500 text-xs">miembros</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{fmtCount(profile.posts_count)}</span>
                <span className="text-gray-500 text-xs">publicaciones</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-gray-700">
                <ShoppingBag className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{fmtCount(profile.products_count)}</span>
                <span className="text-gray-500 text-xs">productos</span>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div className="px-5 sm:px-6 border-t border-gray-100 flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 text-sm font-semibold border-b-2 transition-colors mr-4 ${
                  activeTab === tab.id
                    ? "text-gray-900 border-gray-900"
                    : "text-gray-400 border-transparent hover:text-gray-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="px-4 sm:px-0 pt-4">

          {/* Publicaciones */}
          {activeTab === "publicaciones" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-4 text-center px-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Sin publicaciones todavía
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                      Esta comunidad todavía no tiene publicaciones.
                    </p>
                  </div>
                </div>
              ) : (
                posts.map((post) => (
                  <RealPostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                  />
                ))
              )}
            </div>
          )}

          {/* Productos */}
          {activeTab === "productos" && (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 py-16 flex flex-col items-center gap-4 text-center px-8">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Sin productos todavía
                    </p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                      Esta comunidad todavía no tiene productos publicados.
                    </p>
                  </div>
                </div>
              ) : (
                products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          )}

          {/* Información */}
          {activeTab === "informacion" && (
            <InfoPanel profile={profile} />
          )}

        </div>
      </div>
    </div>
  );
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: BusinessProduct }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Type badge */}
          <span
            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2 ${productTypeColor(product.type)}`}
          >
            {productTypeLabel(product.type)}
          </span>

          {/* Name */}
          <h3 className="text-sm font-bold text-gray-900 leading-snug">
            {product.name}
          </h3>

          {/* Description */}
          {product.description && (
            <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-900">
            {fmtPrice(product.price, product.currency, product.billing_period)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── InfoPanel ─────────────────────────────────────────────────────────────────

function InfoPanel({ profile }: { profile: BusinessProfile }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

      {/* Description */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Acerca de
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed">
          {profile.description ?? "Esta comunidad no tiene descripción todavía."}
        </p>
      </div>

      <hr className="border-gray-100" />

      {/* Details list */}
      <div className="space-y-3">
        {/* Owner */}
        {profile.owner_name && (
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Creado por{" "}
              {profile.owner_clerk_id ? (
                <Link
                  href={`/u/${profile.owner_clerk_id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 hover:underline transition-colors"
                >
                  {profile.owner_name}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">{profile.owner_name}</span>
              )}
            </span>
          </div>
        )}

        {/* Creation date */}
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            Activo desde{" "}
            <span className="font-semibold text-gray-900">
              {fmtDate(profile.created_at)}
            </span>
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm text-gray-700">
          <Globe className="w-4 h-4 text-gray-400 shrink-0" />
          <span>
            <span className="font-semibold text-gray-900">
              {fmtCount(profile.members_count)}
            </span>{" "}
            miembros ·{" "}
            <span className="font-semibold text-gray-900">
              {fmtCount(profile.posts_count)}
            </span>{" "}
            publicaciones ·{" "}
            <span className="font-semibold text-gray-900">
              {fmtCount(profile.products_count)}
            </span>{" "}
            productos
          </span>
        </div>
      </div>
    </div>
  );
}
