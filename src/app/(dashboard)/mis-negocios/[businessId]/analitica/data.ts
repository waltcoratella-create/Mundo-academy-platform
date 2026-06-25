import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsPageData, StatCardData, BreakdownItem, TodayData, FilterState } from "./types";
import { MOCK_DATA } from "./mock-data";
import {
  RANGE_OPTIONS, COMPARISON_OPTIONS, GRANULARITY_OPTIONS, labelFor, DEFAULTS,
} from "./filters";

export interface GetAnalyticsParams {
  businessId: string;
  range?: string;        // 7d | 30d | 90d | this_month | last_month | custom
  comparison?: string;   // previous_period | last_month | last_year | none (label only for now)
  granularity?: string;  // daily | weekly | monthly
  productId?: string;    // "all" or a real product id
  from?: string;         // custom range (ISO date)
  to?: string;
}

const DAY = 86_400_000;
const BREAKDOWN_COLORS = {
  Fallido: "#E83B2F", Atrasado: "#2953CF", Pagado: "#55A271",
  Cancelado: "#8551C0", Reembolsado: "#FFEB38",
} as const;

function monthDay(d: Date): string {
  return `${d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")} ${d.getDate()}`;
}

function windowFor(range: string, from: string | undefined, to: string | undefined, now: Date): { start: Date; end: Date } {
  switch (range) {
    case "30d": return { start: new Date(now.getTime() - 30 * DAY), end: now };
    case "90d": return { start: new Date(now.getTime() - 90 * DAY), end: now };
    case "this_month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case "last_month": return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
    };
    case "custom": return {
      start: from ? new Date(from) : new Date(now.getTime() - 7 * DAY),
      end: to ? new Date(`${to}T23:59:59`) : now,
    };
    case "7d":
    default: return { start: new Date(now.getTime() - 7 * DAY), end: now };
  }
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

/**
 * Real analytics for a business mapped to AnalyticsPageData. Honors range,
 * granularity and productId (transactions + members are filtered). comparison
 * updates the label for now. Empty states preserved when there is no data;
 * falls back to MOCK_DATA's empty shape on error.
 */
export async function getAnalyticsData({
  businessId,
  range = DEFAULTS.range,
  comparison = DEFAULTS.comparison,
  granularity = DEFAULTS.granularity,
  productId = DEFAULTS.productId,
  from,
  to,
}: GetAnalyticsParams): Promise<AnalyticsPageData> {
  try {
    const supabase = createAdminClient();
    const now = new Date();
    const { start, end } = windowFor(range, from, to, now);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - DAY);
    const hasProduct = productId !== "all" && !!productId;

    type TxRow = { amount: number | string; status: string; product_id: string | null; created_at: string };

    const rangeTxQ = () => {
      let q = supabase.from("transactions").select("amount, status, product_id, created_at")
        .eq("business_id", businessId).gte("created_at", startISO).lte("created_at", endISO);
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };
    const todayTxQ = () => {
      let q = supabase.from("transactions").select("amount, status, created_at")
        .eq("business_id", businessId).gte("created_at", startOfToday.toISOString());
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };
    const yesterdayTxQ = () => {
      let q = supabase.from("transactions").select("amount")
        .eq("business_id", businessId).eq("status", "succeeded")
        .gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString());
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };
    const membersRangeQ = () => {
      let q = supabase.from("members").select("created_at")
        .eq("business_id", businessId).gte("created_at", startISO).lte("created_at", endISO);
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };
    const activeMembersQ = () => {
      let q = supabase.from("members").select("product_id").eq("business_id", businessId).eq("status", "active");
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };
    const cancelledQ = () => {
      let q = supabase.from("members").select("id", { count: "exact", head: true })
        .eq("business_id", businessId).eq("status", "cancelled").gte("created_at", startISO).lte("created_at", endISO);
      if (hasProduct) q = q.eq("product_id", productId);
      return q;
    };

    const [rangeTxR, allSucceededR, todayTxR, yesterdayR, membersRangeR, activeMembersR, productsR, cancelledR] =
      await Promise.all([
        rangeTxQ(),
        supabase.from("transactions").select("amount").eq("business_id", businessId).eq("status", "succeeded"),
        todayTxQ(),
        yesterdayTxQ(),
        membersRangeQ(),
        activeMembersQ(),
        supabase.from("products").select("id, name, price, billing_period").eq("business_id", businessId),
        cancelledQ(),
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

    const sum = (rows: { amount: number | string }[]) => rows.reduce((s, r) => s + Number(r.amount), 0);

    const gross = sum(succeeded);
    const net = gross - sum(refunded);
    const newUsers = membersRange.length;
    const allTimeTotal = sum(allSucceeded);

    const productMap = new Map(products.map((p) => [p.id, { name: p.name, price: Number(p.price), bp: p.billing_period }]));
    let mrr = 0;
    for (const m of activeMembers) {
      const p = m.product_id ? productMap.get(m.product_id) : null;
      if (!p) continue;
      if (p.bp === "monthly") mrr += p.price;
      else if (p.bp === "annual") mrr += p.price / 12;
    }
    const arr = mrr * 12;

    const sLabel = monthDay(start);
    const stats: StatCardData[] = [
      { id: "gross-revenue", title: "Ingresos brutos", value: formatCurrency(gross), chartData: series(succeeded, start, end, granularity, "sum"), startLabel: sLabel, endLabel: "Hoy" },
      { id: "net-revenue",   title: "Ingresos netos",  value: formatCurrency(net),   chartData: series(succeeded, start, end, granularity, "sum"), startLabel: sLabel, endLabel: "Hoy" },
      { id: "new-users",     title: "Nuevos usuarios", value: String(newUsers),      chartData: series(membersRange, start, end, granularity, "count"), startLabel: sLabel, endLabel: "Hoy" },
      { id: "mrr",           title: "MRR",             value: formatCurrency(mrr),   chartData: [], startLabel: sLabel, endLabel: "Hoy" },
      { id: "arr",           title: "ARR",             value: formatCurrency(arr),   chartData: [], startLabel: sLabel, endLabel: "Hoy" },
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
      value: totalEvents > 0 ? String(counts[label]) : null,
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
