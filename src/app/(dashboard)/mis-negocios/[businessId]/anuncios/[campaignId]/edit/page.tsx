import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBusinessById, getBusinessProducts, getBusinessPaymentLinks,
} from "@/lib/supabase/queries";
import "../../../analitica/analytics.css";
import "../../ads.css";
import "../../create/create.css";
import { CampaignWizard } from "../../create/components/CampaignWizard";
import { getCampaignDraft } from "../../campaign-actions";
import { getMetaAccountBinding } from "../../meta-account";
import { SmokePublishBridge } from "../../create/components/SmokePublishBridge";
import { isPublishEnabled } from "@/lib/meta/publish";

/**
 * Campaign builder — edit mode.
 *
 * Two independent ownership gates: `getBusinessById` scopes the business to the
 * authed user (404 otherwise), and `getCampaignDraft` re-resolves the owner
 * server-side and queries the campaign scoped to that business, so a campaignId
 * belonging to someone else is simply not found. Only drafts load; anything
 * already live returns a message instead of an editor.
 */
export default async function EditCampaignPage({
  params,
}: {
  params: { businessId: string; campaignId: string };
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

  const paymentLinks = paymentLinksResult.links.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    productName: l.product_name,
    active: l.active,
  }));

  // Payment links are needed here so a stored /pay/<slug> destination can be
  // resolved back to the link that produced it.
  const loaded = await getCampaignDraft({
    businessId: business.id,
    campaignId: params.campaignId,
    paymentLinks,
  });

  const base = `/mis-negocios/${business.id}`;
  const adsHref = `${base}/anuncios`;

  if (!loaded.ok) {
    return (
      <div className="analytics-page ads-page ads-create">
        <div style={{ padding: "24px" }}>
          <div className="adsc-shell">
            <div className="adsc-card">
              <div className="adsc-done">
                <h2 className="adsc-done__title">No se puede editar esta campaña</h2>
                <p className="adsc-done__text">{loaded.error}</p>
                <Link href={adsHref} className="ads-btn-primary" style={{ marginTop: 4 }}>
                  Volver a Anuncios
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page ads-page ads-create">
      <div style={{ padding: "24px" }}>
        {/* Invisible. Exists only while the smoke-test flag is on. */}
        <SmokePublishBridge
          businessId={business.id}
          campaignId={loaded.campaignId}
          enabled={isPublishEnabled()}
        />
        <CampaignWizard
          businessId={business.id}
          campaignId={loaded.campaignId}
          initialDraft={loaded.draft}
          adsHref={adsHref}
          appOrigin={process.env.NEXT_PUBLIC_APP_URL || ""}
          defaultCurrency={loaded.draft.currency}
          metaAccount={metaAccount}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            currency: p.currency,
            status: p.status,
          }))}
          paymentLinks={paymentLinks}
          paymentLinksAvailable={paymentLinksResult.tableExists}
        />
      </div>
    </div>
  );
}
