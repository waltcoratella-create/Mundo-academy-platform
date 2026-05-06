import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Briefcase, Zap, ArrowRight, AlertCircle } from "lucide-react";
import { ProGate } from "@/components/pro-gate";
import { getUserBusinesses } from "@/lib/supabase/queries";

export default function MisNegociosPage() {
  return (
    <ProGate>
      <BusinessList />
    </ProGate>
  );
}

async function BusinessList() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const businesses = await getUserBusinesses(userId);

    if (businesses.length === 0) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">Todavía no tienes un negocio</h2>
              <p className="text-gray-500 text-sm">
                Crea tu primer negocio para ver tu dashboard, ingresos y miembros aquí.
              </p>
            </div>
            <Link
              href="/crear"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4" />
              Crear mi primer negocio
            </Link>
          </div>
        </div>
      );
    }

    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mis negocios</h1>
          <Link
            href="/crear"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Zap className="w-4 h-4" />
            Crear negocio
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((business) => (
            <Link
              key={business.id}
              href={`/mis-negocios/${business.id}`}
              className="group flex items-center justify-between p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5 text-brand-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{business.name}</p>
                  <p className="text-xs text-gray-400">Ver dashboard</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    );
  } catch (err) {
    console.error("[mis-negocios] BusinessList error:", err);
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-gray-500">Error al cargar tus negocios.</p>
          <Link href="/mis-negocios" className="text-sm text-brand-500 hover:underline">
            Reintentar
          </Link>
        </div>
      </div>
    );
  }
}
