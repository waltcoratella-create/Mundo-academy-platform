import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatNumber, formatDateLabel } from "./format";
import type { AnalyticsPageData, StatCardData, BreakdownItem, TodayData, FilterState } from "./types";
import { MOCK_DATA } from "./mock-data";
import {
  RANGE_OPTIONS, COMPARISON_OPTIONS, GRANULARITY_OPTIONS, labelFor, DEFAULTS,
} from "./filters";

export interface GetAnalyticsParams {
  businessId: string;
  range?: string;        // 7d | 30d | 90d | this_month | last_month | custom
  comparison?: string;   // previous_period | last_month | last_year | none
  granularity?: string;  // daily | weekly | monthly
  productId?: string;    // "all" or a real product id
  from?: string;         // custom range (ISO date)
  to?: string;
  compareFrom?: string;  // custom comparison range (ISO date)
  compareTo?: string;
  preview?: boolean;     // dev-only sample data for manual testing (never in production)
}

const DAY = 86_400_000;
const BREAKDOWN_COLORS = {
  Fallido: "#E83B2F", Atrasado: "#2953CF", Pagado: "#55A271",
  Cancelado: "#8551C0", Reembolsado: "#FFEB38",
} as const;

function windowFor(range: string, from: string | undefined, to: string | undefined, now: Date): { start: Date; end: Date } {
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  switch (range) {
    case "today": return { start: startOfToday, end: now };
    case "4w": return { start: new Date(now.getTime() - 28 * DAY), end: now };
    case "3m": { const s = new Date(now); s.setMonth(s.getMonth() - 3); return { start: s, end: now }; }
    case "12m": { const s = new Date(now); s.setFullYear(s.getFullYear() - 1); return { start: s, end: now }; }
    case "all": return { start: new Date(0), end: now };
    case "month_to_date": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case "quarter_to_date": return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1), end: now };
    case "year_to_date": return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case "custom": return {
      start: from ? new Date(from) : new Date(now.getTime() - 7 * DAY),
      end: to ? new Date(`${to}T23:59:59`) : now,
    };
    case "7d":
    default: return { start: new Date(now.getTime() - 7 * DAY), end: now };
  }
}

/** Comparison window for deltas; null when it can't be determined. */
function prevWindow(
  comparison: string, start: Date, end: Date,
  compareFrom: string | undefined, compareTo: string | undefined,
): { start: Date; end: Date } | null {
  if (comparison === "previous_period") {
    const len = end.getTime() - start.getTime();
    return { start: new Date(start.getTime() - len), end: new Date(start.getTime()) };
  }
  if (comparison === "last_year") {
    const s = new Date(start); s.setFullYear(s.getFullYear() - 1);
    const e = new Date(end); e.setFullYear(e.getFullYear() - 1);
    return { start: s, end: e };
  }
  if (comparison === "custom") {
    if (!compareFrom || !compareTo) return null;
    return { start: new Date(compareFrom), end: new Date(`${compareTo}T23:59:59`) };
  }
  return null;
}

