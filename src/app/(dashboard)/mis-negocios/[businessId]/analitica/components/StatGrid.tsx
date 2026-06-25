import type { StatCardData, BreakdownItem } from "../types";
import { StatCard } from "./StatCard";
import { BreakdownCard } from "./BreakdownCard";

interface StatGridProps {
  stats: StatCardData[];
  breakdown: BreakdownItem[];
}

/**
 * Responsive stat grid (1 / 2 / 3 columns via container queries).
 * The breakdown card sits as the final cell, matching the reference layout.
 */
export function StatGrid({ stats, breakdown }: StatGridProps) {
  return (
    <div className="analytics-container">
      <div className="stats-grid">
        {stats.map((stat) => (
          <StatCard key={stat.id} data={stat} />
        ))}
        <BreakdownCard items={breakdown} />
      </div>
    </div>
  );
}
