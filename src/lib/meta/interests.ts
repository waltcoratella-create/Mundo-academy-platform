import "server-only";
import { metaGraphRequest, MetaGraphError, type GraphPage } from "./graph";
import { getMetaAccessToken } from "./connections";

/**
 * Meta Targeting Search for detailed-targeting interests.
 *
 * `GET /search?type=adinterest` is the only source of the ids that
 * `targeting.flexible_spec` accepts. As with places, there is no local list to
 * fall back to: an interest name without an id is not publishable, which is the
 * exact state this replaces.
 *
 * The token is read here and never leaves this module.
 */

export interface MetaInterestResult {
  id: string;
  name: string;
  /** Meta's taxonomy trail, used to tell same-named interests apart. */
  path: string[];
  topic: string | null;
  audienceSizeLower: number | null;
  audienceSizeUpper: number | null;
}

export type MetaInterestOutcome =
  | { ok: true; results: MetaInterestResult[] }
  | { ok: false; error: string; needsConnection?: boolean };

/** Meta's raw shape. Everything except id/name is optional. */
interface RawInterest {
  id?: string;
  name?: string;
  path?: unknown;
  topic?: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
  disambiguation_category?: string;
}

const NOT_CONNECTED = "Conecta tu cuenta de Meta para buscar intereses reales.";
const SESSION_EXPIRED = "La sesión con Meta caducó. Vuelve a conectar la cuenta.";
const GENERIC = "No se pudieron buscar intereses en Meta. Inténtalo de nuevo.";

function toStringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function toNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function searchMetaInterests(params: {
  businessId: string;
  query: string;
  limit: number;
  minLength: number;
}): Promise<MetaInterestOutcome> {
  const { businessId, query, limit, minLength } = params;

  const q = query.trim();
  if (q.length < minLength) return { ok: true, results: [] };

  const token = await getMetaAccessToken(businessId);
  if (!token) return { ok: false, error: NOT_CONNECTED, needsConnection: true };

  try {
    const page = await metaGraphRequest<GraphPage<RawInterest>>({
      path: "/search",
      accessToken: token,
      params: {
        type: "adinterest",
        q,
        limit,
      },
    });

    const results = (page.data ?? [])
      // No id means it cannot be targeted, so it is not offered.
      .filter((r): r is RawInterest & { id: string } =>
        typeof r.id === "string" && r.id.length > 0
      )
      .map((r) => ({
        id: r.id,
        name: typeof r.name === "string" && r.name ? r.name : r.id,
        path: toStringList(r.path),
        // `disambiguation_category` is Meta's own tie-breaker when two
        // interests share a name; it is the better label when present.
        topic: r.disambiguation_category ?? r.topic ?? null,
        audienceSizeLower: toNum(r.audience_size_lower_bound),
        audienceSizeUpper: toNum(r.audience_size_upper_bound),
      }));

    return { ok: true, results };
  } catch (e) {
    if (e instanceof MetaGraphError) {
      if (e.code === 190) return { ok: false, error: SESSION_EXPIRED, needsConnection: true };
      return { ok: false, error: e.message || GENERIC };
    }
    return { ok: false, error: GENERIC };
  }
}