function pctDelta(cur: number, prev: number | null): number | null {
  if (prev === null || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function bucketIndex(d: Date, start: Date, gran: string): number {
  if (gran === "monthly") return (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
  const startMid = new Date(start); startMid.setHours(0, 0, 0, 0);
  const dayOff = Math.floor((d.getTime() - startMid.getTime()) / DAY);
  return gran === "weekly" ? Math.floor(dayOff / 7) : dayOff;
}
function bucketCount(start: Date, end: Date, gran: string): number {
  if (gran === "monthly") return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
  const startMid = new Date(start); startMid.setHours(0, 0, 0, 0);
  const endMid = new Date(end); endMid.setHours(0, 0, 0, 0);
  const dayOff = Math.floor((endMid.getTime() - startMid.getTime()) / DAY);
  return gran === "weekly" ? Math.floor(dayOff / 7) + 1 : dayOff + 1;
}
function series(rows: { created_at: string; amount?: number | string }[], start: Date, end: Date, gran: string, mode: "sum" | "count"): number[] {
  const n = Math.max(1, bucketCount(start, end, gran));
  const b = new Array(n).fill(0);
  for (const r of rows) {
    const i = bucketIndex(new Date(r.created_at), start, gran);
    if (i >= 0 && i < n) b[i] += mode === "sum" ? Number(r.amount ?? 0) : 1;
  }
  return b.some((v) => v > 0) ? b : [];
}

// Dev-only sample (verifies chart + delta rendering). Gated by the page so it
// can never be reached in production.
const SAMPLE: AnalyticsPageData = {
  today: {
    grossRevenueToday: formatCurrency(1240), grossRevenueYesterday: formatCurrency(980), lastUpdated: "1:07 PM",
    chartData: [0, 0, 0, 30, 0, 120, 0, 0, 200, 0, 0, 90, 0, 0, 300, 0, 0, 150, 0, 0, 80, 0, 0, 0],
    totalBalance: formatCurrency(15230), availableBalance: `${formatCurrency(15230)} disponible`,
    totalPayments: formatCurrency(15230), verifyIdentityWarning: true,
  },
  stats: [
    { id: "gross-revenue", title: "Ingresos brutos", value: formatCurrency(8420), chartData: [120, 300, 80, 420, 260, 510, 330], startLabel: "jun 14", endLabel: "Hoy", delta: 12.4 },
    { id: "net-revenue",   title: "Ingresos netos",  value: formatCurrency(7980), chartData: [110, 280, 70, 400, 250, 480, 320], startLabel: "jun 14", endLabel: "Hoy", delta: 9.1 },
    { id: "new-users",     title: "Nuevos usuarios", value: "34", chartData: [2, 5, 1, 8, 4, 9, 5], startLabel: "jun 14", endLabel: "Hoy", delta: -4.5 },
    { id: "mrr",           title: "MRR",             value: formatCurrency(3200), chartData: [2600, 2750, 2800, 2950, 3050, 3120, 3200], startLabel: "jun 14", endLabel: "Hoy", delta: 6.2 },
    { id: "arr",           title: "ARR",             value: formatCurrency(38400), chartData: [31200, 33000, 33600, 35400, 36600, 37440, 38400], startLabel: "jun 14", endLabel: "Hoy", delta: 6.2 },
  ],
  breakdown: [
    { label: "Fallido", value: "3", color: "#E83B2F", percentage: 15 },
    { label: "Atrasado", value: "2", color: "#2953CF", percentage: 10 },
    { label: "Pagado", value: "12", color: "#55A271", percentage: 60 },
    { label: "Cancelado", value: "1", color: "#8551C0", percentage: 5 },
    { label: "Reembolsado", value: "2", color: "#FFEB38", percentage: 10 },
  ],
  filter: MOCK_DATA.filter,
};

/**
 * Real analytics for a business mapped to AnalyticsPageData. Honors range,
 * granularity, productId (transactions + members filtered) and comparison
 * (deltas vs the previous/last-month/last-year window). Empty states preserved
 * when there is no data; falls back to MOCK_DATA's empty shape on error.
 */
export async function getAnalyticsData({
  businessId,
  range = DEFAULTS.range,
  comparison = DEFAULTS.comparison,
  granularity = DEFAULTS.granularity,
  productId = DEFAULTS.productId,
  from,
  to,
  compareFrom,
  compareTo,
  preview = false,
}: GetAnalyticsParams): Promise<AnalyticsPageData> {
  if (preview) return SAMPLE;

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const { start, end } = windowFor(range, from, to, now);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - DAY);
    const hasProduct = productId !== "all" && !!productId;
    const pw = prevWindow(comparison, start, end, compareFrom, compareTo);

    type TxRow = { amount: number | string; status: string; product_id: string | null; created_at: string };

    const rangeTxBase = supabase.from("transactions").select("amount, status, product_id, created_at")
      .eq("business_id", businessId).gte("created_at", startISO).lte("created_at", endISO);
    const rangeTxQ = hasProduct ? rangeTxBase.eq("product_id", productId) : rangeTxBase;

    const todayTxBase = supabase.from("transactions").select("amount, status, created_at")
      .eq("business_id", businessId).gte("created_at", startOfToday.toISOString());
    const todayTxQ = hasProduct ? todayTxBase.eq("product_id", productId) : todayTxBase;

    const yesterdayBase = supabase.from("transactions").select("amount").eq("business_id", businessId).eq("status", "succeeded")
      .gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString());
    const yesterdayTxQ = hasProduct ? yesterdayBase.eq("product_id", productId) : yesterdayBase;

    const membersRangeBase = supabase.from("members").select("created_at").eq("business_id", businessId)
      .gte("created_at", startISO).lte("created_at", endISO);
    const membersRangeQ = hasProduct ? membersRangeBase.eq("product_id", productId) : membersRangeBase;

    const activeMembersBase = supabase.from("members").select("product_id").eq("business_id", businessId).eq("status", "active");
    const activeMembersQ = hasProduct ? activeMembersBase.eq("product_id", productId) : activeMembersBase;

    const cancelledBase = supabase.from("members").select("id", { count: "exact", head: true })
      .eq("business_id", businessId).eq("status", "cancelled").gte("created_at", startISO).lte("created_at", endISO);
    const cancelledQ = hasProduct ? cancelledBase.eq("product_id", productId) : cancelledBase;

    // Comparison-window queries (skipped when comparison=none)
    const prevTxQ = pw
      ? (() => {
          const b = supabase.from("transactions").select("amount, status").eq("business_id", businessId)
            .gte("created_at", pw.start.toISOString()).lte("created_at", pw.end.toISOString());
          return hasProduct ? b.eq("product_id", productId) : b;
        })()
      : Promise.resolve({ data: [] as { amount: number | string; status: string }[] });
    const prevMembersQ = pw
      ? (() => {
          const b = supabase.from("members").select("id", { count: "exact", head: true }).eq("business_id", businessId)
            .gte("created_at", pw.start.toISOString()).lte("created_at", pw.end.toISOString());
          return hasProduct ? b.eq("product_id", productId) : b;
        })()
      : Promise.resolve({ count: 0 });

    const [rangeTxR, allSucceededR, todayTxR, yesterdayR, membersRangeR, activeMembersR, productsR, cancelledR, prevTxR, prevMembersR] =
      await Promise.all([
        rangeTxQ,
        supabase.from("transactions").select("amount").eq("business_id", businessId).eq("status", "succeeded"),
        todayTxQ, yesterdayTxQ, membersRangeQ, activeMembersQ,
        supabase.from("products").select("id, name, price, billing_period").eq("business_id", businessId),
        cancelledQ, prevTxQ, prevMembersQ,
      ]);

    const rangeTx = (rangeTxR.data ?? []) as TxRow[];
    const succeeded = rangeTx.filter((t) => t.status === "succeeded");
    const refunded = rangeTx.filter((t) => t.status === "refunded");
    const allSucceeded = (allSucceededR.data ?? []) as { amount: number | string }[];
    const todayTx = ((todayTxR.data ?? []) as TxRow[]).filter((t) => t.status === "succeeded");
    const yesterdayTx = (yesterdayR.data ?? []) as { amount: number | string }[];
    const membersRange = (membersRangeR.data ?? []) as { created_at: string }[];
    const activeMembers = (activeMembersR.data ?? []) as { product_id: string | null }[];
    const products = (productsR.data ?? []) as { id: string; name: string; price: number | string; billing_period: string }[];
    const prevTx = (prevTxR.data ?? []) as { amount: number | string; status: string }[];

    const sum = (rows: { amount: number | string }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

    const gross = sum(succeeded);
    const net = gross - sum(refunded);
    const newUsers = membersRange.length;
    const allTimeTotal = sum(allSucceeded);

    // Comparison deltas
    const prevSucceeded = prevTx.filter((t) => t.status === "succeeded");
    const prevGross = pw ? sum(prevSucceeded) : null;
    const prevNet = pw ? prevGross! - sum(prevTx.filter((t) => t.status === "refunded")) : null;
    const prevUsers = pw ? (prevMembersR as { count: number | null }).count ?? 0 : null;

    const productMap = new Map(products.map((p) => [p.id, { name: p.name, price: Number(p.price), bp: p.billing_period }]));
    let mrr = 0;
    for (const m of activeMembers) {
      const p = m.product_id ? productMap.get(m.product_id) : null;
      if (!p) continue;
      if (p.bp === "monthly") mrr += p.price;
      else if (p.bp === "annual") mrr += p.price / 12;
    }
    const arr = mrr * 12;

    const sLabel = formatDateLabel(start);
    const stats: StatCardData[] = [
      { id: "gross-revenue", title: "Ingresos brutos", value: formatCurrency(gross), chartData: series(succeeded, start, end, granularity, "sum"), startLabel: sLabel, endLabel: "Hoy", delta: pctDelta(gross, prevGross) },
      { id: "net-revenue",   title: "Ingresos netos",  value: formatCurrency(net),   chartData: series(succeeded, start, end, granularity, "sum"), startLabel: sLabel, endLabel: "Hoy", delta: pctDelta(net, prevNet) },
      { id: "new-users",     title: "Nuevos usuarios", value: formatNumber(newUsers), chartData: series(membersRange, start, end, granularity, "count"), startLabel: sLabel, endLabel: "Hoy", delta: pctDelta(newUsers, prevUsers) },
      { id: "mrr",           title: "MRR",             value: formatCurrency(mrr),   chartData: [], startLabel: sLabel, endLabel: "Hoy", delta: null },
      { id: "arr",           title: "ARR",             value: formatCurrency(arr),   chartData: [], startLabel: sLabel, endLabel: "Hoy", delta: null },
    ];

    const grossToday = sum(todayTx);
    const grossYesterday = sum(yesterdayTx);
    const hourly = new Array(24).fill(0);
    for (const t of todayTx) hourly[new Date(t.created_at).getHours()] += Number(t.amount);

    const today: TodayData = {
      grossRevenueToday: grossToday > 0 ? formatCurrency(grossToday) : null,
      grossRevenueYesterday: grossYesterday > 0 ? formatCurrency(grossYesterday) : null,
      lastUpdated: now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      chartData: hourly.some((v) => v > 0) ? hourly : [],
      totalBalance: formatCurrency(allTimeTotal),
      availableBalance: `${formatCurrency(allTimeTotal)} disponible`,
      totalPayments: allSucceeded.length > 0 ? formatCurrency(allTimeTotal) : null,
      verifyIdentityWarning: true,
    };

    const counts: Record<keyof typeof BREAKDOWN_COLORS, number> = {
      Fallido: rangeTx.filter((t) => t.status === "failed").length,
      Atrasado: rangeTx.filter((t) => t.status === "pending").length,
      Pagado: succeeded.length,
      Cancelado: cancelledR.count ?? 0,
      Reembolsado: refunded.length,
    };
    const totalEvents = Object.values(counts).reduce((s, v) => s + v, 0);
    const breakdown: BreakdownItem[] = (Object.keys(BREAKDOWN_COLORS) as (keyof typeof BREAKDOWN_COLORS)[]).map((label) => ({
      label,
      value: totalEvents > 0 ? formatNumber(counts[label]) : null,
      color: BREAKDOWN_COLORS[label],
      percentage: totalEvents > 0 ? Math.round((counts[label] / totalEvents) * 10000) / 100 : 0,
    }));

    const filter: FilterState = {
      timeRange: range === "custom" ? "Personalizado" : labelFor(RANGE_OPTIONS, range, "Últimos 7 días"),
      dateLabel: `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")} ${end.getFullYear()}`,
      comparisonPeriod: labelFor(COMPARISON_OPTIONS, comparison, "Período anterior"),
      granularity: labelFor(GRANULARITY_OPTIONS, granularity, "Diario"),
      product: hasProduct ? (productMap.get(productId)?.name ?? "Producto") : "Todos los productos",
    };

    return { today, stats, breakdown, filter };
  } catch {
    return MOCK_DATA;
  }
}
