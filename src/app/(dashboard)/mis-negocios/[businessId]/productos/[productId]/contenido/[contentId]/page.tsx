import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, FileText, BookOpen, DollarSign, Lock, Settings,
  AlignLeft, Video, Link2, FileType, CheckCircle2,
} from "lucide-react";
import { getBusinessById, getProductById, getContentById } from "@/lib/supabase/queries";
import { ContentEditForm } from "./edit-form";

const CONTENT_ICONS: Record<string, React.ElementType> = {
  texto:  AlignLeft,
  video:  Video,
  enlace: Link2,
  pdf:    FileType,
};

const CONTENT_COLORS: Record<string, string> = {
  texto:  "bg-gray-100 text-gray-600",
  video:  "bg-blue-50 text-blue-600",
  enlace: "bg-green-50 text-green-600",
  pdf:    "bg-red-50 text-red-600",
};

const DISABLED_TABS = [
  { label: "Configuración", icon: Settings },
];

export default async function ContentDetailPage({
  params,
  searchParams,
}: {
  params: { businessId: string; productId: string; contentId: string };
  searchParams: { updated?: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const product = await getProductById(params.productId, params.businessId);
  if (!product) notFound();

  const item = await getContentById(params.contentId, params.productId);
  if (!item) notFound();

  const base = `/mis-negocios/${params.businessId}/productos/${params.productId}`;
  const Icon = CONTENT_ICONS[item.type] ?? FileType;
  const typeColor = CONTENT_COLORS[item.type] ?? "bg-gray-100 text-gray-600";
  const updated = searchParams.updated === "1";

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
        <Link href={base} className="text-gray-400 hover:text-gray-600 transition-colors truncate max-w-24">
          {product.name}
        </Link>
        <span className="text-gray-300">/</span>
        <Link href={`${base}/contenido`} className="text-gray-400 hover:text-gray-600 transition-colors">
          Contenido
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-700 font-medium truncate max-w-36">{item.title}</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColor}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{item.title}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{product.name} · {business.name}</p>
          </div>
        </div>

        {/* Tabs (product-level context) */}
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
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-gray-900 text-gray-900"
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
          <Link
            href={`${base}/precio`}
            className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Precio
          </Link>
          {DISABLED_TABS.map(({ label, icon: TabIcon }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 border-transparent text-gray-300 cursor-not-allowed select-none"
            >
              <TabIcon className="w-3.5 h-3.5" />
              {label}
            </span>
          ))}
        </div>

        {updated && (
          <div className="flex items-center gap-2 px-4 py-3 mb-5 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Contenido actualizado correctamente.
          </div>
        )}

        <ContentEditForm
          item={item}
          businessId={params.businessId}
          productId={params.productId}
        />
      </div>
    </div>
  );
}
