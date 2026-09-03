import "server-only";
import { metaGraphRequest, MetaGraphError, type GraphPage } from "./graph";
import { getMetaAccessToken, getMetaConnectionForBusiness } from "./connections";
import { validateMetaPublishReadiness } from "./publish-readiness";
import { mapDraftToMetaV1, campaignTag, adTag } from "./publish-mapper";
import {
  acquirePublishLock, getAdLinks, getCampaignLink,
  saveMetaCampaignId, saveMetaAdSetId, saveMetaCreativeId, saveMetaAdId,
  markPublished, markFailed, PublishLinkError,
  type CampaignLink, type PublishStep,
} from "./publish-links";
import type { CampaignDraft } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";
import type { ReadinessResult } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/readiness-types";

/**
 * The publish pipeline.
 *
 * Four objects, created in order, all PAUSED, each id persisted the moment it
 * arrives. A run that dies between two steps leaves enough behind for the next
 * one to continue instead of starting over — which is the whole point, because
 * starting over would mean a second campaign.
 *
 * Nothing is ever deleted from Meta here. Everything is created paused, so an
 * orphan left by a failed run cannot spend money, and a wrong DELETE would be
 * irreversible in a way a paused orphan never is.
 */

const FLAG = "META_PUBLISH_SMOKE_TEST_ENABLED";

export type PublishOutcome =
  | { ok: true; link: CampaignLink; resumed: boolean }
  | { ok: false; code: PublishFailureCode; message: string; reasons?: string[]; readiness?: ReadinessResult };

export type PublishFailureCode =
  | "DISABLED"
  | "NOT_READY"
  | "UNSUPPORTED"
  | "BUSY"
  | "ALREADY_PUBLISHED"
  | "NO_CONNECTION"
  | "META_ERROR"
  | "STATE_ERROR";

export function isPublishEnabled(): boolean {
  return process.env[FLAG] === "true";
}

// ── Reconciliation ───────────────────────────────────────────────────────────

/**
 * Find an object we created but whose id we never stored.
 *
 * Only ever a fallback for one failure mode: Meta created it and the response
 * was lost. The deterministic name tag is the only remaining thread back to it.
 * Names are NOT identity — a match is adopted into the link row immediately, and
 * from then on the stored id is what counts.
 */
