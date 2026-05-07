import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, FileText, BookOpen, DollarSign, Lock, Settings,
  Plus, GripVertical, AlignLeft, Video, Link2, FileType,
  ChevronRight, Layers,
} from "lucide-react";
import { getBusinessById, getProductById, getProductContent } from "@/lib/supabase/queries";
import type { ProductContent } from "@/lib/supabase/queries";

const CONTENT_ICONS: Record<string, React.ElementType> = {
  texto:  AlignLeft,
  video:  Video,
  enlace: Link2,
  pdf:    FileType,
};

const CONTENT_LABELS: Record<string, string> = {
  texto:  "Texto",
  video:  "Video",
  enlace: "Enlace",
  pdf:    "PDF",
};

const CONTENT_COLORS: Record<string, string> = {
  texto:  "bg-gray-100 text-gray-600",
  video:  "bg-blue-50 text-blue-600",
  enlace: "bg-green-50 text-green-600",
  pdf:    "bg-red-50 text-red-600",
};

const DISABLED_TABS = [
  { label: "Precio", icon: DollarSign },
  { label: "Acceso", icon: Lock },
  { label: "Configuración", icon: Settings },
];

function ContentItem({ item, href }: { item: ProductContent; href: string }) {
  const Icon       = CONTENT_ICONS[item.type]  ?? FileType;
  const typeLabel  = CONTENT_LABELS[item.type] ?? item.type;
  const typeColor  = CONTENT_COLORS[item.type] ?? "bg-gray-100 text-gray-600";

  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors group">
      <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab" />
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
        {item.content && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{item.content}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
          {typeLabel}
        </span>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
      </div>
    </Link>
  );
}

export default async function ContenidoPage({
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

  const contents = await getProductContent(params.productId);
  const base = `/mis-negocios/${params.businessId}/productos/${params.productId}`;

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
        <span className="text-gray-700 font-medium">Contenido</span>
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-6 pb-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">Contenido</h1>
          <p className="text-sm text-gray-500 mt-0.5">{product.name} · {business.name}</p>
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
          <span className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-gray-900 text-gray-900">
            <BookOpen className="w-3.5 h-3.5" />
            Contenido
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

        {/* Content list header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-900">
            {contents.length > 0
              ? `${contents.length} elemento${contents.length !== 1 ? "s" : ""}`
              : "Módulos y lecciones"}
          </p>
          <Link
            href={`${base}/contenido/nuevo`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo contenido
          </Link>
        </div>

        {contents.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-20 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Layers className="w-7 h-7 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Aún no hay contenido</p>
              <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                Añade lecciones, videos, PDFs y más para estructurar tu producto y guiar a tus miembros.
              </p>
            </div>
            <Link
              href={`${base}/contenido/nuevo`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primer contenido
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
            {contents.map((item) => (
              <ContentItem key={item.id} item={item} href={`${base}/contenido/${item.id}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
