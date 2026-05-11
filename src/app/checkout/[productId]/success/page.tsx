import Link from "next/link";
import { CheckCircle2, BookOpen, ArrowRight } from "lucide-react";
import { getPublicProductById } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";

async function getBusinessName(businessId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .maybeSingle();
  return data?.name ?? "Mundo Academy";
}

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: { productId: string };
  searchParams: { session_id?: string; free?: string };
}) {
  const product = await getPublicProductById(params.productId);
  const isFree  = searchParams.free === "1";
  const productName   = product?.name ?? "producto";
  const businessName  = product ? await getBusinessName(product.business_id) : "Mundo Academy";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal top bar */}
      <header className="bg-white border-b border-gray-100 px-6 h-14 flex items-center shrink-0">
        <span className="text-sm font-bold tracking-tight text-gray-900">Mundo Academy</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isFree ? "¡Acceso activado!" : "¡Pago confirmado!"}
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              {isFree
                ? `Ya tienes acceso gratuito a "${productName}" de ${businessName}.`
                : `Tu compra de "${productName}" de ${businessName} fue exitosa. Tu acceso está activo.`
              }
            </p>

            <div className="space-y-3">
              <Link
                href="/mis-productos"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Ver mis productos
              </Link>
              <Link
                href={`/checkout/${params.productId}`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Volver al producto
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-5">
            Recibirás un correo de confirmación en breve.
          </p>
        </div>
      </main>
    </div>
  );
}
