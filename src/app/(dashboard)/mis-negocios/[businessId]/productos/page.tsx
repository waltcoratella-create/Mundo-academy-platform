import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Package, Pencil } from "lucide-react";
import { getBusinessById, getBusinessProducts } from "@/lib/supabase/queries";
import type { Product } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  curso:     "Curso",
  comunidad: "Comunidad",
  ebook:     "Ebook",
  mentoria:  "Mentoría",
  evento:    "Evento",
  servicio:  "Servicio",
};

const TYPE_COLORS: Record<string, string> = {
  curso:     "bg-blue-50 text-blue-700",
  comunidad: "bg-purple-50 text-purple-700",
  ebook:     "bg-green-50 text-green-700",
  mentoria:  "bg-orange-50 text-orange-700",
  evento:    "bg-red-50 text-red-700",
  servicio:  "bg-gray-100 text-gray-600",
};

function ProductCard({ product, businessId }: { product: Product; businessId: string }) {
  const typeLabel = TYPE_LABELS[product.type] ?? product.type;
  const typeColor = TYPE_COLORS[product.type] ?? "bg-gray-100 text-gray-600";
  const isPublished = product.status === "published";

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Card header gradient */}
      <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700 relative px-4 pt-3">
        <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm`}>
          {typeLabel}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">{product.name}</h3>
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isPublished ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {isPublished ? "Publicado" : "Borrador"}
          </span>
        </div>

        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-900">
            {product.price === 0 ? "Gratis" : formatCurrency(product.price)}
          </span>
          <button
            disabled
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-400 cursor-not-allowed"
            title="Próximamente"
          >
            <Pencil className="w-3 h-3" />
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

export default async function ProductosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const products = await getBusinessProducts(business.id);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-500 text-sm mt-1">{business.name}</p>
        </div>
        <Link
          href={`/mis-negocios/${params.businessId}/productos/nuevo`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo producto
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 py-20 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-gray-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Todavía no tienes productos</p>
            <p className="text-xs text-gray-400 mt-1 max-w-xs">
              Crea tu primer producto para que tus miembros puedan acceder a tu contenido.
            </p>
          </div>
          <Link
            href={`/mis-negocios/${params.businessId}/productos/nuevo`}
            className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear producto
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} businessId={params.businessId} />
          ))}
        </div>
      )}
    </div>
  );
}
