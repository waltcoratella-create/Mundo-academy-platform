import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { Briefcase, Zap, Receipt } from "lucide-react";
import { ProGate } from "@/components/pro-gate";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart, NewMembersChart } from "@/components/dashboard/revenue-chart";
import { getUserBusiness, getDashboardKPIs, getRecentTransactions } from "@/lib/supabase/queries";
import type { Transaction } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils";

export default function MisNegociosPage() {
  return (
    <ProGate>
      <Dashboard />
    </ProGate>
  );
}

async function Dashboard() {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getUserBusiness(userId);

  if (!business) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
            <Briefcase className="w-7 h-7 text-gray-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-gray-900">Todavía no tienes un negocio</h2>
            <p className="text-gray-500 text-sm">
              Crea tu primer negocio para ver tu dashboard, ingresos y miembros aquí.
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

  const [kpis, transactions] = await Promise.all([
    getDashboardKPIs(business.id),
    getRecentTransactions(business.id),
  ]);

  const kpiCards = [
    {
      label: "Ingresos (30 días)",
      value: formatCurrency(kpis.revenue),
      change: kpis.revenueChange,
    },
    {
      label: "Miembros activos",
      value: String(kpis.memberCount),
      change: 0,
      changeLabel: "total activos",
    },
    {
      label: "Productos",
      value: String(kpis.productCount),
      change: 0,
      changeLabel: "publicados",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Últimos 30 días</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart />
        <NewMembersChart />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Últimas transacciones</h2>
        </div>

        {transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <Receipt className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Todavía no hay transacciones.</p>
            <p className="text-xs text-gray-400">
              Aparecerán aquí cuando tus clientes realicen pagos.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Usuario", "Producto", "Importe", "Estado", "Fecha"].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TransactionRow({ tx }: { tx: Transaction }) {
  const date = new Date(tx.created_at).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-5 py-3 font-medium text-gray-900 text-xs">
        {tx.user_email ?? "—"}
      </td>
      <td className="px-5 py-3 text-gray-600">{tx.product_name ?? "—"}</td>
      <td className="px-5 py-3 font-medium">
        {formatCurrency(tx.amount, tx.currency)}
      </td>
      <td className="px-5 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            tx.status === "succeeded"
              ? "bg-green-100 text-green-700"
              : tx.status === "failed"
              ? "bg-red-100 text-red-600"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {tx.status === "succeeded"
            ? "Exitoso"
            : tx.status === "failed"
            ? "Fallido"
            : "Pendiente"}
        </span>
      </td>
      <td className="px-5 py-3 text-gray-400 text-xs">{date}</td>
    </tr>
  );
}
