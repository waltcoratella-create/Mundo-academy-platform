import "server-only";
import { metaGraphRequest, MetaGraphError } from "./graph";

/**
 * Live status of the objects a publish created. Read-only.
 *
 * Meta is the only source of truth for delivery and review; nothing here is
 * stored. Values are passed through as Meta returns them — the UI labels the
 * documented ones and shows anything else verbatim rather than guessing.
 */

export type MetaObjectKind = "campaign" | "adset" | "creative" | "ad";

export interface MetaObjectStatus {
  kind: MetaObjectKind;
  id: string;
  /** Null when Meta did not return the field or the read failed. */
  status: string | null;
  effectiveStatus: string | null;
  /** Review feedback text exactly as Meta sent it (ads only). */
  reviewFeedback: string[];
  /** Set when this object could not be read. */
  error: string | null;
}

const FIELDS: Record<MetaObjectKind, string> = {
  campaign: "status,effective_status",
  adset: "status,effective_status",
  // A creative's own status field is not something we have confirmed in the
  // reference, so we only prove it exists.
  creative: "name",
  ad: "status,effective_status,ad_review_feedback",
};

/**
 * ad_review_feedback is documented only as a type (AdgroupReviewFeedback), not
 * field by field. We therefore collect its string leaves as-is instead of
 * assuming a shape — shown verbatim, never reinterpreted.
 */
function stringLeaves(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap((v) => stringLeaves(v, depth + 1));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((v) => stringLeaves(v, depth + 1));
  }
  return [];
}

export async function readMetaObjectStatus(
  token: string,
  kind: MetaObjectKind,
  id: string
): Promise<MetaObjectStatus> {
  try {
    const raw = await metaGraphRequest<{
      status?: string; effective_status?: string; ad_review_feedback?: unknown;
    }>({ path: `/${id}`, accessToken: token, params: { fields: FIELDS[kind] } });

    return {
      kind, id,
      status: raw.status ?? null,
      effectiveStatus: raw.effective_status ?? null,
      reviewFeedback: kind === "ad" ? stringLeaves(raw.ad_review_feedback) : [],
      error: null,
    };
  } catch (e) {
    return {
      kind, id, status: null, effectiveStatus: null, reviewFeedback: [],
      error: e instanceof MetaGraphError ? e.message : "No se pudo leer el objeto en Meta.",
    };
  }
}

/**
 * Ads Manager deep link. NOT a documented contract: the same URL shape was
 * observed working during the smoke test. Presented as a convenience link,
 * never as data.
 */
export function adsManagerCampaignUrl(adAccountId: string, metaCampaignId: string): string {
  const act = adAccountId.replace(/^act_/, "");
  const url = new URL("https://adsmanager.facebook.com/adsmanager/manage/campaigns");
  url.searchParams.set("act", act);
  url.searchParams.set("selected_campaign_ids", metaCampaignId);
  return url.toString();
}
