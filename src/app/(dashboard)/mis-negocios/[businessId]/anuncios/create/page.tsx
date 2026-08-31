import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import {
  getBusinessById, getBusinessProducts, getBusinessPaymentLinks,
} from "@/lib/supabase/queries";
import "../../analitica/analytics.css";
import "../ads.css";
import "./create.css";
import { CampaignWizard } from "./components/CampaignWizard";
import { getMetaAccountBinding } from "../meta-account";

/**
 * Campaign builder — create mode. `getBusinessById` already scopes to the authed
 * owner, so a businessId from the URL that the user does not own 404s here; the
 * server action re-checks ownership independently before writing anything.
 *
 * Editing an existing draft lives at ../[campaignId]/edit.
 */
export default async function CreateCampaignPage({
  params,
}: {
  params: { businessId: string };
}) {
  const { userId } = await auth();
  if (!userId) return null;

  const business = await getBusinessById(params.businessId, userId);
  if (!business) notFound();

  const [products, paymentLinksResult, metaAccount] = await Promise.all([
    getBusinessProducts(business.id),
    getBusinessPaymentLinks(business.id),
    getMetaAccountBinding(business.id),
  ]);

  const base = `/mis-negocios/${business.id}`;
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "";

  // Fallback only: when Meta is connected the wizard uses the ad account's
  // currency instead, because that is the currency Meta will read the budget in.
  const defaultCurrency = products.find((p) => p.currency)?.currency ?? "USD";

  return (
    <div className="analytics-page ads-page ads-create">
      <div style={{ padding: "24px" }}>
        <CampaignWizard
          businessId={business.id}
          adsHref={`${base}/anuncios`}
          appOrigin={appOrigin}
          defaultCurrency={defaultCurrency}
          metaAccount={metaAccount}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency,
            status: p.status,
          }))}
          paymentLinks={paymentLinksResult.links.map((l) => ({
            id: l.id,
            title: l.title,
            slug: l.slug,
            productName: l.product_name,
            active: l.active,
          }))}
          paymentLinksAvailable={paymentLinksResult.tableExists}
        />
      </div>
    </div>
  );
}
