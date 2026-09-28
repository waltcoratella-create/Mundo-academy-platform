"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById, getBusinessPaymentLinks } from "@/lib/supabase/queries";
import { getMetaAccessToken, getMetaConnectionForBusiness } from "@/lib/meta/connections";
import { validateMetaPublishReadiness } from "@/lib/meta/publish-readiness";
import { mapDraftToMetaV1 } from "@/lib/meta/publish-mapper";
import {
  publishCampaignToMeta, isPublishKillSwitchOn, type PublishFailureCode,
} from "@/lib/meta/publish";
import { getDsaSettings } from "@/lib/meta/ad-settings";
import { dsaRequiredFor } from "@/lib/meta/dsa";
import { getCampaignLink, getAdLinks } from "@/lib/meta/publish-links";
import {
  readMetaObjectStatus, adsManagerCampaignUrl, type MetaObjectStatus,
} from "@/lib/meta/published-status";
import { zonedLocalToOffsetIso } from "@/lib/timezone";
import { getCampaignDraft } from "./campaign-actions";
import type { ReadinessResult } from "./create/readiness-types";
import type { CampaignPublishState } from "@/lib/meta/publish-state";

/**
 * Publishing a campaign to Meta — PAUSED only.
 *
 * Every action re-establishes, regardless of what the client sent:
 *  · the caller owns the business (Clerk session → owner_id);
 *  · the campaign belongs to that business (query scoped by business_id);
 *  · the Meta connection, ad account and page are THAT business's row.
 * The client sends ids and a version stamp, nothing else, and none of these
 * return types can carry a token.
 */

const FORBIDDEN = "No tienes permiso sobre este negocio.";
const NOT_FOUND = "Campaña no encontrada.";

async function ownedBusiness(businessId: string) {
  const { userId } = await auth();
  if (!userId) return null;
  return getBusinessById(businessId, userId);
}

