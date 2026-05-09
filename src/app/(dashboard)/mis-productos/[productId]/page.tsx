import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, BookOpen, AlignLeft, Video, Link2, FileType,
  Package, CheckCircle2, Lock,
} from "lucide-react";
import {
  getUserProductMembership,
  getPublicProductById,
  getProductContent,
} from "@/lib/supabase/queries";
import type { ProductContent } from "@/lib/supabase/queries";

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContentSidebarItem({
  item,
  active,
  productId,
}: {
  item: ProductContent;
  active: boolean;
  productId: string;
}) {
  const Icon      = CONTENT_ICONS[item.type]  ?? FileType;
  const typeColor = CONTENT_COLORS[item.type] ?? "bg-gray-100 text-gray-600";

  return (
    <Link
      href={`/mis-productos/${productId}?content=${item.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
        active
          ? "bg-blue-50 border-r-2 border-blue-500"
          : "hover:bg-gray-50"
      }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${typeColor}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${active ? "text-blue-700" : "text-gray-700"}`}>
          {item.title}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {CONTENT_LABELS[item.type] ?? item.type}
        </p>
      </div>
      {active && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
    </Link>
  );
}

function ContentViewer({ item }: { item: ProductContent }) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${CONTENT_COLORS[item.type] ?? "bg-gray-100 text-gray-600"}`}>
          {CONTENT_LABELS[item.type] ?? item.type}
        </span>
        <h1 className="text-2xl font-bold text-gray-900 leading-tight mt-3">{item.title}</h1>
      </div>

      <div className="border-t border-gray-100 mb-8" />

      {item.content ? (
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
          {item.content}
        </p>
      ) : (
        <div className="py-16 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
            <AlignLeft className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm text-gray-400">Este contenido aún no tiene texto.</p>
        </div>
      )}
    </div>
  );
}

function WelcomeScreen({
  productName,
  contentCount,
}: {
  productName: string;
  contentCount: number;
}) {
  return (
    <div className="max-w-3xl mx-auto px-8 py-20 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
        <span className="text-2xl font-bold text-white select-none">
          {productName.charAt(0).toUpperCase()}
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{productName}</h1>
        {contentCount > 0 ? (
          <p className="text-sm text-gray-400 mt-2">
            {contentCount} lección{contentCount !== 1 ? "es" : ""} disponible{contentCount !== 1 ? "s" : ""}.
            Selecciona una del panel izquierdo para comenzar.
          </p>
        ) : (
          <p className="text-sm text-gray-400 mt-2">
            El creador aún no ha publicado contenido para este producto.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProductViewerPage({
  params,
  searchParams,
}: {
  params: { productId: string };
  searchParams: { content?: string };
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { productId } = params;

  // Load product first — 404 if it doesn't exist at all
  const product = await getPublicProductById(productId);
  if (!product) notFound();

  // Security: validate active membership
  const membership = await getUserProductMembership(userId, productId);

  if (!membership) {
    // Paywall — no active access
    return (
      <div className="min-h-full bg-gray-50">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 h-11 flex items-center gap-2 text-sm">
          <Link
            href="/mis-productos"
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Mis productos
          </Link>
        </div>
        <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Acceso requerido</h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              No tienes acceso activo a <strong>{product.name}</strong>. Completa el proceso de compra para ver el contenido.
            </p>
            <Link
              href={`/checkout/${productId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Obtener acceso
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Membership confirmed — load content
  const contents = await getProductContent(productId);

  const activeContentId = searchParams.content ?? null;
  const activeContent   = activeContentId
    ? (contents.find((c) => c.id === activeContentId) ?? null)
    : null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left sidebar: curriculum ──────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-gray-100 bg-white flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-4 border-b border-gray-100 shrink-0">
          <Link
            href="/mis-productos"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mb-3"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Mis productos
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white select-none">
                {product.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
              <p className="text-[10px] text-gray-400">
                {contents.length} lección{contents.length !== 1 ? "es" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto">
          {contents.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Sin contenido aún</p>
            </div>
          ) : (
            <div className="py-2">
              {contents.map((item, index) => (
                <div key={item.id}>
                  <div className="px-4 pt-3 pb-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300">
                      {index + 1}
                    </p>
                  </div>
                  <ContentSidebarItem
                    item={item}
                    active={activeContentId === item.id}
                    productId={productId}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-gray-300" />
            <p className="text-[10px] text-gray-400">Acceso activo</p>
          </div>
        </div>
      </aside>

      {/* ── Main viewer ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {activeContent ? (
          <ContentViewer item={activeContent} />
        ) : (
          <WelcomeScreen
            productName={product.name}
            contentCount={contents.length}
          />
        )}
      </main>
    </div>
  );
}
