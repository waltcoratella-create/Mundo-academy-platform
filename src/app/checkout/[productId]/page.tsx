import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Shield, BookOpen, Users, FileText,
  Zap, Calendar, Globe, Lock,
} from "lucide-react";
import { getPublicProductById } from "@/lib/supabase/queries";
import { getBusinessById } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { CheckoutButton } from "./checkout-button";

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

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-blue-700",
  comunidad: "from-purple-500 to-purple-700",
  ebook:     "from-green-500 to-green-700",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-red-500 to-red-700",
  servicio:  "from-slate-500 to-slate-700",
};

const ACCESS_LABELS: Record<string, string> = {
  free:         "Acceso gratuito",
  one_time:     "Pago único · acceso de por vida",
  subscription: "Suscripción recurrente",
  manual:       "Solo por invitación",
};

const BILLING_LABELS: Record<string, string> = {
  monthly: "/ mes",
  annual:  "/ año",
};

async function getBusinessName(businessId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();
  return data?.name ?? "Mundo Academy";
}

export default async function CheckoutPage({
  params,
}: {
  params: { productId: string };
}) {
  const product = await getPublicProductById(params.productId);
  if (!product) notFound();

  // Block access for unavailable / manual products
  if (product.status !== "published") notFound();
  if (product.access_type === "manual") notFound();

  const businessName = await getBusinessName(product.business_id);
  const typeLabel    = TYPE_LABELS[product.type] ?? product.type;
  const TypeIcon     = TYPE_ICONS[product.type] ?? BookOpen;
  const gradient     = TYPE_GRADIENTS[product.type] ?? "from-gray-500 to-gray-700";
  const isFree         = product.access_type === "free";
  const isSubscription = product.access_type === "subscription";
  const billingLabel = isSubscription ? (BILLING_LABELS[product.billing_period] ?? "") : "";
  const accessLabel  = ACCESS_LABELS[product.access_type] ?? "";

  const priceDisplay = isFree
    ? "Gratis"
    : formatCurrency(product.price, product.currency);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal top bar */}
      <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between shrink-0">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-gray-900"
        >
          Mundo Academy
        </Link>
        <Link
          href={`/mis-negocios`}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Volver
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4">
          {/* Product card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Product header */}
            <div className="p-6 pb-0">
              <div className="flex items-start gap-4 mb-5">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {typeLabel}
                    </span>
                    {isFree ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                        Gratis
                      </span>
                    ) : null}
                  </div>
                  <h1 className="text-lg font-bold text-gray-900 leading-snug">{product.name}</h1>
                  <p className="text-xs text-gray-400 mt-0.5">por {businessName}</p>
                </div>
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 leading-relaxed mb-5">
                  {product.description}
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="mx-6 border-t border-gray-50" />

            {/* Price section */}
            <div className="p-6">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                    Precio
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-bold ${isFree ? "text-green-600" : "text-gray-900"}`}>
                      {priceDisplay}
                    </span>
                    {billingLabel && (
                      <span className="text-sm text-gray-400 font-medium">{billingLabel}</span>
                    )}
                  </div>
                </div>
                {!isFree && (
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {product.currency}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{accessLabel}</p>
            </div>

            {/* CTA */}
            <div className="px-6 pb-6">
              <CheckoutButton
                productId={params.productId}
                accessType={product.access_type}
                price={product.price}
              />
            </div>
          </div>

          {/* Security badges */}
          <div className="flex items-center justify-center gap-4 px-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Shield className="w-3.5 h-3.5" />
              Pago seguro con Stripe
            </div>
            <span className="text-gray-200">·</span>
            {isFree ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                Sin tarjeta requerida
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                Encriptación SSL
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
