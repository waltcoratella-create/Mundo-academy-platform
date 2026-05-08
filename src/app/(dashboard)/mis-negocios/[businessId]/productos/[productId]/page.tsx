import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, FileText, BookOpen, DollarSign, Lock, Settings,
  Calendar, Tag, Banknote,
} from "lucide-react";
import { getBusinessById, getProductById } from "@/lib/supabase/queries";
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

const DISABLED_TABS = [
  { label: "Configuración", icon: Settings },
];

export default async function ProductDetailPage({
  params,
}: {
  params: { businessId: string; productId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const product = await getProductById(params.productId, params.businessId);
  if (!product) notFound();

  const typeLabel = TYPE_LABELS[product.type] ?? product.type;
  const gradient = TYPE_GRADIENTS[product.type] ?? "from-gray-500 to-gray-700";
  const isPublished = product.status === "published";

  const createdAt = new Date(product.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-full bg-gray-50">
      {/* Sticky breadcrumb bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 h-11 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`/mis-negocios/${params.businessId}/productos`}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Productos
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-gray-700 font-medium truncate max-w-48">{product.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
            isPublished
              ? "bg-green-50 text-green-700 border-green-100"
              : "bg-amber-50 text-amber-700 border-amber-100"
          }`}>
            {isPublished ? "Publicado" : "Borrador"}
          </span>
          <button
            disabled
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-400 cursor-not-allowed"
            title="Próximamente"
          >
            Editar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 pb-12">
        {/* Product header */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
            <span className="text-2xl font-bold text-white select-none">
              {product.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{typeLabel} · {business.name}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-gray-200 mb-6">
          <span className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-gray-900 text-gray-900">
            <FileText className="w-3.5 h-3.5" />
            Información
          </span>
          <Link
            href={`/mis-negocios/${params.businessId}/productos/${params.productId}/contenido`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Contenido
          </Link>
          <Link
            href={`/mis-negocios/${params.businessId}/productos/${params.productId}/acceso`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Acceso
          </Link>
          <Link
            href={`/mis-negocios/${params.businessId}/productos/${params.productId}/precio`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Precio
          </Link>
          {DISABLED_TABS.map(({ label, icon: Icon }) => (
            <span key={label} className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-300 cursor-not-allowed select-none">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </span>
          ))}
        </div>

        {/* Información tab content */}
        <div className="space-y-4">
          {/* Name + description card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Nombre del producto
              </p>
              <p className="text-sm font-medium text-gray-900">{product.name}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Descripción
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                {product.description || <span className="text-gray-300 italic">Sin descripción</span>}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-gray-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Precio</p>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {product.price === 0 ? "Gratis" : formatCurrency(product.price)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Tipo</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{typeLabel}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${isPublished ? "bg-green-500" : "bg-amber-400"}`} />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Estado</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {isPublished ? "Publicado" : "Borrador"}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Creado</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{createdAt}</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
