import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCampaignLink, getAdLinks } from "./publish-links";
import { derivePublishState, type CampaignPublishState } from "./publish-state";

/**
 * What the read-only views need about a campaign's life in Meta.
 *
 * The caller must already have verified that the person owns `businessId`;
 * the campaign itself is scoped to that business here, so a campaign id from
 * another business simply returns null.
 */
export interface CampaignPublishView {
  campaignId: string;
  name: string;
  publishState: CampaignPublishState;
  publishStatus: string | null;
  publishStep: string | null;
  publishError: string | null;
  publishedAt: string | null;
  metaCampaignId: string | null;
  metaAdSetId: string | null;
  ads: { localAdId: string; metaCreativeId: string | null; metaAdId: string | null }[];
  dsaBeneficiaryUsed: string | null;
  dsaPayorUsed: string | null;
  budgetAmount: string | null;
  currency: string | null;
  timezone: string | null;
}

export async function loadCampaignPublishView(
  businessId: string,
  campaignId: string
): Promise<CampaignPublishView | null> {
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("ad_campaigns")
    .select("id, name, status, budget_amount, currency, timezone")
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !row) return null;

  const [link, adLinks] = await Promise.all([getCampaignLink(campaignId), getAdLinks(campaignId)]);

  // The DSA snapshot is not part of CampaignLink; read it alongside.
  const { data: snap } = await supabase
    .from("meta_campaign_links")
    .select("dsa_beneficiary_used, dsa_payor_used, published_at")
    .eq("ad_campaign_id", campaignId)
    .maybeSingle();

  const r = row as {
    id: string; name: string | null; status: string | null;
    budget_amount: string | number | null; currency: string | null; timezone: string | null;
  };
  const s = snap as {
    dsa_beneficiary_used: string | null; dsa_payor_used: string | null; published_at: string | null;
  } | null;

  return {
    campaignId: r.id,
    name: r.name ?? "Campaña",
    publishState: derivePublishState({ campaignStatus: r.status, link, adLinks }),
    publishStatus: link?.publishStatus ?? null,
    publishStep: link?.publishStep ?? null,
    publishError: link?.publishError ?? null,
    publishedAt: s?.published_at ?? null,
    metaCampaignId: link?.metaCampaignId ?? null,
    metaAdSetId: link?.metaAdSetId ?? null,
    ads: adLinks.map((a) => ({ localAdId: a.localAdId, metaCreativeId: a.metaCreativeId, metaAdId: a.metaAdId })),
    dsaBeneficiaryUsed: s?.dsa_beneficiary_used ?? null,
    dsaPayorUsed: s?.dsa_payor_used ?? null,
    budgetAmount: r.budget_amount === null ? null : String(r.budget_amount),
    currency: r.currency,
    timezone: r.timezone,
  };
}
