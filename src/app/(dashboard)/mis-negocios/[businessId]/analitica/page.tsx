import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessProducts } from "@/lib/supabase/queries";
import "./analytics.css";
import { getAnalyticsData } from "./data";
import { validateRange, validateComparison, validateGranularity, DEFAULTS } from "./filters";
import { getAnalyticsWidgets } from "./widgets-actions";
import { TodaySection } from "./components/TodaySection";
import { StatsManager } from "./components/StatsManager";

const first = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);

/**
 * Business analytics. Renders inside the existing business dashboard layout.
 * Reads filter searchParams (validated to safe defaults) and feeds them to
 * getAnalyticsData; changing a filter updates the URL → server re-fetch.
 */
export default async function AnaliticaPage({
  params,
  searchParams,
}: {
  params: { businessId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const products = await getBusinessProducts(business.id);

  // Validate params → safe defaults
  const range = validateRange(first(searchParams.range));
  const comparison = validateComparison(first(searchParams.comparison));
  const granularity = validateGranularity(first(searchParams.granularity), range);
  const rawProduct = first(searchParams.productId);
  const productId = rawProduct && products.some((p) => p.id === rawProduct) ? rawProduct : DEFAULTS.productId;
  const from = first(searchParams.from);
  const to = first(searchParams.to);

  // Dev-only sample data for manual chart/delta testing — never reachable in production.
  const preview = process.env.NODE_ENV !== "production" && first(searchParams.preview) === "1";

  const [{ today, stats, breakdown, filter }, widgetsInitial] = await Promise.all([
    getAnalyticsData({ businessId: business.id, range, comparison, granularity, productId, from, to, preview }),
    getAnalyticsWidgets({ businessId: business.id }),
  ]);

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
            <StatsManager
              businessId={business.id}
              filter={filter}
              selected={{ range, comparison, granularity, productId }}
              products={products.map((p) => ({ id: p.id, name: p.name }))}
              stats={stats}
              breakdown={breakdown}
              widgetsInitial={widgetsInitial}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
