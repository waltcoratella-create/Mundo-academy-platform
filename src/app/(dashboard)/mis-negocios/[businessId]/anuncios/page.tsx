import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { getBusinessById } from "@/lib/supabase/queries";
import "../analitica/analytics.css";
import "./ads.css";
import { getAdsData } from "./ads-data";
import { AdsClient } from "./components/AdsClient";

/**
 * Ads dashboard. Renders inside the existing business layout and reuses the
 * Analytics Frosted-UI token scope (.analytics-page) so pills, cards, charts and
 * typography match the rest of the product. Data is mock for now (getAdsData) —
 * the interfaces in ads-data.ts are the seam for a future Meta Ads integration.
 */
export default async function AnunciosPage({ params }: { params: { businessId: string } }) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const data = await getAdsData(business.id);
  const base = `/mis-negocios/${business.id}`;

  return (
    <div className="analytics-page ads-page">
      <div style={{ padding: "24px" }}>
        <AdsClient
          data={data}
          createHref={`${base}/anuncios/create`}
          chatHref={`${base}/chats`}
          billingHref={`${base}/configuraciones`}
        />
      </div>
    </div>
  );
}
