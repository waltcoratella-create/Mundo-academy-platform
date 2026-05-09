import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  BookOpen, Users, FileText, Zap, Calendar, Globe,
  Package, ChevronRight, Clock,
} from "lucide-react";
import { getUserProductMemberships } from "@/lib/supabase/queries";
import type { ProductMembership } from "@/lib/supabase/queries";

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

const TYPE_ICONS: Record<string, React.ElementType> = {
  curso:     BookOpen,
  comunidad: Users,
  ebook:     FileText,
  mentoria:  Zap,
  evento:    Calendar,
  servicio:  Globe,
};

function MembershipCard({ membership }: { membership: ProductMembership }) {
  const typeLabel = TYPE_LABELS[membership.product_type] ?? membership.product_type;
  const gradient  = TYPE_GRADIENTS[membership.product_type] ?? "from-gray-500 to-gray-700";
  const TypeIcon  = TYPE_ICONS[membership.product_type] ?? Package;
  const initial   = membership.product_name.charAt(0).toUpperCase();

  const joinedAt = new Date(membership.joined_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Link
      href={`/mis-productos/${membership.product_id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-lg hover:border-gray-200 transition-all duration-200"
    >
      {/* Gradient banner */}
      <div className={`h-28 bg-gradient-to-br ${gradient} relative flex items-end px-4 pb-3`}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        {/* Product initial avatar */}
        <div className="relative z-10 flex items-end justify-between w-full">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
            <span className="text-base font-bold text-white select-none">{initial}</span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-1.5">
        {/* Name */}
        <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors">
          {membership.product_name}
        </h3>

        {/* Creator */}
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <TypeIcon className="w-3 h-3 shrink-0" />
          {membership.business_name}
        </p>

        {/* Description */}
        {membership.product_description ? (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {membership.product_description}
          </p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin descripción</p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[10px] text-gray-400">
            <Clock className="w-3 h-3" />
            {joinedAt}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 group-hover:gap-1.5 transition-all">
            Entrar
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-24 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Package className="w-7 h-7 text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Aún no tienes productos</p>
        <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
          Cuando compres o te unas a un producto, aparecerá aquí para que puedas acceder a su contenido.
        </p>
      </div>
      <Link
        href="/descubrir"
        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
      >
        Explorar productos
      </Link>
    </div>
  );
}

export default async function MisProductosPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const memberships = await getUserProductMemberships(userId);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mis productos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {memberships.length > 0
            ? `${memberships.length} producto${memberships.length !== 1 ? "s" : ""} con acceso activo`
            : "Todos los productos a los que tienes acceso aparecerán aquí"}
        </p>
      </div>

      {memberships.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberships.map((m) => (
            <MembershipCard key={m.id} membership={m} />
          ))}
        </div>
      )}
    </div>
  );
}
