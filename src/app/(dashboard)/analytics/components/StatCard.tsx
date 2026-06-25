"use client";

import type { StatCardData } from "../types";
import { WhopIconButton } from "./WhopIcon";
import { ChartWidget } from "./ChartWidget";

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

      <span
        style={{
          display: "block",
          fontSize: "20px",
          fontWeight: 600,
          lineHeight: "28px",
          letterSpacing: "-0.4125px",
          color: "var(--gray-12, #202020)",
        }}
      >
        {data.value ?? "--"}
      </span>

      <ChartWidget data={data.chartData} startLabel={data.startLabel} endLabel={data.endLabel} />
    </div>
  );
}
