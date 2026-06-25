import type { TodayData } from "../types";
import { TodayChart } from "./TodayChart";

interface TodaySectionProps {
  today: TodayData;
}

/**
 * "Hoy" section — gross revenue + hourly chart (left) and balance panel (right).
 * Stacks vertically, switching to a row at the 896px container breakpoint.
 */
export function TodaySection({ today }: TodaySectionProps) {
  return (
    <div className="today-content">
      {/* ── Left: revenue + chart ── */}
      <div className="elevated-card" style={{ padding: "16px", gap: "12px", flex: "2 1 0%", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
            Hoy
          </span>
          <span style={{ fontSize: "12px", fontWeight: 400, lineHeight: "16px", color: "var(--gray-9, #8D8D8D)" }}>
            Actualizado {today.lastUpdated}
          </span>
        </div>

        <span style={{ fontSize: "28px", fontWeight: 600, lineHeight: "36px", letterSpacing: "-0.7px", color: "var(--gray-12, #202020)" }}>
          {today.grossRevenueToday ?? "--"}
        </span>

        <TodayChart data={today.chartData} />
      </div>

      {/* ── Right: balance panel ── */}
      <div className="elevated-card" style={{ padding: "16px", gap: "12px", flex: "1 1 0%", minWidth: 0 }}>
        <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
          Saldo
        </span>

        <span style={{ fontSize: "20px", fontWeight: 600, lineHeight: "28px", letterSpacing: "-0.4125px", color: "var(--gray-12, #202020)" }}>
          {today.totalBalance}
        </span>
        <span style={{ fontSize: "12px", fontWeight: 400, lineHeight: "16px", color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
          {today.availableBalance}
        </span>

        <span className="banner-blue" role="link">
          Gasta al instante
        </span>

        {today.verifyIdentityWarning && (
          <>
            <div className="separator" />
            <span style={{ fontSize: "12px", fontWeight: 400, lineHeight: "16px", color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
              Verifica tu identidad para recibir pagos.
            </span>
          </>
        )}
      </div>
    </div>
  );
}
