"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { searchMetaInterests } from "@/lib/meta/interests";
import { listMetaCustomAudiences } from "@/lib/meta/custom-audiences";
import { getMetaAccountBinding } from "../meta-account";
import type { CampaignInterest, CampaignCustomAudience } from "./campaign-types";
import { INTEREST_MIN_QUERY, INTEREST_SEARCH_LIMIT } from "./campaign-types";

/**
 * Audience targeting actions for the Build step.
 *
 * Same trust boundary as the geo search: `businessId` arrives from the browser,
 * so ownership is re-verified here, and the access token stays server-side —
 * neither return type has a field that could carry one.
 */

async function assertOwner(businessId: string): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(businessId, userId);
  return business ? business.id : null;
}

const FORBIDDEN = "No tienes permiso sobre este negocio.";

// ── Interests ────────────────────────────────────────────────────────────────

export type InterestSearchResult =
  | { ok: true; results: CampaignInterest[] }
  | { ok: false; error: string; needsConnection?: boolean };

export async function searchInterests(
  businessId: string,
  query: string
): Promise<InterestSearchResult> {
  const id = await assertOwner(businessId);
  if (!id) return { ok: false, error: FORBIDDEN };

  const outcome = await searchMetaInterests({
    businessId: id,
    query,
    limit: INTEREST_SEARCH_LIMIT,
    minLength: INTEREST_MIN_QUERY,
  });

  if (!outcome.ok) {
    return { ok: false, error: outcome.error, needsConnection: outcome.needsConnection };
  }

  return {
    ok: true,
    results: outcome.results.map((r) => ({
      id: r.id,
      name: r.name,
      path: r.path,
      topic: r.topic,
      audienceSizeLower: r.audienceSizeLower,
      audienceSizeUpper: r.audienceSizeUpper,
    })),
  };
}

// ── Custom Audiences ─────────────────────────────────────────────────────────

export type CustomAudiencesResult =
  | { ok: true; audiences: CampaignCustomAudience[] }
  | { ok: false; error: string; needsConnection?: boolean; needsTos?: boolean };

/**
 * Every Custom Audience of the connected ad account, in one call.
 *
 * The account id is resolved server-side from the stored connection rather than
 * accepted from the client, so a caller cannot point this at someone else's
 * ad account.
 */
export async function loadCustomAudiences(
  businessId: string
): Promise<CustomAudiencesResult> {
  const id = await assertOwner(businessId);
  if (!id) return { ok: false, error: FORBIDDEN };

  const account = await getMetaAccountBinding(id);
  const outcome = await listMetaCustomAudiences({
    businessId: id,
    adAccountId: account.adAccountId,
  });

  if (!outcome.ok) {
    return {
      ok: false,
      error: outcome.error,
      needsConnection: outcome.needsConnection,
      needsTos: outcome.needsTos,
    };
  }

  return {
    ok: true,
    audiences: outcome.audiences.map((a) => ({
      id: a.id,
      name: a.name,
      subtype: a.subtype,
      approximateCount: a.approximateCount,
      deliveryStatus: a.deliveryStatus,
    })),
  };
}
