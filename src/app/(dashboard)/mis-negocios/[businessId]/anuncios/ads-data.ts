// Ads dashboard data contracts + mock fixtures.
//
// This mirrors what a Meta Ads integration would eventually return. Nothing here
// talks to Meta yet — the page renders from `getAdsData` (mock) so the interfaces
// are the seam we swap the real source into later. Money/percentages arrive
// pre-formatted as strings so the presentation layer never guesses a locale.

export type AdPlatform = "meta" | "google" | "tiktok";
export type AdDelivery = "draft" | "active" | "paused" | "in_review";

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

/**
 * Mock source. Matches the reference screenshot: one Meta "campaña Sales"
 * campaign in Borrador, everything at zero, billing not configured.
 */
export function getAdsData(_businessId: string): AdsData {
  const now = Date.UTC(2026, 6, 7); // Jul 7 2026
  const day = 86_400_000;
  const series: SpendPoint[] = Array.from({ length: 14 }, (_, i) => ({
    t: now - (13 - i) * day,
    value: 0,
  }));

  return {
    spend: { total: "0,00 US$", dateLabel: "Jul 7", series },
    stats: { costPer1kImpressions: "0,00 US$", costPerClick: "0,00 US$" },
    profitability: { spend: "0,00 US$", costPerResult: null },
    billingConfigured: false,
    campaigns: [
      {
        id: "cmp_sales",
        title: "campaña Sales",
        platform: "meta",
        delivery: "draft",
        budget: "200 US$ / día",
        spend: "0,00 US$",
        results: "0 add to carts",
        costPerResult: null,
        enabled: false,
      },
    ],
  };
}
