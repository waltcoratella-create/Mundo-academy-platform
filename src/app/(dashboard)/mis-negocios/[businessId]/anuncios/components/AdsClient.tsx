"use client";

import { useState } from "react";
import type { AdsData } from "../ads-data";
import { AdsHeader } from "./AdsHeader";
import { SpendChart } from "./SpendChart";
import { StatsCard } from "./StatsCard";
import { ProfitabilityCard } from "./ProfitabilityCard";
import { BillingBanner } from "./BillingBanner";
import { AdsTabs, type AdsTabKey } from "./AdsTabs";
import { CampaignTable } from "./CampaignTable";
import { SupportFooter } from "./SupportFooter";

const EMPTY_LABEL: Record<AdsTabKey, string> = {
  campaigns: "Aún no tienes campañas de anuncios.",
  adsets: "Aún no tienes grupos de anuncios.",
  ads: "Aún no tienes anuncios.",
};

/**
 * Client shell for the Ads dashboard. Owns the interactive state (active tab,
 * search query) and composes the presentational pieces. Data is passed in from
 * the server component (currently mock via getAdsData).
 */
export function AdsClient({
  data,
  createHref,
  chatHref,
  billingHref,
}: {
  data: AdsData;
  createHref: string;
  chatHref: string;
  billingHref?: string;
}) {
  const [tab, setTab] = useState<AdsTabKey>("campaigns");
  const [query, setQuery] = useState("");

  // Only the campaigns tab has mock rows; ad sets / ads render empty states.
  const rows = tab === "campaigns" ? data.campaigns : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }} className="analytics-container">
      <AdsHeader createHref={createHref} />

      <div className="ads-top">
        <SpendChart total={data.spend.total} dateLabel={data.spend.dateLabel} series={data.spend.series} />
        <div className="ads-side-col">
          <StatsCard stats={data.stats} />
          <ProfitabilityCard data={data.profitability} />
        </div>
      </div>

      {!data.billingConfigured && <BillingBanner onConfigure={billingHref} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <AdsTabs active={tab} onSelect={setTab} query={query} onQuery={setQuery} />
        <CampaignTable campaigns={rows} query={query} emptyLabel={EMPTY_LABEL[tab]} />
      </div>

      <SupportFooter chatHref={chatHref} />
    </div>
  );
}
