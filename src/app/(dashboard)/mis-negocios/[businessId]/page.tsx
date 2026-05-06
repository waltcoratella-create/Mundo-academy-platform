import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Package, Users, BarChart2 } from "lucide-react";
import Link from "next/link";
import { getBusinessById, getDashboardKPIs } from "@/lib/supabase/queries";

export default async function BusinessHomePage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const kpis = await getDashboardKPIs(business.id);

  const initial = business.name.charAt(0).toUpperCase();

  return (
    <div className="min-h-full bg-gray-50">
      {/* Banner */}
      <div className="h-36 bg-gradient-to-r from-brand-600 to-brand-400 relative" />

      {/* Header */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="flex items-end gap-5 -mt-10 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-brand-600 shrink-0">
            {initial}
          </div>
          <div className="pb-1">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{business.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Tu espacio en Mundo Academy</p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-6 mb-8">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{kpis.memberCount}</span> miembros activos
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">{kpis.productCount}</span> productos publicados
          </div>
        </div>

        {/* Products section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Productos</h2>
            <Link
              href={`/mis-negocios/${params.businessId}/productos`}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Ver todos
            </Link>
          </div>

          {kpis.productCount === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-16 flex flex-col items-center gap-3 text-center">
              <Package className="w-9 h-9 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">Todavía no tienes productos</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Crea tu primer producto para que tus clientes puedan acceder a tu contenido.
              </p>
              <Link
                href={`/mis-negocios/${params.businessId}/productos`}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium hover:bg-brand-700 transition-colors"
              >
                <Package className="w-3.5 h-3.5" />
                Crear producto
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-10 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-gray-500">
                Tienes <span className="font-semibold text-gray-900">{kpis.productCount}</span> producto{kpis.productCount !== 1 ? "s" : ""} publicado{kpis.productCount !== 1 ? "s" : ""}.
              </p>
              <Link
                href={`/mis-negocios/${params.businessId}/productos`}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                Gestionar productos →
              </Link>
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="mb-10">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Analítica", href: `analitica`, icon: BarChart2, desc: "Ingresos y métricas" },
              { label: "Usuarios", href: `usuarios`, icon: Users, desc: "Gestiona miembros" },
              { label: "Productos", href: `productos`, icon: Package, desc: "Tu catálogo" },
            ].map(({ label, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={`/mis-negocios/${params.businessId}/${href}`}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-4 flex items-start gap-3 hover:border-brand-200 hover:shadow-md transition-all group"
              >
                <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Icon className="w-4 h-4 text-brand-600" />
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
