import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
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

const TYPE_GRADIENTS: Record<string, string> = {
  curso:     "from-blue-500 to-blue-700",
  comunidad: "from-purple-500 to-purple-700",
  ebook:     "from-green-500 to-green-700",
  mentoria:  "from-orange-400 to-orange-600",
  evento:    "from-red-500 to-red-700",
  servicio:  "from-slate-500 to-slate-700",
};

/**
 * Returns the product's cover URL, or null to render the gradient fallback.
 * Priority: cover_url → null (component renders gradient).
 * Add thumbnail_url here as secondary fallback when that column is migrated.
 */
function getProductCover(product: Product): string | null {
  return product.cover_url ?? null;
}

function ProductCard({ product, businessId }: { product: Product; businessId: string }) {
  const typeLabel  = TYPE_LABELS[product.type] ?? product.type;
  const gradient   = TYPE_GRADIENTS[product.type] ?? "from-gray-500 to-gray-700";
  const isPublished = product.status === "published";
  const coverUrl   = getProductCover(product);

  return (
    <Link
      href={`/mis-negocios/${businessId}/productos/${product.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      {/* Banner / cover */}
      <div className="h-28 relative overflow-hidden flex items-end px-4 pb-3">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
            <div
              className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
            />
          </>
        )}
        {/* Type pill — always visible over image or gradient */}
        <span className="relative z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-sm">
          {typeLabel}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1.5">
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-brand-700 transition-colors">
            {product.name}
          </h3>
          <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
            isPublished
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}>
            {isPublished ? "Publicado" : "Borrador"}
          </span>
        </div>

        {/* Description */}
        {product.description ? (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{product.description}</p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin descripción</p>
        )}

        {/* Price */}
        <div className="mt-auto pt-2 border-t border-gray-50">
          <span className="text-sm font-bold text-gray-900">
            {product.price === 0 ? "Gratis" : formatCurrency(product.price)}
          </span>
        </div>
      </div>
    </Link>
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
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center gap-3 text-center">
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
