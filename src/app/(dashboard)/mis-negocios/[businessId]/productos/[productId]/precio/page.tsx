import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, FileText, BookOpen, Lock, DollarSign, Settings, CheckCircle2,
} from "lucide-react";
import { getBusinessById, getProductById } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils";
import { PricingForm } from "./pricing-form";

const ACCESS_LABELS: Record<string, string> = {
  gratis:      "Gratis",
  pago_unico:  "Pago único",
  suscripcion: "Suscripción",
  manual:      "Invitación",
};

const DISABLED_TABS = [
  { label: "Configuración", icon: Settings },
];

export default async function PrecioPage({
  params,
  searchParams,
}: {
  params: { businessId: string; productId: string };
  searchParams: { updated?: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const product = await getProductById(params.productId, params.businessId);
  if (!product) notFound();

  const base    = `/mis-negocios/${params.businessId}/productos/${params.productId}`;
  const updated = searchParams.updated === "1";

  const accessLabel  = ACCESS_LABELS[product.access_type] ?? "Invitación";
  const isFree       = product.access_type === "gratis";
  const priceDisplay = isFree
    ? "Gratis"
    : product.price > 0
      ? formatCurrency(product.price)
      : "Sin precio";

  return (
    <div className="min-h-full bg-gray-50">
      {/* Sticky breadcrumb */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 h-11 flex items-center gap-2 text-sm">
        <Link
          href={`/mis-negocios/${params.businessId}/productos`}
          className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Productos
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={base} className="text-gray-500 hover:text-gray-700 transition-colors truncate max-w-36">
          {product.name}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium">Precio</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Precio</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {product.name} · {business.name}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400">Acceso:</span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
              {accessLabel}
            </span>
            <span className="text-xs font-bold text-gray-900">{priceDisplay}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-gray-200 mb-6">
          <Link
            href={base}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Información
          </Link>
          <Link
            href={`${base}/contenido`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Contenido
          </Link>
          <Link
            href={`${base}/acceso`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Acceso
          </Link>
          <span className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-gray-900 text-gray-900">
            <DollarSign className="w-3.5 h-3.5" />
            Precio
          </span>
          {DISABLED_TABS.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-300 cursor-not-allowed select-none"
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </span>
          ))}
        </div>

        {updated && (
          <div className="flex items-center gap-2 px-4 py-3 mb-5 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Configuración de precio guardada correctamente.
          </div>
        )}

        <PricingForm
          businessId={params.businessId}
          productId={params.productId}
          accessType={product.access_type ?? "manual"}
          initialPrice={product.price ?? 0}
          initialCurrency={product.currency ?? "USD"}
          initialBillingPeriod={product.billing_period ?? "one_time"}
        />
      </div>
    </div>
  );
}
