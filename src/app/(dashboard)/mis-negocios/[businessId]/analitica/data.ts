import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsPageData, StatCardData, BreakdownItem, TodayData, FilterState } from "./types";
import { MOCK_DATA } from "./mock-data";

export interface GetAnalyticsParams {
  businessId: string;
  range?: string;        // "7d" | "30d" | "90d"
  comparison?: string;   // "previous" — visual only for now
  granularity?: string;  // "daily" — visual only for now
  productId?: string | null;
}

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const RANGE_LABEL: Record<string, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
};

const BREAKDOWN_COLORS = {
  Fallido: "#E83B2F",
  Atrasado: "#2953CF",
  Pagado: "#55A271",
  Cancelado: "#8551C0",
  Reembolsado: "#FFEB38",
} as const;

function monthDay(d: Date): string {
  return `${d.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")} ${d.getDate()}`;
}

function dailyBuckets(
  rows: { created_at: string; amount?: number | string }[],
  start: Date,
  days: number,
  mode: "sum" | "count"
): number[] {
  const buckets = new Array(days).fill(0);
  const startMid = new Date(start);
  startMid.setHours(0, 0, 0, 0);
  for (const r of rows) {
    const idx = Math.floor((new Date(r.created_at).getTime() - startMid.getTime()) / 86_400_000);
    if (idx >= 0 && idx < days) buckets[idx] += mode === "sum" ? Number(r.amount ?? 0) : 1;
  }
  return buckets.some((v) => v > 0) ? buckets : [];
}

/**
 * Real analytics for a business, mapped to the AnalyticsPageData shape used by
 * the page. Empty states are preserved (null values / empty chart arrays) when
 * there is no data. Filters (comparison / granularity) are wired structurally
 * but kept visual for this phase. On any error it falls back to MOCK_DATA's
 * (empty) shape so the page always renders.
 */
export async function getAnalyticsData({
  businessId,
  range = "7d",
  comparison = "previous",
  granularity = "daily",
  productId = null,
}: GetAnalyticsParams): Promise<AnalyticsPageData> {
  try {
    const supabase = createAdminClient();
    const days = RANGE_DAYS[range] ?? 7;
    const now = new Date();
    const start = new Date(now.getTime() - days * 86_400_000);
    const startISO = start.toISOString();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);

    type TxRow = { amount: number | string; status: string; product_id: string | null; created_at: string };

    const txInRange = () => {
      let q = supabase
        .from("transactions")
        .select("amount, status, product_id, created_at")
        .eq("business_id", businessId)
        .gte("created_at", startISO);
      if (productId) q = q.eq("product_id", productId);
      return q;
    };

    const [
      rangeTxR, allSucceededR, todayTxR, yesterdayR,
      membersRangeR, activeMembersR, productsR, cancelledR,
    ] = await Promise.all([
      txInRange(),
      supabase.from("transactions").select("amount").eq("business_id", businessId).eq("status", "succeeded"),
      supabase.from("transactions").select("amount, status, created_at").eq("business_id", businessId).gte("created_at", startOfToday.toISOString()),
      supabase.from("transactions").select("amount").eq("business_id", businessId).eq("status", "succeeded").gte("created_at", startOfYesterday.toISOString()).lt("created_at", startOfToday.toISOString()),
      supabase.from("members").select("created_at").eq("business_id", businessId).gte("created_at", startISO),
      supabase.from("members").select("product_id").eq("business_id", businessId).eq("status", "active"),
      supabase.from("products").select("id, name, price, billing_period").eq("business_id", businessId),
      supabase.from("members").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "cancelled").gte("created_at", startISO),
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

    // ── Stat values ──────────────────────────────────────────────────────────
    const gross = sum(succeeded);
    const net = gross - sum(refunded);
    const newUsers = membersRange.length;
    const allTimeTotal = sum(allSucceeded);

    const productMap = new Map(products.map((p) => [p.id, { price: Number(p.price), bp: p.billing_period }]));
    let mrr = 0;
    for (const m of activeMembers) {
      const p = m.product_id ? productMap.get(m.product_id) : null;
      if (!p) continue;
      if (p.bp === "monthly") mrr += p.price;
      else if (p.bp === "annual") mrr += p.price / 12;
    }
    const arr = mrr * 12;

    const sLabel = monthDay(start);
    const eLabel = "Hoy";
    const stats: StatCardData[] = [
      { id: "gross-revenue", title: "Ingresos brutos", value: formatCurrency(gross), chartData: dailyBuckets(succeeded, start, days, "sum"), startLabel: sLabel, endLabel: eLabel },
      { id: "net-revenue",   title: "Ingresos netos",  value: formatCurrency(net),   chartData: dailyBuckets(succeeded, start, days, "sum"), startLabel: sLabel, endLabel: eLabel },
      { id: "new-users",     title: "Nuevos usuarios", value: String(newUsers),      chartData: dailyBuckets(membersRange, start, days, "count"), startLabel: sLabel, endLabel: eLabel },
      { id: "mrr",           title: "MRR",             value: formatCurrency(mrr),   chartData: [], startLabel: sLabel, endLabel: eLabel },
      { id: "arr",           title: "ARR",             value: formatCurrency(arr),   chartData: [], startLabel: sLabel, endLabel: eLabel },
    ];

    // ── Today ────────────────────────────────────────────────────────────────
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

    // ── Breakdown (payment status) ───────────────────────────────────────────
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

    // ── Filter (labels reflect the params; controls remain visual) ───────────
    const filter: FilterState = {
      timeRange: RANGE_LABEL[range] ?? "Últimos 7 días",
      dateLabel: `${start.getDate()} - ${now.getDate()} ${now.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")} ${now.getFullYear()}`,
      comparisonPeriod: comparison === "previous" ? "Período anterior" : comparison,
      granularity: granularity === "daily" ? "Diario" : granularity,
      product: productId ? (productMap.has(productId) ? products.find((p) => p.id === productId)?.name ?? "Producto" : "Producto") : "Todos los productos",
    };

    return { today, stats, breakdown, filter };
  } catch {
    return MOCK_DATA;
  }
}
