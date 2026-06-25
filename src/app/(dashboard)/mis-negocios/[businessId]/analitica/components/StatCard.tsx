"use client";

import type { StatCardData } from "../types";
import { WhopIconButton } from "./WhopIcon";
import { ChartWidget } from "./ChartWidget";
import { formatPercentage } from "../format";

interface StatCardProps {
  data: StatCardData;
  onShare?: (id: string) => void;
}

/**
 * Stat card — elevated-card, fixed 272px height.
 * Header (title 14/500 + 24px icon button) → value (20/600, ls -0.4125px) → chart (flex-1).
 */
export function StatCard({ data, onShare }: StatCardProps) {
  return (
    <div className="elevated-card" style={{ height: "272px", padding: "16px", gap: "4px" }}>
      <div className="flex items-center gap-1" style={{ marginTop: "-2px", marginBottom: "2px" }}>
        <span style={{ fontSize: "14px", fontWeight: 500, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
          {data.title}
        </span>
        <WhopIconButton onClick={() => onShare?.(data.id)} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span
          style={{
            fontSize: "20px",
            fontWeight: 600,
            lineHeight: "28px",
            letterSpacing: "-0.4125px",
            color: "var(--gray-12, #202020)",
          }}
        >
          {data.value ?? "--"}
        </span>
        {data.delta !== null && (
          <span style={{ fontSize: "12px", fontWeight: 500, lineHeight: "16px", color: data.delta >= 0 ? "#55A271" : "#E83B2F" }}>
            {data.delta >= 0 ? "▲" : "▼"} {formatPercentage(Math.abs(data.delta), false)}
          </span>
        )}
      </div>

      <ChartWidget data={data.chartData} startLabel={data.startLabel} endLabel={data.endLabel} />
    </div>
  );
}
