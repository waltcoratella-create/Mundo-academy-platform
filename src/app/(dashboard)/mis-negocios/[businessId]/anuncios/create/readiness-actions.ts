"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { validateMetaPublishReadiness } from "@/lib/meta/publish-readiness";
import type { CampaignDraft } from "./campaign-types";
import type { ReadinessResult } from "./readiness-types";

/**
 * Publish readiness for the review drawer.
 *
 * The draft is sent from the browser so unsaved edits are evaluated too; it is
 * only read, never stored, and ownership is re-verified here because the
 * businessId comes from the client. The result carries no token and no Meta
 * credential — the type cannot express one.
 */

export type ReadinessActionResult =
  | { ok: true; result: ReadinessResult }
  | { ok: false; error: string };

export async function checkPublishReadiness(
  businessId: string,
  draft: CampaignDraft
): Promise<ReadinessActionResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "No tienes permiso sobre este negocio." };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { ok: false, error: "No tienes permiso sobre este negocio." };

  try {
    const result = await validateMetaPublishReadiness({ businessId: business.id, draft });
    return { ok: true, result };
  } catch {
    return { ok: false, error: "No se pudo comprobar si la campaña está lista. Inténtalo de nuevo." };
  }
}
