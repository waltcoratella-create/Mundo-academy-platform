import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Search, MoreHorizontal, MapPin, Link2, Users, Package,
  Home, MessageCircle, Puzzle, ShoppingBag, Info,
  Plus, Bell, UserPlus, Image as ImageIcon, Smile, BarChart2,
  DollarSign, Radio, Heart, MessageSquare, Eye, Share2, Pin,
} from "lucide-react";
import { getBusinessById, getDashboardKPIs } from "@/lib/supabase/queries";

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

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const kpis = await getDashboardKPIs(business.id);

  const initial = business.name.charAt(0).toUpperCase();
  const base = `/mis-negocios/${params.businessId}`;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Mini top-bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 h-11 bg-white border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Inicio</span>
        <div className="flex items-center gap-1">
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Main content area */}
      <div className="max-w-3xl mx-auto w-full px-5 pb-12">

        {/* Avatar + action buttons */}
        <div className="flex items-end justify-between -mt-10 mb-5">
          <div className="w-20 h-20 rounded-2xl bg-white border-[3px] border-white shadow-lg flex items-center justify-center text-3xl font-bold text-brand-600 shrink-0 select-none">
            {initial}
          </div>
          <div className="flex items-center gap-2 pb-1">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
              <UserPlus className="w-3.5 h-3.5" />
              Agregar equipo
            </button>
            <button className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
              <Bell className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Business info */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{business.name}</h2>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed max-w-lg">
            Comparte tu conocimiento, crece tu comunidad y monetiza tu negocio desde Mundo Academy.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" /> Barcelona, ES
            </span>
            <span className="flex items-center gap-1 text-brand-600 cursor-pointer hover:underline">
              <Link2 className="w-3.5 h-3.5" /> Agregar enlaces sociales
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <strong className="font-semibold text-gray-700">{kpis.memberCount}</strong>&nbsp;miembros
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-gray-200 mb-6 -mx-1 px-1">
          {TABS.map(({ label, icon: Icon }, i) => (
            <button
              key={label}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                i === 0
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Products section */}
        <div className="mb-5">
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
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
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
  );
}
