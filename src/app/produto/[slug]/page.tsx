import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronLeft, BookOpen, Users, FileText, Zap, Calendar, Globe,
  CheckCircle2, ShoppingCart, Gift, Lock, AlignLeft, Package,
} from "lucide-react";
import { getPublicProductFull } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils";
import {
  ACCESS_TYPE_LABELS,
  ACCESS_TYPE_DESCRIPTIONS,
  BILLING_PERIOD_SUFFIX,
} from "@/lib/constants/products";

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getPublicProductFull(params.slug);
  if (!product) return { title: "Producto no encontrado — Mundo Academy" };

  const description =
    product.description ??
    `${product.name} por ${product.business_name} en Mundo Academy`;

  return {
    title: `${product.name} — Mundo Academy`,
    description,
    openGraph: {
      title: product.name,
      description,
      type: "website",
      siteName: "Mundo Academy",
    },
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

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

const TYPE_ICONS: Record<string, React.ElementType> = {
  curso:     BookOpen,
  comunidad: Users,
  ebook:     FileText,
  mentoria:  Zap,
  evento:    Calendar,
  servicio:  Globe,
};

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PublicProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getPublicProductFull(params.slug);
  if (!product) notFound();

  const typeLabel  = TYPE_LABELS[product.type]    ?? product.type;
  const TypeIcon   = TYPE_ICONS[product.type]     ?? Package;
  const gradient   = TYPE_GRADIENTS[product.type] ?? "from-gray-500 to-gray-700";
  const isFree     = product.access_type === "free";
  const accessLabel = ACCESS_TYPE_LABELS[product.access_type] ?? product.access_type;
  const accessDesc  = ACCESS_TYPE_DESCRIPTIONS[product.access_type] ?? "";
  const billingSuffix = BILLING_PERIOD_SUFFIX[product.billing_period] ?? "";

  const priceDisplay = isFree
    ? "Gratis"
    : `${formatCurrency(product.price, product.currency)}${billingSuffix ? ` ${billingSuffix}` : ""}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-gray-900"
        >
          🌍 Mundo Academy
        </Link>
        <Link
          href="/descubrir"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Explorar productos
        </Link>
      </header>

      {/* Hero banner */}
      <div className={`bg-gradient-to-br ${gradient} relative`}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-14 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
            <TypeIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
              {typeLabel}
            </span>
            <h1 className="text-3xl font-bold text-white mt-2 leading-tight">{product.name}</h1>
            <p className="text-white/70 text-sm mt-1">por {product.business_name}</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column: details ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Description */}
            {product.description && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
                  Sobre este producto
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}

            {/* Includes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Qué incluye
              </h2>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <AlignLeft className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {product.content_count > 0
                        ? `${product.content_count} lección${product.content_count !== 1 ? "es" : ""}`
                        : "Contenido disponible tras el acceso"}
                    </p>
                    <p className="text-xs text-gray-400">Acceso completo al material</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{accessLabel}</p>
                    <p className="text-xs text-gray-400">{accessDesc}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Creator */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
                Creado por
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                  <span className="text-sm font-bold text-white select-none">
                    {product.business_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{product.business_name}</p>
                  <p className="text-xs text-gray-400">Creador en Mundo Academy</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column: pricing card (sticky) ──────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:sticky lg:top-6 space-y-5">
              {/* Price */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                  Precio
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold ${isFree ? "text-green-600" : "text-gray-900"}`}>
                    {priceDisplay}
                  </span>
                </div>
                {!isFree && (
                  <p className="text-xs text-gray-400 mt-1">{accessDesc}</p>
                )}
              </div>

              {/* Access type badge */}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <p className="text-xs text-gray-600">{accessLabel}</p>
              </div>

              {/* CTA */}
              <Link
                href={`/checkout/${product.id}`}
                className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors ${
                  isFree
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-gray-900 hover:bg-gray-800 text-white"
                }`}
              >
                {isFree
                  ? <><Gift className="w-4 h-4" />Obtener acceso gratis</>
                  : <><ShoppingCart className="w-4 h-4" />Comprar ahora</>
                }
              </Link>

              <p className="text-[10px] text-center text-gray-400">
                Pago seguro · Acceso inmediato
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Mundo Academy · Todos los derechos reservados
        </p>
      </footer>
    </div>
  );
}
