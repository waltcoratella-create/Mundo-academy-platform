import type { TodayData } from "../types";
import { TodayChart } from "./TodayChart";

interface TodaySectionProps {
  today: TodayData;
}

function CardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * "Today" section — open content (no cards): revenue + hourly chart on the left,
 * balance + payments column on the right. Matches the Whop composition.
 */
export function TodaySection({ today }: TodaySectionProps) {
  return (
    <section>
      <h2 style={{ fontSize: "28px", fontWeight: 700, lineHeight: "36px", letterSpacing: "-0.025em", color: "var(--gray-12, #202020)" }}>
        Today
      </h2>
      <div className="separator" style={{ margin: "16px 0" }} />

      <div className="today-content">
        {/* ── Left: revenue + chart ── */}
        <div style={{ flex: "2 1 0%", minWidth: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "64px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>Ingresos brutos</span>
              <span style={{ fontSize: "24px", fontWeight: 600, lineHeight: "30px", letterSpacing: "-0.5px", color: "var(--gray-9, #8D8D8D)" }}>
                {today.grossRevenueToday ?? "--"}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>Ayer</span>
              <span style={{ fontSize: "24px", fontWeight: 600, lineHeight: "30px", letterSpacing: "-0.5px", color: "var(--gray-9, #8D8D8D)" }}>
                {today.grossRevenueYesterday ?? "--"}
              </span>
            </div>
          </div>

          <span style={{ fontSize: "12px", fontWeight: 400, lineHeight: "16px", color: "var(--gray-9, #8D8D8D)" }}>
            {today.lastUpdated}
          </span>

          <TodayChart data={today.chartData} />
        </div>

        {/* ── Right: balance + payments ── */}
        <div style={{ flex: "1 1 0%", minWidth: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>Saldo total</span>
            <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--color-link-blue, rgba(0,49,186,0.797))", cursor: "pointer" }}>Ver</span>
          </div>
          <span style={{ fontSize: "24px", fontWeight: 600, lineHeight: "30px", letterSpacing: "-0.5px", color: "var(--gray-12, #202020)" }}>
            {today.totalBalance}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 400, lineHeight: "16px", color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
            {today.availableBalance}
          </span>

          <span className="banner-blue" role="link">
            <CardIcon />
            Gasta al instante con tarjetas Whop
            <span style={{ marginLeft: "auto" }}>→</span>
          </span>

          <div className="separator" style={{ margin: "10px 0" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>Pagos</span>
            <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--color-link-blue, rgba(0,49,186,0.797))", cursor: "pointer" }}>Ver</span>
          </div>
          <span style={{ fontSize: "20px", fontWeight: 600, lineHeight: "28px", color: "var(--gray-9, #8D8D8D)" }}>
            {today.totalPayments ?? "--"}
          </span>
        </div>
      </div>
    </section>
  );
}
