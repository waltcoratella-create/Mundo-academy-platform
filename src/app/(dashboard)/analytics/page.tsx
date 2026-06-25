import "./analytics.css";
import { MOCK_DATA } from "./mock-data";
import { FilterBar } from "./components/FilterBar";
import { TodaySection } from "./components/TodaySection";
import { StatGrid } from "./components/StatGrid";

/**
 * Analytics dashboard. Renders inside the existing Mundo Academy dashboard layout.
 * Data comes from MOCK_DATA — swap for a server action / Supabase / API fetch
 * returning `AnalyticsPageData` without touching the presentation.
 */
export default function AnalyticsPage() {
  const { today, stats, breakdown, filter } = MOCK_DATA;

  return (
    <div className="analytics-page">
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "24px" }}>
        <FilterBar filter={filter} />
        <TodaySection today={today} />
        <StatGrid stats={stats} breakdown={breakdown} />
      </div>
    </div>
  );
}
