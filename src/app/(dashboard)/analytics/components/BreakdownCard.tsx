import type { BreakdownItem } from "../types";

interface BreakdownCardProps {
  items: BreakdownItem[];
}

/**
 * "Desglose de pagos" card — elevated-card, 272px height.
 * Header → stacked horizontal bar (12px) → legend list (dot + label + value).
 */
export function BreakdownCard({ items }: BreakdownCardProps) {
  return (
    <div className="elevated-card" style={{ height: "272px", padding: "16px", gap: "16px" }}>
      <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
        Desglose de pagos
      </span>

      <div className="stacked-bar">
        {items.map((it) => (
          <div
            key={it.label}
            className="stacked-bar-segment"
            style={{ flex: `${it.percentage} 0 0`, background: it.color }}
          />
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((it) => (
          <div key={it.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "9999px", background: it.color, flexShrink: 0 }} />
              <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
                {it.label}
              </span>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-a11, rgba(0,0,0,0.608))" }}>
              {it.value ?? "--"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
