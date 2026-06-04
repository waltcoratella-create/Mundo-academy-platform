import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  Briefcase,
  Users,
  Zap,
  ArrowRight,
  AlertCircle,
  Building2,
} from "lucide-react";
import { ProGate } from "@/components/pro-gate";
import {
  getUserOwnedAndJoinedBusinesses,
  type BusinessWithMeta,
} from "@/lib/supabase/queries";

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOGO_COLORS = [
  "bg-blue-600", "bg-violet-600", "bg-emerald-600", "bg-orange-500",
  "bg-pink-600",  "bg-teal-600",  "bg-indigo-600",  "bg-amber-500",
];

function logoColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return LOGO_COLORS[h % LOGO_COLORS.length];
}

function bizInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MisNegociosPage() {
  return (
    <ProGate>
      <BusinessList />
    </ProGate>
  );
}

// ── Data component ────────────────────────────────────────────────────────────

async function BusinessList() {
  try {
    const { userId } = await auth();
    if (!userId) return null;

    const { ownedBusinesses, joinedBusinesses } =
      await getUserOwnedAndJoinedBusinesses(userId);

    const hasAny = ownedBusinesses.length > 0 || joinedBusinesses.length > 0;

    // ── Full-screen empty state (no businesses at all) ──
    if (!hasAny) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-sm w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-gray-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-gray-900">
                Todavía no tienes un negocio
              </h2>
              <p className="text-gray-500 text-sm">
                Crea tu primer negocio o únete a una comunidad para verla aquí.
              </p>
            </div>
            <Link
              href="/crear"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Zap className="w-4 h-4" />
              Crear mi primer negocio
            </Link>
          </div>
        </div>
      );
    }

    // ── Main layout ──
    return (
      <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-10">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Mis negocios</h1>
          <Link
            href="/crear"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Zap className="w-4 h-4" />
            Crear negocio
          </Link>
        </div>

        {/* ── Section 1: owned ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Mis negocios
            </h2>
            {ownedBusinesses.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {ownedBusinesses.length} negocio{ownedBusinesses.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {ownedBusinesses.length === 0 ? (
            <OwnedEmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ownedBusinesses.map((biz) => (
                <OwnedBusinessCard key={biz.id} biz={biz} />
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2: joined ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400 shrink-0" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Comunidades unidas
            </h2>
            {joinedBusinesses.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {joinedBusinesses.length} comunidad{joinedBusinesses.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>

          {joinedBusinesses.length === 0 ? (
            <JoinedEmptyState />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {joinedBusinesses.map((biz) => (
                <JoinedBusinessCard key={biz.id} biz={biz} />
              ))}
            </div>
          )}
        </section>

      </div>
    );
  } catch (err) {
    console.error("[mis-negocios] BusinessList error:", err);
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-sm text-gray-500">Error al cargar tus negocios.</p>
          <Link href="/mis-negocios" className="text-sm text-brand-500 hover:underline">
            Reintentar
          </Link>
        </div>
      </div>
    );
  }
}

// ── Owned business card ───────────────────────────────────────────────────────

function OwnedBusinessCard({ biz }: { biz: BusinessWithMeta }) {
  const bg = logoColor(biz.id);
  return (
    <Link
      href={`/mis-negocios/${biz.id}`}
      className="group flex items-center justify-between p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-brand-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        {biz.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.logo_url}
            alt={biz.name}
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${bg}`}
          >
            {bizInitials(biz.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{biz.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {biz.description ?? "Administrar negocio"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        <span className="text-xs font-medium text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Administrar
        </span>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-brand-500 transition-colors" />
      </div>
    </Link>
  );
}

// ── Joined business card ──────────────────────────────────────────────────────

function JoinedBusinessCard({ biz }: { biz: BusinessWithMeta }) {
  const bg = logoColor(biz.id);
  return (
    <Link
      href={`/business/${biz.id}`}
      className="group flex items-center justify-between p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3 min-w-0">
        {biz.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={biz.logo_url}
            alt={biz.name}
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${bg}`}
          >
            {bizInitials(biz.name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{biz.name}</p>
          <p className="text-xs text-gray-400 truncate">
            {biz.description ?? "Comunidad"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-3 shrink-0">
        <span className="text-xs font-medium text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
          Entrar
        </span>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
      </div>
    </Link>
  );
}

// ── Empty states ──────────────────────────────────────────────────────────────

function OwnedEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 flex flex-col items-center gap-3 text-center px-6">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <Building2 className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Sin negocios propios</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Crea tu primer negocio para verlo aquí.
        </p>
      </div>
      <Link
        href="/crear"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition-colors"
      >
        <Zap className="w-3 h-3" />
        Crear negocio
      </Link>
    </div>
  );
}

function JoinedEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-8 flex flex-col items-center gap-3 text-center px-6">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <Users className="w-5 h-5 text-gray-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Sin comunidades unidas</p>
        <p className="text-xs text-gray-400 mt-0.5">
          Explora y únete a comunidades para verlas aquí.
        </p>
      </div>
      <Link
        href="/descubrir"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 text-gray-600 text-xs font-medium transition-colors"
      >
        Explorar comunidades
      </Link>
    </div>
  );
}
