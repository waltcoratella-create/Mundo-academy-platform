"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById, getBusinessPaymentLinks } from "@/lib/supabase/queries";
import { publishCampaignToMeta, isPublishEnabled, type PublishFailureCode } from "@/lib/meta/publish";
import { getCampaignDraft } from "../campaign-actions";
import type { ReadinessResult } from "./readiness-types";

/**
 * Smoke-test entry point for the publish pipeline.
 *
 * Deliberately not wired to any button. The only way in is the invisible
 * SmokePublishBridge, which itself renders nothing and only exists while
 * META_PUBLISH_SMOKE_TEST_ENABLED is true — and that is mere convenience, not
 * the gate: the flag, the caller's ownership of the business and the campaign's
 * membership in it are all re-established right here regardless of what the
 * client sent.
 *
 * The draft is loaded from the database, not accepted from the browser: a
 * smoke test must publish exactly what is persisted, and getCampaignDraft
 * already re-resolves ownership and refuses anything that is not a draft.
 */

export type PublishActionResult =
  | {
      ok: true;
      metaCampaignId: string | null;
      metaAdSetId: string | null;
      publishStatus: string;
      publishStep: string;
      resumed: boolean;
    }
  | { ok: false; code: PublishFailureCode | "FORBIDDEN"; error: string; reasons?: string[]; readiness?: ReadinessResult };

export async function publishCampaignSmokeTest(
  businessId: string,
  campaignId: string
): Promise<PublishActionResult> {
  if (!isPublishEnabled()) {
    return {
      ok: false,
      code: "DISABLED",
      error: "La publicación en Meta está desactivada en este entorno.",
    };
  }

  const { userId } = await auth();
  if (!userId) return { ok: false, code: "FORBIDDEN", error: "No tienes permiso sobre este negocio." };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { ok: false, code: "FORBIDDEN", error: "No tienes permiso sobre este negocio." };

  // Payment links let a stored /pay/<slug> destination resolve back to its
  // link, exactly as the editor loads it.
  const paymentLinksResult = await getBusinessPaymentLinks(business.id);
  const paymentLinks = paymentLinksResult.links.map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    productName: l.product_name,
    active: l.active,
  }));

  const loaded = await getCampaignDraft({
    businessId: business.id,
    campaignId,
    paymentLinks,
  });
  if (!loaded.ok) {
    return { ok: false, code: "FORBIDDEN", error: loaded.error };
  }

  const outcome = await publishCampaignToMeta({
    businessId: business.id,
    adCampaignId: loaded.campaignId,
    draft: loaded.draft,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      code: outcome.code,
      error: outcome.message,
      reasons: outcome.reasons,
      readiness: outcome.readiness,
    };
  }

  return {
    ok: true,
    metaCampaignId: outcome.link.metaCampaignId,
    metaAdSetId: outcome.link.metaAdSetId,
    publishStatus: outcome.link.publishStatus,
    publishStep: outcome.link.publishStep,
    resumed: outcome.resumed,
  };
}
