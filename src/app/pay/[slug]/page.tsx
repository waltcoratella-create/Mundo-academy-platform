import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { getPaymentLinkBySlug } from "@/lib/supabase/queries";

export default async function PayLinkPage({ params }: { params: { slug: string } }) {
  const link = await getPaymentLinkBySlug(params.slug);

  // Redirect active links straight to the existing checkout page
  if (link && link.active) {
    redirect(`/checkout/${link.product_id}`);
  }

  // Inactive or not found
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-gray-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">
            {link ? "Enlace desactivado" : "Enlace no encontrado"}
          </h1>
          <p className="text-sm text-gray-500">
            {link
              ? "Este enlace de pago ha sido desactivado por el creador."
              : "No encontramos este enlace de pago. Puede que haya sido eliminado o que la URL sea incorrecta."}
          </p>
        </div>
        <Link
          href="/descubrir"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Ver todos los productos
        </Link>
      </div>
    </div>
  );
}
