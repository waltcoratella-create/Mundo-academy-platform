import type { AdsStats } from "../ads-data";

/** Stats side card — gray-2 surface, label/value rows with hairline dividers. */
export function StatsCard({ stats }: { stats: AdsStats }) {
  return (
    <div className="ads-side-card">
      <div className="ads-side-card__title">Stats</div>
      <Row label="Cost per 1K impressions" value={stats.costPer1kImpressions} />
      <Row label="Cost per click" value={stats.costPerClick} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="ads-side-row">
      <span className="ads-side-row__label">{label}</span>
      <span className="ads-side-row__value">{value}</span>
    </div>
  );
}
