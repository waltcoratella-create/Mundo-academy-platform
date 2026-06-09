import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Search, MoreHorizontal, MapPin, Link2, Users, Package,
  Home, MessageCircle, Puzzle, ShoppingBag, Info,
  Plus, Bell, UserPlus, Image as ImageIcon, Smile, BarChart2,
  DollarSign, Radio, Heart, MessageSquare, Eye, Share2, Pin,
} from "lucide-react";
import {
  getBusinessById,
  getBusinessSettings,
  getDashboardKPIs,
} from "@/lib/supabase/queries";

const TABS = [
  { label: "Home",      icon: Home },
  { label: "Chats",     icon: MessageCircle },
  { label: "Apps",      icon: Puzzle },
  { label: "Productos", icon: ShoppingBag },
  { label: "Acerca",    icon: Info },
];

const POST_ICONS = [
  { Icon: ImageIcon, title: "Imagen" },
  { Icon: Smile,     title: "Emoji" },
  { Icon: BarChart2, title: "Encuesta" },
  { Icon: DollarSign,title: "Monetizar" },
];

export default async function BusinessHomePage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  // Ownership check
  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  // Full settings (logo, cover, description, website)
  const settings = await getBusinessSettings(params.businessId);
  const kpis = await getDashboardKPIs(business.id);

  const initial = business.name.charAt(0).toUpperCase();
  const base = `/mis-negocios/${params.businessId}`;

  return (
    <div className="min-h-full bg-white">

      {/* ── Mini top-bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 h-11 bg-white/90 backdrop-blur-sm border-b border-black/[0.06]">
        <span className="text-sm font-semibold text-[#202020]">Inicio</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-black/[0.05] text-[rgba(0,0,0,0.50)] transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-black/[0.05] text-[rgba(0,0,0,0.50)] transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Cover ─────────────────────────────────────────────────────── */}
      <div className="relative w-full h-[220px] sm:h-[240px] md:h-[260px] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        {settings?.cover_url ? (
          <img
            src={settings.cover_url}
            alt="Portada"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </>
        )}
      </div>

      {/* ── Profile header ────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto w-full px-5">

        {/* Logo + action buttons */}
        <div className="flex items-end justify-between" style={{ marginTop: "-48px" }}>

          {/* Logo */}
          <div className="relative w-24 h-24 rounded-[24px] bg-white border border-black/[0.07] shadow-[0_4px_24px_rgba(0,0,0,0.13)] overflow-hidden flex items-center justify-center shrink-0 select-none">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={business.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[32px] font-bold text-brand-600">{initial}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pb-1">
            <button className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-xl border border-black/[0.10] bg-white text-[13px] font-semibold text-[#202020] hover:bg-gray-50 transition-colors shadow-sm">
              <UserPlus className="w-[15px] h-[15px]" />
              Agregar equipo
            </button>
            <button
              title="Agregar equipo"
              className="sm:hidden w-9 h-9 rounded-xl border border-black/[0.10] bg-white text-[#202020] hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              title="Notificaciones"
              className="w-9 h-9 rounded-xl border border-black/[0.10] bg-white text-[#202020] hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              title="Más opciones"
              className="w-9 h-9 rounded-xl border border-black/[0.10] bg-white text-[#202020] hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Business info ──────────────────────────────────────────── */}
        <div className="mt-4 mb-0">

          {/* Name */}
          <div className="flex items-center gap-2">
            <h2
              className="text-[24px] font-bold leading-[30px] tracking-[-0.705px] text-[#202020] text-left m-0 p-0 truncate"
              style={{ fontFamily: 'Inter, "Inter Fallback", -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' }}
            >
              {business.name}
            </h2>
          </div>

          {/* Description */}
          {settings?.description && (
            <p className="mt-2 text-[16px] font-normal leading-[24px] text-[rgba(0,0,0,0.61)] max-w-xl">
              {settings.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3">
            {/* Members — always visible */}
            <span className="flex items-center gap-1.5 text-[14px] text-[rgba(0,0,0,0.61)]">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                <strong className="font-semibold text-[#202020]">{kpis.memberCount}</strong>
                {" "}miembros
              </span>
            </span>

            {/* Products count */}
            {kpis.productCount > 0 && (
              <span className="flex items-center gap-1.5 text-[14px] text-[rgba(0,0,0,0.61)]">
                <Package className="w-4 h-4 shrink-0" />
                <span>
                  <strong className="font-semibold text-[#202020]">{kpis.productCount}</strong>
                  {" "}producto{kpis.productCount !== 1 ? "s" : ""}
                </span>
              </span>
            )}

            {/* Website — only if set */}
            {settings?.website && (
              <a
                href={settings.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[14px] text-[rgba(0,0,0,0.61)] hover:text-[#202020] transition-colors"
              >
                <Link2 className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[180px]">
                  {settings.website.replace(/^https?:\/\/(www\.)?/, "")}
                </span>
              </a>
            )}
          </div>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────── */}
        <div className="flex items-stretch border-b border-black/[0.08] -mx-5 px-5 mt-6 overflow-x-auto scrollbar-hide">
          {TABS.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              className={`flex items-center gap-2 px-4 h-14 text-[14px] font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
                i === 0
                  ? "border-[#202020] text-[#202020]"
                  : "border-transparent text-[rgba(0,0,0,0.50)] hover:text-[#202020] hover:border-black/[0.15]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Content ───────────────────────────────────────────────── */}
        <div className="py-6 space-y-5">

          {/* Products section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Productos</h3>
              <div className="flex items-center gap-2">
                <Link href={`${base}/productos`} className="text-xs text-brand-600 hover:underline font-medium">
                  Ver todo
                </Link>
                <Link
                  href={`${base}/productos`}
                  className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-600" />
                </Link>
              </div>
            </div>

            {kpis.productCount === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 py-10 flex flex-col items-center gap-2.5 text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-300" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Sin productos todavía</p>
                  <p className="text-xs text-gray-400 mt-0.5 max-w-xs">
                    Crea tu primer producto para que tus miembros puedan acceder a tu contenido.
                  </p>
                </div>
                <Link
                  href={`${base}/productos`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Crear producto
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                  <div className="h-24 bg-gradient-to-br from-brand-500 to-brand-700 relative">
                    <div className="absolute bottom-2 left-2">
                      <span className="bg-white/20 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                        Acceso completo
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900">Membresía {business.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Gratis · Acceso inmediato</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Community post box */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 select-none">
                {initial}
              </div>
              <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5 text-xs text-gray-400 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-100">
                ¿En qué estás pensando?
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0.5">
                {POST_ICONS.map(({ Icon, title }) => (
                  <button
                    key={title}
                    title={title}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <Radio className="w-3 h-3 text-red-500" /> Activar en vivo
                </button>
                <button className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-colors">
                  Publicar
                </button>
              </div>
            </div>
          </div>

          {/* Pinned post */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 shrink-0 select-none">
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-gray-900">{business.name}</span>
                  <span className="text-xs text-gray-400">· hace 2 días</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-medium">
                    <Pin className="w-2.5 h-2.5" /> Fijado
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  ¡Bienvenido a{" "}
                  <span className="font-semibold">{business.name}</span>! 🎉 Este es tu espacio en
                  Mundo Academy. Comparte contenido, conecta con tus miembros y haz crecer tu
                  negocio. ¡Empieza publicando tu primer post!
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                  <button className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                    <Heart className="w-3.5 h-3.5" /> 0
                  </button>
                  <button className="flex items-center gap-1 hover:text-gray-600 transition-colors">
                    <MessageSquare className="w-3.5 h-3.5" /> 0 comentarios
                  </button>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> 1 vista
                  </span>
                  <button className="flex items-center gap-1 hover:text-gray-600 transition-colors ml-auto">
                    <Share2 className="w-3.5 h-3.5" /> Compartir
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
