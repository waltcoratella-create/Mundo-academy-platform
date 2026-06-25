import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById } from "@/lib/supabase/queries";
import "./analytics.css";
import { MOCK_DATA } from "./mock-data";
import { FilterBar } from "./components/FilterBar";
import { TodaySection } from "./components/TodaySection";
import { StatGrid } from "./components/StatGrid";

/**
 * Business analytics. Renders inside the existing business dashboard layout.
 * Auth + ownership guards are preserved; the analytics content comes from
 * MOCK_DATA — swap for a server action / Supabase fetch returning
 * `AnalyticsPageData` without touching the presentation.
 */
export default async function AnaliticaPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

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
