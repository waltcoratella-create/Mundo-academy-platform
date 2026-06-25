export interface StatCardData {
  id: string;
  title: string;
  value: string | null; // null → "--"
  chartData: number[];   // [] → empty state
  startLabel: string;    // "jun 14"
  endLabel: string;      // "Hoy"
}

export interface BreakdownItem {
  label: string;
  value: string | null;
  color: string;
  percentage: number; // 0-100
}

export interface TodayData {
  grossRevenueToday: string | null;
  grossRevenueYesterday: string | null;
  lastUpdated: string;          // "1:07 PM"
  chartData: number[];          // hourly data, 25 columns
  totalBalance: string;
  availableBalance: string;
  totalPayments: string | null;
  verifyIdentityWarning: boolean;
}

export interface FilterState {
  timeRange: string;        // "Últimos 7 días"
  dateLabel: string;        // "14 - 20 jun 2026"
  comparisonPeriod: string; // "Período anterior"
  granularity: string;      // "Diario"
  product: string;          // "Todos los productos"
}

export interface AnalyticsPageData {
  today: TodayData;
  stats: StatCardData[];
  breakdown: BreakdownItem[];
  filter: FilterState;
}
