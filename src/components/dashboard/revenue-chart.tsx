"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";
import type { DailyRevenue, DailyMembers, ProductSales } from "@/lib/supabase/queries";

function shortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${Number(day)}/${Number(month)}`;
}

export function RevenueChart({ data }: { data: DailyRevenue[] }) {
  const isEmpty = data.every((d) => d.revenue === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">Ingresos diarios — últimos 30 días</p>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
          Sin ingresos en este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10 }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} width={45} />
            <Tooltip
              labelFormatter={(l) => shortDate(l as string)}
              formatter={(v: number) => [`$${v.toLocaleString("es-MX")}`, "Ingresos"]}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b5bdb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function NewMembersChart({ data }: { data: DailyMembers[] }) {
  const isEmpty = data.every((d) => d.new_members === 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">Nuevos miembros — últimos 30 días</p>
      {isEmpty ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
          Sin miembros nuevos en este período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 10 }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(l) => shortDate(l as string)}
              formatter={(v: number) => [v, "Nuevos miembros"]}
            />
            <Bar dataKey="new_members" fill="#3b5bdb" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function SalesByProductChart({ data }: { data: ProductSales[] }) {
  if (data.length === 0) return null;
  const maxRevenue = data[0]?.revenue ?? 1;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">Ventas por producto</p>
      <div className="space-y-3">
        {data.map((item) => {
          const pct = Math.round((item.revenue / maxRevenue) * 100);
          return (
            <div key={item.product_id}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 font-medium truncate max-w-[60%]">
                  {item.product_name}
                </span>
                <span className="text-gray-500 shrink-0 ml-2">
                  {item.sales} venta{item.sales !== 1 ? "s" : ""} · $
                  {item.revenue.toLocaleString("es-MX")}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