/** The campaign row, scoped to the verified business. */
async function ownedCampaignRow(businessId: string, campaignId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ad_campaigns")
    .select("id, status, updated_at")
    .eq("id", campaignId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { id: string; status: string | null; updated_at: string };
}

async function loadDraft(businessId: string, campaignId: string) {
  const links = await getBusinessPaymentLinks(businessId);
  return getCampaignDraft({
    businessId,
    campaignId,
    paymentLinks: links.links.map((l) => ({
      id: l.id, title: l.title, slug: l.slug, productName: l.product_name, active: l.active,
    })),
  });
}

// ── Preview ──────────────────────────────────────────────────────────────────

export interface PublishPreview {
  /** Version stamp of the draft this preview describes; publish must match it. */
  version: string;
  publishState: CampaignPublishState;
  killSwitch: boolean;
  /** Every reason the button is disabled, in plain language. Empty = can publish. */
  blockers: string[];
  readiness: ReadinessResult | null;
  summary: {
    campaignName: string;
    adAccountName: string | null;
    adAccountId: string | null;
    currency: string;
    dailyBudget: string;
    startsAt: string | null;
    timezone: string;
    countries: string[];
    advantageAudience: boolean;
    pageName: string | null;
    dsaRequired: boolean;
    dsaBeneficiary: string | null;
    dsaPayor: string | null;
  };
}

export type PreviewResult = { ok: true; preview: PublishPreview } | { ok: false; error: string };

/**
 * Exactly what "Crear en pausa" would send, computed from the SAVED draft.
 *
 * Unsaved edits in the browser are deliberately ignored: what the person
 * confirms must be what gets published. The version stamp enforces it.
 */
export async function getPublishPreview(businessId: string, campaignId: string): Promise<PreviewResult> {
  const business = await ownedBusiness(businessId);
  if (!business) return { ok: false, error: FORBIDDEN };
  const row = await ownedCampaignRow(business.id, campaignId);
  if (!row) return { ok: false, error: NOT_FOUND };

  const loaded = await loadDraft(business.id, campaignId);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const { draft, publishState } = loaded;

  const connection = await getMetaConnectionForBusiness(business.id);
  const dsa = await getDsaSettings(business.id).catch(() => null);
  const readiness = await validateMetaPublishReadiness({ businessId: business.id, draft });

  const countries = draft.audience.includedLocations
    .filter((l) => l.type === "country" && l.countryCode)
    .map((l) => l.countryCode as string);
  const dsaRequired = countries.some((c) => dsaRequiredFor(c));

  const blockers: string[] = [];
  const killSwitch = isPublishKillSwitchOn();
  if (killSwitch) blockers.push("La publicación en Meta está desactivada temporalmente.");
  if (publishState === "published") blockers.push("Esta campaña ya está publicada en Meta.");
  if (publishState === "publishing") blockers.push("Ya hay una publicación en curso.");
  if (!readiness.checkedMeta) blockers.push("No se pudieron completar las comprobaciones con Meta.");
  for (const e of readiness.errors) blockers.push(e.message);

  // v1's own limits, so the button explains them instead of failing later.
  if (connection?.adAccountId && connection.pageId) {
    const mapped = mapDraftToMetaV1(draft, {
      adCampaignId: campaignId,
      adAccountId: connection.adAccountId,
      pageId: connection.pageId,
      currency: connection.adAccountCurrency ?? draft.currency,
      timezone: connection.adAccountTimezone ?? "",
      dsa: dsa ? { beneficiary: dsa.beneficiary, payor: dsa.payor } : null,
    });
    if (!mapped.supported) blockers.push(...mapped.reasons);
  }

  return {
    ok: true,
    preview: {
      version: row.updated_at,
      publishState,
      killSwitch,
      blockers: Array.from(new Set(blockers)),
      readiness,
      summary: {
        campaignName: draft.name,
        adAccountName: connection?.adAccountName ?? null,
        adAccountId: connection?.adAccountId ?? null,
        currency: draft.currency,
        dailyBudget: draft.budgetAmount ? `${draft.budgetAmount} ${draft.currency} / día` : "—",
        startsAt: draft.startsAt ? zonedLocalToOffsetIso(draft.startsAt, draft.timezone) : null,
        timezone: draft.timezone,
        countries: draft.audience.includedLocations.map((l) => l.name),
        advantageAudience: draft.audience.advantageAudience,
        pageName: connection?.pageName ?? null,
        dsaRequired,
        dsaBeneficiary: dsa?.beneficiary ?? null,
        dsaPayor: dsa?.payor ?? null,
      },
    },
  };
}

// ── Publish ──────────────────────────────────────────────────────────────────

export type PublishActionResult =
  | { ok: true; publishState: "published" }
  | {
      ok: false;
      code: PublishFailureCode | "FORBIDDEN" | "NOT_FOUND" | "DRAFT_CHANGED";
      error: string;
      reasons?: string[];
    };

/**
 * Create the campaign in Meta, PAUSED. Resumes an incomplete publish.
 *
 * `expectedVersion` is the stamp from the preview the person confirmed; if the
 * draft changed since, nothing is sent and they are asked to review again.
 */
export async function publishCampaign(
  businessId: string,
  campaignId: string,
  expectedVersion: string
): Promise<PublishActionResult> {
  // Also checked inside the pipeline; here so a stopped environment does no
  // work at all.
  if (isPublishKillSwitchOn()) {
    return { ok: false, code: "PUBLISH_DISABLED", error: "La publicación en Meta está desactivada temporalmente." };
  }

  const business = await ownedBusiness(businessId);
  if (!business) return { ok: false, code: "FORBIDDEN", error: FORBIDDEN };

  const row = await ownedCampaignRow(business.id, campaignId);
  if (!row) return { ok: false, code: "NOT_FOUND", error: NOT_FOUND };
  if (row.status === "published") {
    return { ok: false, code: "ALREADY_PUBLISHED", error: "Esta campaña ya está publicada en Meta." };
  }
  if (row.updated_at !== expectedVersion) {
    return {
      ok: false, code: "DRAFT_CHANGED",
      error: "La campaña cambió desde que la revisaste. Vuelve a abrir la revisión antes de publicar.",
    };
  }

  const loaded = await loadDraft(business.id, campaignId);
  if (!loaded.ok) return { ok: false, code: "NOT_FOUND", error: loaded.error };

  const outcome = await publishCampaignToMeta({
    businessId: business.id,
    adCampaignId: campaignId,
    draft: loaded.draft,
  });

  revalidatePath(`/mis-negocios/${business.id}/anuncios`);
  revalidatePath(`/mis-negocios/${business.id}/anuncios/${campaignId}/edit`);

  if (!outcome.ok) {
    return { ok: false, code: outcome.code, error: outcome.message, reasons: outcome.reasons };
  }
  return { ok: true, publishState: "published" };
}

// ── Live status ──────────────────────────────────────────────────────────────

export type PublishedStatusResult =
  | { ok: true; objects: MetaObjectStatus[]; adsManagerUrl: string | null }
  | { ok: false; error: string };

/** Read status/effective_status/review of the objects this campaign created. */
export async function getPublishedCampaignStatus(
  businessId: string,
  campaignId: string
): Promise<PublishedStatusResult> {
  const business = await ownedBusiness(businessId);
  if (!business) return { ok: false, error: FORBIDDEN };
  const row = await ownedCampaignRow(business.id, campaignId);
  if (!row) return { ok: false, error: NOT_FOUND };

  const [link, adLinks, connection] = await Promise.all([
    getCampaignLink(campaignId),
    getAdLinks(campaignId),
    getMetaConnectionForBusiness(business.id),
  ]);
  if (!link) return { ok: true, objects: [], adsManagerUrl: null };

  const token = await getMetaAccessToken(business.id);
  if (!token) return { ok: false, error: "La conexión con Meta no está activa; reconéctala para ver el estado." };

  const targets: Array<[MetaObjectStatus["kind"], string]> = [];
  if (link.metaCampaignId) targets.push(["campaign", link.metaCampaignId]);
  if (link.metaAdSetId) targets.push(["adset", link.metaAdSetId]);
  for (const a of adLinks) {
    if (a.metaCreativeId) targets.push(["creative", a.metaCreativeId]);
    if (a.metaAdId) targets.push(["ad", a.metaAdId]);
  }

  const objects = await Promise.all(targets.map(([kind, id]) => readMetaObjectStatus(token, kind, id)));

  return {
    ok: true,
    objects,
    adsManagerUrl: connection?.adAccountId && link.metaCampaignId
      ? adsManagerCampaignUrl(connection.adAccountId, link.metaCampaignId)
      : null,
  };
}
