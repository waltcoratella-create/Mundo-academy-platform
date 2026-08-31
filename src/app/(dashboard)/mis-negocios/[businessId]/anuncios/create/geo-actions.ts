"use server";

import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { searchMetaGeoLocations } from "@/lib/meta/geo";
import type { CampaignGeoLocation } from "./campaign-types";
import { GEO_LOCATION_TYPES, GEO_MIN_QUERY, GEO_SEARCH_LIMIT } from "./campaign-types";

/**
 * Geo search for the Build step.
 *
 * The bridge between the client picker and `lib/meta`: ownership is re-verified
 * here because `businessId` arrives from the browser, and the access token stays
 * on the server — the return type has no field that could carry one.
 */

export type GeoSearchResult =
  | { ok: true; results: CampaignGeoLocation[] }
  | { ok: false; error: string; needsConnection?: boolean };

export async function searchGeoLocations(
  businessId: string,
  query: string
): Promise<GeoSearchResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "No tienes permiso sobre este negocio." };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { ok: false, error: "No tienes permiso sobre este negocio." };

  const outcome = await searchMetaGeoLocations({
    businessId: business.id,
    query,
    locationTypes: GEO_LOCATION_TYPES,
    limit: GEO_SEARCH_LIMIT,
    minLength: GEO_MIN_QUERY,
  });

  if (!outcome.ok) {
    return { ok: false, error: outcome.error, needsConnection: outcome.needsConnection };
  }

  // Meta's snake_case is mapped once, here, so the wizard only ever sees the
  // draft's own shape.
  return {
    ok: true,
    results: outcome.results.map((r) => ({
      key: r.key,
      name: r.name,
      type: r.type,
      countryCode: r.countryCode,
      countryName: r.countryName,
      region: r.region,
    })),
  };
}
