import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart, NewMembersChart } from "@/components/dashboard/revenue-chart";

const KPI_DATA = [
  { label: "Ingresos",    value: "$4,820",  change: 18 },
  { label: "Miembros",    value: "312",     change: 8.3, changeLabel: "+24 este mes" },
  { label: "Conversión",  value: "3.2%",    change: 0.4 },
  { label: "Churn",       value: "1.8%",    change: -0.2, changeLabel: "vs mes anterior" },
];

const TRANSACTIONS = [
  { id: "1", user: "Ana García",      product: "Plan Pro",    amount: "$79",  status: "succeeded", date: "Hoy, 11:23" },
  { id: "2", user: "Carlos López",    product: "Curso React", amount: "$197", status: "succeeded", date: "Hoy, 09:41" },
  { id: "3", user: "María Rodríguez", product: "Plan Starter",amount: "$29",  status: "succeeded", date: "Ayer, 18:05" },
  { id: "4", user: "José Martínez",   product: "Plan Pro",    amount: "$79",  status: "failed",    date: "Ayer, 14:30" },
];

export default function MisNegociosPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Agencia Social MX — últimos 30 días</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueChart />
        <NewMembersChart />
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Últimas transacciones</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {["Usuario", "Producto", "Importe", "Estado", "Fecha"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {TRANSACTIONS.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-900">{tx.user}</td>
                <td className="px-5 py-3 text-gray-600">{tx.product}</td>
                <td className="px-5 py-3 font-medium">{tx.amount}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                    ${tx.status === "succeeded" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {tx.status === "succeeded" ? "Exitoso" : "Fallido"}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
