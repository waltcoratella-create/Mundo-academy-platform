import type { BreakdownItem } from "../types";

interface BreakdownCardProps {
  items: BreakdownItem[];
}

/**
 * "Desglose de pagos" card — elevated-card, 272px height.
 * When every item has no value the bar + legend are dimmed and the empty badge
 * is shown over the content (matching the reference no-data state).
 */
export function BreakdownCard({ items }: BreakdownCardProps) {
  const isEmpty = items.every((it) => it.value === null);

  return (
    <div className="elevated-card" style={{ position: "relative", height: "272px", padding: "16px", gap: "16px" }}>
      <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
        Desglose de pagos
      </span>

      <div className="stacked-bar" style={{ opacity: isEmpty ? 0.55 : 1 }}>
        {items.map((it) => (
          <div
            key={it.label}
            className="stacked-bar-segment"
            style={{ flex: `${it.percentage} 0 0`, background: isEmpty ? "var(--gray-4, #E8E8E8)" : it.color }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: isEmpty ? 0.55 : 1 }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "9999px", background: isEmpty ? "var(--gray-5, #E0E0E0)" : it.color, flexShrink: 0 }} />
              <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: isEmpty ? "var(--gray-9, #8D8D8D)" : "var(--gray-12, #202020)" }}>
                {it.label}
              </span>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
              {it.value ?? "--"}
            </span>
          </div>
        ))}
      </div>

      {isEmpty && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "20px",
            padding: "0 8px",
            borderRadius: "6px",
            background: "var(--gray-3, #EFEFEF)",
            color: "rgba(0,0,0,0.608)",
            fontSize: "12px",
            fontWeight: 500,
            lineHeight: "16px",
            whiteSpace: "nowrap",
            position: "absolute",
            top: "60%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          No hay datos disponibles
        </span>
      )}
    </div>
  );
}
