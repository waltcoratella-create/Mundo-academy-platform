import "server-only";
import { metaGraphList, MetaGraphError } from "./graph";
import { getMetaAccessToken } from "./connections";

/**
 * The Custom Audiences already saved in the connected ad account.
 *
 * A list, not a search: an account holds tens of audiences, not millions, so
 * this is fetched once and filtered in the browser. Turning every keystroke
 * into a Graph call would burn a rate-limited access tier for nothing.
 *
 * Nothing here creates or edits an audience — only reads.
 */

export interface MetaCustomAudienceResult {
  id: string;
  name: string;
  subtype: string | null;
  approximateCount: number | null;
  deliveryStatus: string | null;
  operationStatus: string | null;
  updatedAt: number | null;
}

export type MetaCustomAudienceOutcome =
  | { ok: true; audiences: MetaCustomAudienceResult[] }
  | { ok: false; error: string; needsConnection?: boolean; needsTos?: boolean };

interface RawStatus { code?: number; description?: string }

interface RawCustomAudience {
  id?: string;
  name?: string;
  subtype?: string;
  approximate_count_lower_bound?: number;
  delivery_status?: RawStatus | RawStatus[];
  operation_status?: RawStatus | RawStatus[];
  time_updated?: number;
}

const NOT_CONNECTED = "Conecta tu cuenta de Meta para ver tus audiencias.";
const SESSION_EXPIRED = "La sesión con Meta caducó. Vuelve a conectar la cuenta.";
const NO_ACCOUNT = "Elige una cuenta publicitaria en Configuraciones para ver sus audiencias.";
const GENERIC = "No se pudieron cargar las audiencias de Meta. Inténtalo de nuevo.";

/**
 * Meta returns these status objects either bare or wrapped in a one-element
 * array depending on the edge and version, so both are unwrapped.
 */
function statusDescription(v: RawStatus | RawStatus[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && typeof s.description === "string" && s.description ? s.description : null;
}

function toNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Custom Audience Terms of Service.
 *
 * Meta documents the ToS as gating creation and editing, and is silent about
 * reads; in practice some accounts refuse the read too. Rather than guess, the
 * error is detected by Meta's own subcode/message and surfaced with the link
 * that actually resolves it.
 */
function isTosError(e: MetaGraphError): boolean {
  if (e.subcode === 1870034 || e.code === 2654) return true;
  return /terms of service|términos|custom audience terms/i.test(e.message);
}

export async function listMetaCustomAudiences(params: {
  businessId: string;
  adAccountId: string | null;
  maxPages?: number;
  limit?: number;
}): Promise<MetaCustomAudienceOutcome> {
  const { businessId, adAccountId, maxPages = 3, limit = 100 } = params;

  if (!adAccountId) return { ok: false, error: NO_ACCOUNT };

  const token = await getMetaAccessToken(businessId);
  if (!token) return { ok: false, error: NOT_CONNECTED, needsConnection: true };

  try {
    const rows = await metaGraphList<RawCustomAudience>({
      path: `/${adAccountId}/customaudiences`,
      accessToken: token,
      params: {
        fields:
          "id,name,subtype,approximate_count_lower_bound," +
          "delivery_status,operation_status,time_updated",
        limit,
      },
      maxPages,
    });

    const audiences = rows
      .filter((r): r is RawCustomAudience & { id: string } =>
        typeof r.id === "string" && r.id.length > 0
      )
      .map((r) => ({
        id: r.id,
        name: typeof r.name === "string" && r.name ? r.name : r.id,
        subtype: r.subtype ?? null,
        approximateCount: toNum(r.approximate_count_lower_bound),
        deliveryStatus: statusDescription(r.delivery_status),
        operationStatus: statusDescription(r.operation_status),
        updatedAt: toNum(r.time_updated),
      }));

    return { ok: true, audiences };
  } catch (e) {
    if (e instanceof MetaGraphError) {
      if (e.code === 190) return { ok: false, error: SESSION_EXPIRED, needsConnection: true };
      if (isTosError(e)) return { ok: false, error: e.message || GENERIC, needsTos: true };
      return { ok: false, error: e.message || GENERIC };
    }
    return { ok: false, error: GENERIC };
  }
}
