import "server-only";
import { metaGraphRequest, MetaGraphError, type GraphPage } from "./graph";
import { getMetaAccessToken, getMetaConnectionForBusiness } from "./connections";
import { validateMetaPublishReadiness } from "./publish-readiness";
import { mapDraftToMetaV1, campaignTag, adTag } from "./publish-mapper";
import { getDsaSettings } from "./ad-settings";
import type { DsaDeclaration } from "./dsa";
import {
  acquirePublishLock, getAdLinks, getCampaignLink,
  saveMetaCampaignId, saveMetaAdSetId, saveMetaCreativeId, saveMetaAdId, saveDsaSnapshot,
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

export type PublishOutcome =
  | { ok: true; link: CampaignLink; resumed: boolean }
  | { ok: false; code: PublishFailureCode; message: string; reasons?: string[]; readiness?: ReadinessResult };

export type PublishFailureCode =
  | "PUBLISH_DISABLED"
  | "NOT_READY"
  | "UNSUPPORTED"
  | "BUSY"
  | "ALREADY_PUBLISHED"
  | "NO_CONNECTION"
  | "META_ERROR"
  | "LOCK_LOST"
  | "STATE_ERROR";

/**
 * Emergency stop for the whole environment: META_PUBLISH_DISABLED=true.
 *
 * An extra layer, not a replacement: ownership, readiness and the lock still
 * run for every publish when it is off. Absent or any other value = normal.
 */
export function isPublishKillSwitchOn(): boolean {
  return process.env.META_PUBLISH_DISABLED === "true";
}

/** Meta refuses to create an Ad without a valid payment method (smoke run 4). */
export const PAYMENT_METHOD_SUBCODE = 1359188;

/**
 * The stored, user-facing error: Meta's message (or our translation of a known
 * subcode) plus everything Meta offers for support. The raw response never
 * leaves the graph client, so no token can ride along.
 */
export function describeMetaError(e: MetaGraphError): string {
  const base = e.subcode === PAYMENT_METHOD_SUBCODE
    ? "La cuenta publicitaria no tiene un método de pago válido. Añádelo en Facturación y " +
      "pagos de Meta y vuelve a intentarlo: la publicación continuará donde se quedó."
    : e.message;
  return [
    base,
    e.code !== null ? `code ${e.code}` : null,
    e.subcode !== null ? `subcode ${e.subcode}` : null,
    e.traceId ? `trace ${e.traceId}` : null,
  ].filter(Boolean).join(" · ");
}

/**
 * Last line before every creation POST. The mapper's types already make any
 * other status impossible; this makes it impossible at runtime too.
 */
export function assertPaused(payload: { status?: unknown }): void {
  if (payload.status !== "PAUSED") {
    throw new Error("Refusing to create a Meta object that is not PAUSED.");
  }
}

/** The lock was taken over while we waited on Meta: stop, write nothing more. */
class LockLostError extends Error {}

/** We could not tell whether the object already exists: never POST blind. */
class ReconciliationError extends Error {}

// ── Reconciliation ───────────────────────────────────────────────────────────

/**
 * Find an object we created but whose id we never stored.
 *
 * Only ever a fallback for one failure mode: Meta created it and the response
 * was lost. The deterministic name tag is the only remaining thread back to it.
 * Names are NOT identity — a match is adopted into the link row immediately, and
 * from then on the stored id is what counts.
 *
 * A failed lookup THROWS. Reading it as "not found" would POST a second object —
 * the exact duplicate this function exists to prevent.
 */
async function findByNameTag(
  token: string,
  edge: string,
  tag: string
): Promise<string | null> {
  let page: GraphPage<{ id?: string; name?: string }>;
  try {
    page = await metaGraphRequest<GraphPage<{ id?: string; name?: string }>>({
      path: edge,
      accessToken: token,
      params: {
        fields: "id,name",
        filtering: JSON.stringify([{ field: "name", operator: "CONTAIN", value: tag }]),
        limit: 25,
      },
    });
  } catch (e) {
    throw new ReconciliationError(
      "No se pudo comprobar en Meta si el objeto ya existe; no se crea otro para evitar duplicados." +
      (e instanceof MetaGraphError && e.traceId ? ` · trace ${e.traceId}` : "")
    );
  }
  const hit = (page.data ?? []).find((r) => r.id && r.name?.includes(tag));
  return hit?.id ?? null;
}

// ── Pipeline ─────────────────────────────────────────────────────────────────

export async function publishCampaignToMeta(params: {
  businessId: string;
  adCampaignId: string;
  draft: CampaignDraft;
}): Promise<PublishOutcome> {
  const { businessId, adCampaignId, draft } = params;

  // ── Gate 0: emergency stop — before any read, before any lock ─────────────
  if (isPublishKillSwitchOn()) {
    return {
      ok: false, code: "PUBLISH_DISABLED",
      message: "La publicación en Meta está desactivada temporalmente.",
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

  // Everything account-shaped comes from THIS business's connection row.
  const connection = await getMetaConnectionForBusiness(businessId);
  if (!connection?.adAccountId || !connection.pageId) {
    return { ok: false, code: "NO_CONNECTION", message: "Falta cuenta publicitaria o página." };
  }

  let dsa: DsaDeclaration | null;
  try {
    const settings = await getDsaSettings(businessId);
    dsa = settings ? { beneficiary: settings.beneficiary, payor: settings.payor } : null;
  } catch {
    return { ok: false, code: "STATE_ERROR", message: "No se pudo leer la declaración de anunciante y pagador." };
  }

  // ── Gate 2: does v1 support this draft at all? ────────────────────────────
  const mapped = mapDraftToMetaV1(draft, {
    adCampaignId,
    adAccountId: connection.adAccountId,
    pageId: connection.pageId,
    currency: connection.adAccountCurrency ?? draft.currency,
    // The account's own zone, never the draft's copy of it.
    timezone: connection.adAccountTimezone ?? "",
    dsa,
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

  let step: PublishStep = "campaign";
  let anythingCreated = false;

  /** Each persisted id must come back owned; otherwise stop right here. */
  const owned = async (write: Promise<boolean>) => {
    if (!(await write)) throw new LockLostError();
  };

  try {
    const adLinks = await getAdLinks(adCampaignId);
    const existingAd = adLinks.find((l) => l.localAdId === mapped.localAdId);
    anythingCreated = Boolean(
      link.metaCampaignId || link.metaAdSetId || existingAd?.metaCreativeId || existingAd?.metaAdId
    );

    // ── 1 · Campaign ───────────────────────────────────────────────────────
    step = "campaign";
    let campaignId = link.metaCampaignId;
    if (!campaignId) {
      // Adopt an orphan from a lost response before creating a second one.
      campaignId = await findByNameTag(accessToken, `/${account}/campaigns`, campaignTag(adCampaignId));
      if (!campaignId) {
        assertPaused(mapped.campaign);
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/campaigns`, accessToken, method: "POST", params: asParams(mapped.campaign),
        });
        campaignId = res.id;
      }
      anythingCreated = true;
      await owned(saveMetaCampaignId(adCampaignId, lockToken, campaignId));
      link = { ...link, metaCampaignId: campaignId };
    }

    // ── 2 · Ad Set ─────────────────────────────────────────────────────────
    step = "adset";
    let adSetId = link.metaAdSetId;
    if (!adSetId) {
      adSetId = await findByNameTag(accessToken, `/${account}/adsets`, campaignTag(adCampaignId));
      if (!adSetId) {
        // The legal declaration is recorded before it is sent.
        const declared = mapped.adSet.dsa_beneficiary && mapped.adSet.dsa_payor
          ? { beneficiary: mapped.adSet.dsa_beneficiary, payor: mapped.adSet.dsa_payor }
          : null;
        await owned(saveDsaSnapshot(adCampaignId, lockToken, declared));
        assertPaused(mapped.adSet);
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/adsets`, accessToken, method: "POST",
          params: asParams({ ...mapped.adSet, campaign_id: campaignId }),
        });
        adSetId = res.id;
      }
      anythingCreated = true;
      await owned(saveMetaAdSetId(adCampaignId, lockToken, adSetId));
      link = { ...link, metaAdSetId: adSetId };
    }

    // ── 3 · Creative ───────────────────────────────────────────────────────
    step = "creative";
    const adTagFull = `${campaignTag(adCampaignId)}${adTag(mapped.localAdId)}`;
    let creativeId = existingAd?.metaCreativeId ?? null;
    if (!creativeId) {
      creativeId = await findByNameTag(accessToken, `/${account}/adcreatives`, adTagFull);
      if (!creativeId) {
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/adcreatives`, accessToken, method: "POST", params: asParams(mapped.creative),
        });
        creativeId = res.id;
      }
      anythingCreated = true;
      await owned(saveMetaCreativeId(adCampaignId, lockToken, mapped.localAdId, creativeId));
    }

    // ── 4 · Ad ─────────────────────────────────────────────────────────────
    step = "ad";
    let adId = existingAd?.metaAdId ?? null;
    if (!adId) {
      adId = await findByNameTag(accessToken, `/${account}/ads`, adTagFull);
      if (!adId) {
        assertPaused(mapped.ad);
        const res = await metaGraphRequest<{ id: string }>({
          path: `/${account}/ads`, accessToken, method: "POST",
          params: asParams({ ...mapped.ad, adset_id: adSetId, creative: { creative_id: creativeId } }),
        });
        adId = res.id;
      }
      anythingCreated = true;
      await owned(saveMetaAdId(adCampaignId, lockToken, mapped.localAdId, adId));
    }

    await owned(markPublished(adCampaignId, lockToken));
    const final = await getCampaignLink(adCampaignId);
    return { ok: true, link: final ?? link, resumed };
  } catch (e) {
    if (e instanceof LockLostError) {
      // Another run owns the row now; any write from us would clobber it.
      return {
        ok: false, code: "LOCK_LOST",
        message: "Otra ejecución tomó el control de esta publicación. Recarga para ver su estado.",
      };
    }

    const message =
      e instanceof MetaGraphError ? describeMetaError(e)
      : e instanceof ReconciliationError ? e.message
      : e instanceof PublishLinkError ? e.message
      : "Fallo inesperado durante la publicación.";

    try {
      await markFailed(adCampaignId, lockToken, step, message, anythingCreated);
    } catch {
      // The stale-lock window releases it; the ids already saved are kept.
    }
    return { ok: false, code: e instanceof MetaGraphError ? "META_ERROR" : "STATE_ERROR", message };
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
