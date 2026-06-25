import type { AnalyticsPageData } from "./types";

/**
 * Mock analytics data. Replace `MOCK_DATA` with a server action / Supabase /
 * API fetch later — the page only depends on the `AnalyticsPageData` shape.
 */
export const MOCK_DATA: AnalyticsPageData = {
  today: {
    grossRevenueToday: null,      // null → "--"
    grossRevenueYesterday: null,
    lastUpdated: "1:07 PM",
    chartData: [],                // empty → empty state
    totalBalance: "0,00 US$",
    availableBalance: "0,00 US$ disponible",
    totalPayments: null,
    verifyIdentityWarning: true,
  },
  filter: {
    timeRange: "Últimos 7 días",
    dateLabel: "14 - 20 jun 2026",
    comparisonPeriod: "Período anterior",
    granularity: "Diario",
    product: "Todos los productos",
  },
  stats: [
    { id: "gross-revenue", title: "Ingresos brutos", value: "0,00 US$", chartData: [], startLabel: "jun 14", endLabel: "Hoy" },
    { id: "net-revenue",   title: "Ingresos netos",  value: "0,00 US$", chartData: [], startLabel: "jun 14", endLabel: "Hoy" },
    { id: "new-users",     title: "Nuevos usuarios", value: "0",        chartData: [], startLabel: "jun 14", endLabel: "Hoy" },
    { id: "mrr",           title: "MRR",             value: "0,00 US$", chartData: [], startLabel: "jun 14", endLabel: "Hoy" },
    { id: "arr",           title: "ARR",             value: "0,00 US$", chartData: [], startLabel: "jun 14", endLabel: "Hoy" },
  ],
  breakdown: [
    { label: "Fallido",     value: null, color: "#E83B2F", percentage: 33.33 },
    { label: "Atrasado",    value: null, color: "#2953CF", percentage: 13.33 },
    { label: "Pagado",      value: null, color: "#55A271", percentage: 6.67 },
    { label: "Cancelado",   value: null, color: "#8551C0", percentage: 26.67 },
    { label: "Reembolsado", value: null, color: "#FFEB38", percentage: 20.00 },
  ],
};
