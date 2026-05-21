import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Receipt, Star } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart, NewMembersChart, SalesByProductChart } from "@/components/dashboard/revenue-chart";
import { getBusinessById, getBusinessAnalytics, getRecentTransactions } from "@/lib/supabase/queries";
import type { Transaction } from "@/lib/supabase/queries";
import { formatCurrency } from "@/lib/utils";

export default async function AnaliticaPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const [analytics, transactions] = await Promise.all([
    getBusinessAnalytics(business.id),
    getRecentTransactions(business.id),
  ]);

  const kpiCards = [
    {
      label: "Ingresos totales",
      value: formatCurrency(analytics.totalRevenue),
      change: 0,
      changeLabel: "histórico",
    },
    {
      label: "Ingresos (30 días)",
      value: formatCurrency(analytics.revenue30d),
      change: analytics.revenueChange,
    },
    {
      label: "Ventas (30 días)",
      value: String(analytics.sales30d),
      change: 0,
      changeLabel: `de ${analytics.totalSales} totales`,
    },
    {
      label: "Miembros activos",
      value: String(analytics.activeMembers),
      change: 0,
      changeLabel: "activos ahora",
    },
    {
      label: "Ticket promedio",
      value: analytics.avgTicket > 0 ? formatCurrency(analytics.avgTicket) : "—",
      change: 0,
      changeLabel: "por venta",
    },
    {
      label: "Productos publicados",
      value: String(analytics.publishedProducts),
      change: 0,
      changeLabel: "en catálogo",
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analítica</h1>
        <p className="text-gray-500 text-sm mt-1">{business.name} · Últimos 30 días</p>
      </div>

      {analytics.bestSellingProduct && (
        <div className="flex items-center gap-2 px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl w-fit">
          <Star className="w-4 h-4 text-brand-500 shrink-0" />
          <p className="text-sm text-brand-700">
            Producto estrella:{" "}
            <span className="font-semibold">{analytics.bestSellingProduct}</span>
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpiCards.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart data={analytics.revenueByDay} />
        <NewMembersChart data={analytics.membersByDay} />
      </div>

      {analytics.salesByProduct.length > 0 && (
        <SalesByProductChart data={analytics.salesByProduct} />
      )}

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
      <td className="px-5 py-3 font-medium text-gray-900 text-xs">{tx.user_email ?? "—"}</td>
      <td className="px-5 py-3 text-gray-600">{tx.product_name ?? "—"}</td>
      <td className="px-5 py-3 font-medium">{formatCurrency(tx.amount, tx.currency)}</td>
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
