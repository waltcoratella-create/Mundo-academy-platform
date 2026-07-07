import type { AdsProfitability } from "../ads-data";

/** Profitability side card — same shell as StatsCard; em dash when no result. */
export function ProfitabilityCard({ data }: { data: AdsProfitability }) {
  return (
    <div className="ads-side-card">
      <div className="ads-side-card__title">Profitability</div>
      <Row label="Spend" value={data.spend} />
      <Row label="Cost per result" value={data.costPerResult ?? "—"} />
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
