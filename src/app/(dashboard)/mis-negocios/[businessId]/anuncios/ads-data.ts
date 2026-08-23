// Ads dashboard data contracts.
//
// Campaigns are real: they come from `ad_campaigns` (written by the builder).
// The spend/stats/profitability blocks are still zeroed placeholders because no
// ad platform is connected yet — there is no source of truth for delivery
// metrics until Meta is wired. Money arrives pre-formatted as strings so the
// presentation layer never guesses a locale.

import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignObjective } from "./create/campaign-types";

export type AdPlatform = "meta" | "google" | "tiktok";
export type AdDelivery = "draft" | "active" | "paused" | "in_review" | "archived";

export interface SpendPoint {
  /** epoch ms for the bucket (UTC) */
  t: number;
  /** raw spend for the bucket, in currency units */
  value: number;
}

export interface AdsStats {
  costPer1kImpressions: string;
  costPerClick: string;
}

export interface AdsProfitability {
  spend: string;
  /** null → render an em dash, matching Whop when there are no results yet */
  costPerResult: string | null;
}

export interface AdCampaign {
  id: string;
  title: string;
  platform: AdPlatform;
  delivery: AdDelivery;
  /** e.g. "200 US$ / día" */
  budget: string;
  /** e.g. "0,00 US$" */
  spend: string;
  /** e.g. "0 add to carts" */
  results: string;
  /** null → em dash */
  costPerResult: string | null;
  enabled: boolean;
}

export interface AdsData {
  spend: {
    total: string;
    /** short label shown next to "Spend ·", e.g. "Jul 7" */
    dateLabel: string;
    series: SpendPoint[];
  };
  stats: AdsStats;
  profitability: AdsProfitability;
  /** false → show the amber "configura la facturación" banner */
  billingConfigured: boolean;
  campaigns: AdCampaign[];
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown/invalid ISO code — fall back to a plain number + raw code.
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** Result noun depends on what the campaign optimises for. */
const RESULT_NOUN: Record<CampaignObjective, string> = {
  sales: "compras",
  leads: "leads",
  engagement: "interacciones",
  traffic: "clics",
  awareness: "impresiones",
};

function budgetLabel(amount: number | null, currency: string, type: string): string {
  if (amount == null) return "—";
  const formatted = money(amount, currency);
  return type === "lifetime" ? `${formatted} total` : `${formatted} / día`;
}

// ─── Campaigns (real) ─────────────────────────────────────────────────────────

interface CampaignRow {
  id: string;
  name: string;
  objective: string;
  status: string;
  budget_type: string;
  budget_amount: string | number | null;
  currency: string | null;
  platform: string | null;
}

const DELIVERY_VALUES: AdDelivery[] = ["draft", "active", "paused", "in_review", "archived"];

async function getCampaigns(businessId: string): Promise<AdCampaign[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select("id, name, objective, status, budget_type, budget_amount, currency, platform")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      // 42P01 = table not migrated yet → behave like "no campaigns".
      if (error.code !== "42P01") {
        console.error("[ad_campaigns] query error:", error.code, error.message);
      }
      return [];
    }

    return (data ?? []).map((raw) => {
      const row = raw as unknown as CampaignRow;
      const currency = row.currency ?? "USD";
      const amount = row.budget_amount == null ? null : Number(row.budget_amount);
      const objective = (row.objective as CampaignObjective) ?? "sales";
      const delivery = (DELIVERY_VALUES as string[]).includes(row.status)
        ? (row.status as AdDelivery)
        : "draft";

      return {
        id: row.id,
        title: row.name,
        platform: (row.platform as AdPlatform) ?? "meta",
        delivery,
        budget: budgetLabel(amount, currency, row.budget_type),
        // No ad platform connected → delivery metrics are genuinely zero.
        spend: money(0, currency),
        results: `0 ${RESULT_NOUN[objective] ?? "resultados"}`,
        costPerResult: null,
        enabled: delivery === "active",
      };
    });
  } catch {
    return [];
  }
}

// ─── Page data ────────────────────────────────────────────────────────────────

/**
 * Campaigns are read from Supabase; spend/stats stay at zero until an ad
 * platform is connected (there is no data source for them yet).
 */
export async function getAdsData(businessId: string): Promise<AdsData> {
  const campaigns = await getCampaigns(businessId);

  const now = Date.now();
  const day = 86_400_000;
  const series: SpendPoint[] = Array.from({ length: 14 }, (_, i) => ({
    t: now - (13 - i) * day,
    value: 0,
  }));

  const dateLabel = new Intl.DateTimeFormat("es-ES", { month: "short", day: "numeric" })
    .format(new Date(now));

  return {
    spend: { total: money(0, "USD"), dateLabel, series },
    stats: { costPer1kImpressions: money(0, "USD"), costPerClick: money(0, "USD") },
    profitability: { spend: money(0, "USD"), costPerResult: null },
    billingConfigured: false,
    campaigns,
  };
}
