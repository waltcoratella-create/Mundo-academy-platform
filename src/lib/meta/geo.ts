import "server-only";
import { metaGraphRequest, MetaGraphError, type GraphPage } from "./graph";
import { getMetaAccessToken } from "./connections";

/**
 * Meta Targeting Search for places.
 *
 * `GET /search?type=adgeolocation` is the only source of the `key` values the
 * Marketing API accepts in `geo_locations`; Meta's own docs are explicit that
 * names are display-only and "key" is what defines a targeting spec. Nothing
 * here falls back to a local list, because a name without a key is exactly the
 * unpublishable state we are removing.
 *
 * The token is read here and never leaves this module.
 */

/** What a caller gets back. Ids and names only — no token, no raw Graph body. */
export interface MetaGeoSearchResult {
  key: string;
  name: string;
  type: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
}

export type MetaGeoSearchOutcome =
  | { ok: true; results: MetaGeoSearchResult[] }
  | { ok: false; error: string; needsConnection?: boolean };

/** Meta's own shape for one hit. Everything except key/name is optional. */
interface RawGeoLocation {
  key?: string;
  name?: string;
  type?: string;
  country_code?: string;
  country_name?: string;
  region?: string;
}

const NOT_CONNECTED =
  "Conecta tu cuenta de Meta para buscar ubicaciones reales.";
const SESSION_EXPIRED =
  "La sesión con Meta caducó. Vuelve a conectar la cuenta.";
const GENERIC =
  "No se pudieron buscar ubicaciones en Meta. Inténtalo de nuevo.";

/**
 * Search places the connected account can target.
 *
 * A query shorter than `minLength` returns an empty list without calling Meta —
 * the Marketing API access tier is rate limited, so keystrokes must not become
 * requests.
 */
export async function searchMetaGeoLocations(params: {
  businessId: string;
  query: string;
  locationTypes: string[];
  limit: number;
  minLength: number;
}): Promise<MetaGeoSearchOutcome> {
  const { businessId, query, locationTypes, limit, minLength } = params;

  const q = query.trim();
  if (q.length < minLength) return { ok: true, results: [] };

  const token = await getMetaAccessToken(businessId);
  if (!token) return { ok: false, error: NOT_CONNECTED, needsConnection: true };

  try {
    const page = await metaGraphRequest<GraphPage<RawGeoLocation>>({
      path: "/search",
      accessToken: token,
      params: {
        type: "adgeolocation",
        q,
        location_types: JSON.stringify(locationTypes),
        limit,
      },
    });

    const results = (page.data ?? [])
      // A hit without a key is unusable for targeting, so it is dropped rather
      // than shown as if it were selectable.
      .filter((r): r is RawGeoLocation & { key: string } =>
        typeof r.key === "string" && r.key.length > 0
      )
      .map((r) => ({
        key: r.key,
        name: typeof r.name === "string" && r.name ? r.name : r.key,
        type: r.type ?? null,
        countryCode: r.country_code ?? null,
        countryName: r.country_name ?? null,
        region: r.region ?? null,
      }));

    return { ok: true, results };
  } catch (e) {
    // 190 = invalid/expired token. Anything else keeps Meta's sanitised message.
    if (e instanceof MetaGraphError) {
      if (e.code === 190) return { ok: false, error: SESSION_EXPIRED, needsConnection: true };
      return { ok: false, error: e.message || GENERIC };
    }
    return { ok: false, error: GENERIC };
  }
}
