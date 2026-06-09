import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  Search, MoreHorizontal, Link2, Users, Package, Bell, UserPlus,
} from "lucide-react";
import {
  getBusinessById,
  getBusinessSettings,
  getBusinessProducts,
  getDashboardKPIs,
} from "@/lib/supabase/queries";
import { BusinessTabs } from "./business-tabs";

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

  // Fetch remaining data in parallel
  const [settings, kpis, products] = await Promise.all([
    getBusinessSettings(params.businessId),
    getDashboardKPIs(business.id),
    getBusinessProducts(business.id),
  ]);

  const initial = business.name.charAt(0).toUpperCase();
  const base    = `/mis-negocios/${params.businessId}`;

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
        <div className="mt-4">

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
            <span className="flex items-center gap-1.5 text-[14px] text-[rgba(0,0,0,0.61)]">
              <Users className="w-4 h-4 shrink-0" />
              <span>
                <strong className="font-semibold text-[#202020]">{kpis.memberCount}</strong>
                {" "}miembros
              </span>
            </span>

            {kpis.productCount > 0 && (
              <span className="flex items-center gap-1.5 text-[14px] text-[rgba(0,0,0,0.61)]">
                <Package className="w-4 h-4 shrink-0" />
                <span>
                  <strong className="font-semibold text-[#202020]">{kpis.productCount}</strong>
                  {" "}producto{kpis.productCount !== 1 ? "s" : ""}
                </span>
              </span>
            )}

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

        {/* ── Tabs + content (client component) ─────────────────────── */}
        <BusinessTabs
          products={products}
          kpis={kpis}
          businessId={params.businessId}
          businessName={business.name}
          initial={initial}
          base={base}
        />

      </div>
    </div>
  );
}
