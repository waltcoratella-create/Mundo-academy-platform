import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById, getBusinessProducts } from "@/lib/supabase/queries";
import "./analytics.css";
import { getAnalyticsData } from "./data";
import { validateRange, validateComparison, validateGranularity, DEFAULTS } from "./filters";
import { getAnalyticsWidgets } from "./widgets-actions";
import { getSharePreferences } from "./share-actions";
import { AnalyticsLive } from "./components/AnalyticsLive";

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
  const compareFrom = first(searchParams.compareFrom);
  const compareTo = first(searchParams.compareTo);

  // Dev-only sample data for manual chart/delta testing — never reachable in production.
  const preview = process.env.NODE_ENV !== "production" && first(searchParams.preview) === "1";

  const [{ today, stats, breakdown, filter }, widgetsInitial, sharePrefs] = await Promise.all([
    getAnalyticsData({ businessId: business.id, range, comparison, granularity, productId, from, to, compareFrom, compareTo, preview }),
    getAnalyticsWidgets({ businessId: business.id }),
    getSharePreferences({ businessId: business.id }),
  ]);

  return (
    <div className="analytics-page">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "24px" }}>
        <AnalyticsLive
          businessId={business.id}
          businessName={business.name}
          sharePrefs={sharePrefs}
          params={{ businessId: business.id, range, comparison, granularity, productId, from, to, compareFrom, compareTo }}
          filter={filter}
          selected={{ range, comparison, granularity, productId }}
          products={products.map((p) => ({ id: p.id, name: p.name }))}
          widgetsInitial={widgetsInitial}
          initial={{ today, stats, breakdown }}
        />
      </div>
    </div>
  );
}
