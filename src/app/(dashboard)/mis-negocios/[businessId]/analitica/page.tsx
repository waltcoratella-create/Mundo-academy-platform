import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById } from "@/lib/supabase/queries";
import "./analytics.css";
import { getAnalyticsData } from "./data";
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

  const { today, stats, breakdown, filter } = await getAnalyticsData({
    businessId: business.id,
    range: "7d",
    comparison: "previous",
    granularity: "daily",
    productId: null,
  });

  return (
    <div className="analytics-page">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
        <TodaySection today={today} />

        {today.verifyIdentityWarning && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", borderRadius: "12px", background: "var(--gray-2, #F9F9F9)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M12 3 2 20h20L12 3z" stroke="#B7791F" strokeWidth="2" strokeLinejoin="round" />
              <path d="M12 10v4M12 17h.01" stroke="#B7791F" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 400, lineHeight: "20px", color: "var(--gray-12, #202020)" }}>
              <span style={{ color: "#B7791F", fontWeight: 500 }}>Verifica tu identidad</span> para seguir recibiendo pagos y para retirar.
            </span>
          </div>
        )}

        <section>
          <h2 style={{ fontSize: "28px", fontWeight: 700, lineHeight: "36px", letterSpacing: "-0.025em", color: "var(--gray-12, #202020)" }}>
            Stats
          </h2>
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <FilterBar filter={filter} />
            <StatGrid stats={stats} breakdown={breakdown} />
          </div>
        </section>
      </div>
    </div>
  );
}
