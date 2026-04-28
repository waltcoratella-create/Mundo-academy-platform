"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

const SAMPLE_REVENUE = [
  { month: "Oct", revenue: 1200 },
  { month: "Nov", revenue: 1900 },
  { month: "Dic", revenue: 2400 },
  { month: "Ene", revenue: 2100 },
  { month: "Feb", revenue: 3200 },
  { month: "Mar", revenue: 3800 },
  { month: "Abr", revenue: 4820 },
];

const SAMPLE_MEMBERS = [
  { day: "L", new: 4 },
  { day: "M", new: 7 },
  { day: "X", new: 3 },
  { day: "J", new: 9 },
  { day: "V", new: 12 },
  { day: "S", new: 5 },
  { day: "D", new: 2 },
];

export function RevenueChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">Ingresos — últimos 7 meses</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={SAMPLE_REVENUE}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Ingresos"]} />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#3b5bdb"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NewMembersChart() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <p className="text-sm font-medium text-gray-500 mb-4">Nuevos miembros esta semana</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={SAMPLE_MEMBERS}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [v, "Nuevos miembros"]} />
          <Bar dataKey="new" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
