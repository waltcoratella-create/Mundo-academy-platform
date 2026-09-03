"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishCampaignToMeta, isPublishEnabled, type PublishFailureCode } from "@/lib/meta/publish";
import type { CampaignDraft } from "./campaign-types";
import type { ReadinessResult } from "./readiness-types";

/**
 * Smoke-test entry point for the publish pipeline.
 *
 * Deliberately not wired to any button yet. It exists so the first real run can
 * be triggered deliberately, once, with the flag on — and so that until then the
 * only reachable answer is a refusal.
 *
 * Three things are re-established here regardless of what the client sent:
 * the flag, the caller's ownership of the business, and the campaign's
 * membership in that business. Everything after that is the pipeline's job.
 */

export type PublishActionResult =
  | { ok: true; metaCampaignId: string | null; metaAdSetId: string | null; resumed: boolean }
  | { ok: false; code: PublishFailureCode | "FORBIDDEN"; error: string; reasons?: string[]; readiness?: ReadinessResult };

export async function publishCampaignSmokeTest(
  businessId: string,
  campaignId: string,
  draft: CampaignDraft
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

  // The campaign id arrives from the client, so its ownership is its own check:
  // a valid business does not make an arbitrary campaign id publishable.
  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("ad_campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, code: "FORBIDDEN", error: "No se encontró la campaña en este negocio." };
  }

  const outcome = await publishCampaignToMeta({
    businessId: business.id,
    adCampaignId: campaignId,
    draft,
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
    resumed: outcome.resumed,
  };
}