async function findByNameTag(
  token: string,
  edge: string,
  tag: string
): Promise<string | null> {
  try {
    const page = await metaGraphRequest<GraphPage<{ id?: string; name?: string }>>({
      path: edge,
      accessToken: token,
      params: {
        fields: "id,name",
        filtering: JSON.stringify([{ field: "name", operator: "CONTAIN", value: tag }]),
        limit: 25,
      },
    });
    const hit = (page.data ?? []).find((r) => r.id && r.name?.includes(tag));
    return hit?.id ?? null;
  } catch {
    // A failed lookup must never be read as "it does not exist" — that would
    // create a duplicate. The caller treats null as unknown and aborts.
    return null;
  }
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

export async function publishCampaignToMeta(params: {
  businessId: string;
  adCampaignId: string;
  draft: CampaignDraft;
}): Promise<PublishOutcome> {
  const { businessId, adCampaignId, draft } = params;

  if (!isPublishEnabled()) {
    return {
      ok: false, code: "DISABLED",
      message: `La publicación está desactivada. Requiere ${FLAG}=true.`,
    };
  }

  // ── Gate 1: readiness, re-run server-side ────────────────────────────────
  const readiness = await validateMetaPublishReadiness({ businessId, draft });
  if (!readiness.ready || !readiness.checkedMeta) {
    return {
      ok: false, code: "NOT_READY", readiness,
      message: readiness.ready
        ? "No se pudieron completar las comprobaciones con Meta; no se publica sin verificar."
        : "La campaña todavía no está lista para publicarse.",
    };
  }

  const connection = await getMetaConnectionForBusiness(businessId);
  if (!connection?.adAccountId || !connection.pageId) {
    return { ok: false, code: "NO_CONNECTION", message: "Falta cuenta publicitaria o página." };
  }

  // ── Gate 2: does v1 support this draft at all? ────────────────────────────
  const mapped = mapDraftToMetaV1(draft, {
    adCampaignId,
    adAccountId: connection.adAccountId,
    pageId: connection.pageId,
    currency: connection.adAccountCurrency ?? draft.currency,
    // The account's own zone, never the draft's copy of it.
    timezone: connection.adAccountTimezone ?? "",
  });
  if (!mapped.supported) {
    return {
      ok: false, code: "UNSUPPORTED", reasons: mapped.reasons,
      message: "Esta campaña usa opciones que la publicación v1 todavía no soporta.",
    };
  }

  const accessToken = await getMetaAccessToken(businessId);
  if (!accessToken) {
    return { ok: false, code: "NO_CONNECTION", message: "No hay credencial de Meta utilizable." };
  }

  // ── Gate 3: exclusive ownership ───────────────────────────────────────────
  let acquired;
  try {
    acquired = await acquirePublishLock(adCampaignId);
  } catch (e) {
    return {
      ok: false, code: "STATE_ERROR",
      message: e instanceof PublishLinkError ? e.message : "No se pudo bloquear la publicación.",
    };
  }
  if (!acquired.ok) {
    return acquired.reason === "already_published"
      ? { ok: false, code: "ALREADY_PUBLISHED", message: "Esta campaña ya se publicó en Meta." }
      : { ok: false, code: "BUSY", message: "Ya hay una publicación en curso para esta campaña." };
  }

  const { token: lockToken } = acquired;
  let link = acquired.link;
  const resumed = Boolean(link.metaCampaignId);
  const account = connection.adAccountId;

  const adLinks = await getAdLinks(adCampaignId);
  const existingAd = adLinks.find((l) => l.localAdId === mapped.localAdId);

  let step: PublishStep = "campaign";
  const created = () => Boolean(link.metaCampaignId || link.metaAdSetId || existingAd?.metaCreativeId);

  try {
    // ── 1 · Campaign ───────────────────────────────────────────────────────
    step = "campaign";
    let campaignId = link.metaCampaignId;
    if (!campaignId) {
      const tag = campaignTag(adCampaignId);
      // Adopt an orphan from a lost response before creating a second one.
      campaignId = await findByNameTag(accessToken, `/${account}/campaigns`, tag);
      if (!campaignId) {
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/campaigns`, accessToken, method: "POST", params: asParams(mapped.campaign),
        });
        campaignId = res.id;
      }
      await saveMetaCampaignId(adCampaignId, lockToken, campaignId);
      link = { ...link, metaCampaignId: campaignId };
    }

    // ── 2 · Ad Set ─────────────────────────────────────────────────────────
    step = "adset";
    let adSetId = link.metaAdSetId;
    if (!adSetId) {
      const tag = campaignTag(adCampaignId);
      adSetId = await findByNameTag(accessToken, `/${account}/adsets`, tag);
      if (!adSetId) {
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/adsets`, accessToken, method: "POST",
          params: asParams({ ...mapped.adSet, campaign_id: campaignId }),
        });
        adSetId = res.id;
      }
      await saveMetaAdSetId(adCampaignId, lockToken, adSetId);
      link = { ...link, metaAdSetId: adSetId };
    }

    // ── 3 · Creative ───────────────────────────────────────────────────────
    step = "creative";
    let creativeId = existingAd?.metaCreativeId ?? null;
    if (!creativeId) {
      const tag = `${campaignTag(adCampaignId)}${adTag(mapped.localAdId)}`;
      creativeId = await findByNameTag(accessToken, `/${account}/adcreatives`, tag);
      if (!creativeId) {
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/adcreatives`, accessToken, method: "POST", params: asParams(mapped.creative),
        });
        creativeId = res.id;
      }
      await saveMetaCreativeId(adCampaignId, lockToken, mapped.localAdId, creativeId);
    }

    // ── 4 · Ad ─────────────────────────────────────────────────────────────
    step = "ad";
    let adId = existingAd?.metaAdId ?? null;
    if (!adId) {
      const tag = `${campaignTag(adCampaignId)}${adTag(mapped.localAdId)}`;
      adId = await findByNameTag(accessToken, `/${account}/ads`, tag);
      if (!adId) {
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/ads`, accessToken, method: "POST",
          params: asParams({ ...mapped.ad, adset_id: adSetId, creative: { creative_id: creativeId } }),
        });
        adId = res.id;
      }
      await saveMetaAdId(adCampaignId, lockToken, mapped.localAdId, adId);
    }

    await markPublished(adCampaignId, lockToken);
    const final = await getCampaignLink(adCampaignId);
    return { ok: true, link: final ?? link, resumed };
  } catch (e) {
    const message = e instanceof MetaGraphError
      ? `${e.message}${e.traceId ? ` (trace ${e.traceId})` : ""}`
      : "Fallo inesperado durante la publicación.";
    await markFailed(adCampaignId, lockToken, step, message, created());
    return { ok: false, code: "META_ERROR", message };
  }
}

/**
 * Graph takes form-encoded params, so nested values travel as JSON strings.
 * Done in one place so no call site has to remember it.
 */
function asParams(payload: object): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    out[key] = typeof value === "object" ? JSON.stringify(value) : (value as string | number);
  }
  return out;
}
