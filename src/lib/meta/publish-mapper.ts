import type { CampaignDraft } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";
import { toMinorUnits } from "./money";
import { zonedLocalToOffsetIso, isValidTimeZone } from "@/lib/timezone";

/**
 * Draft → Meta payloads, version 1.
 *
 * Deliberately narrow. It supports exactly one shape of campaign and refuses
 * everything else by name instead of approximating it: an ad set that quietly
 * drops the languages you chose, or swaps your bid strategy for one it knows,
 * is worse than an error — it spends money on something you did not ask for.
 *
 * Pure: no network, no database. Everything here is a function of the draft.
 */

// ── Deterministic names ──────────────────────────────────────────────────────

/**
 * Every object carries our local ids in its name.
 *
 * This is NOT identity — the ids we persist are. It exists for one recovery
 * case: Meta created the object and we lost the response before writing the id.
 * Then the name is the only thread back to it.
 */
export function campaignTag(adCampaignId: string): string {
  return `[ma:${adCampaignId}]`;
}
export function adTag(localAdId: string): string {
  return `[ad:${localAdId}]`;
}

/**
 * Meta caps object names at 400 characters.
 *
 * The tag is the part that must survive: a truncated uuid could match a
 * different campaign, which is the exact accident the full uuid exists to
 * prevent. So the human-readable half is what gets cut.
 */
const NAME_LIMIT = 400;

function withTag(tag: string, human: string): string {
  const room = NAME_LIMIT - tag.length - 1;
  const trimmed = human.trim();
  const kept = trimmed.length > room ? trimmed.slice(0, Math.max(room, 0)) : trimmed;
  return kept ? `${tag} ${kept}` : tag;
}

export function metaCampaignName(adCampaignId: string, draftName: string): string {
  return withTag(campaignTag(adCampaignId), draftName);
}
export function metaAdSetName(adCampaignId: string): string {
  return `${campaignTag(adCampaignId)} Grupo 1`;
}
export function metaCreativeName(adCampaignId: string, localAdId: string): string {
  return `${campaignTag(adCampaignId)}${adTag(localAdId)} Creative`;
}
export function metaAdName(adCampaignId: string, localAdId: string, index: number): string {
  return `${campaignTag(adCampaignId)}${adTag(localAdId)} Anuncio ${index + 1}`;
}

// ── Supported combination ────────────────────────────────────────────────────

export interface PublishContext {
  adCampaignId: string;
  adAccountId: string;
  pageId: string;
  currency: string;
  /** The AD ACCOUNT's timezone, read server-side — not whatever the draft claims. */
  timezone: string;
  /**
   * DSA transparency (EU): who is promoted and who pays. Both appear publicly
   * in the EU ad library, so they are legal declarations, not labels — the
   * orchestrator supplies them from configuration, never inferred from a page
   * name, and the mapper refuses to build an ad set without them.
   */
  dsaBeneficiary: string;
  dsaPayor: string;
}

export interface CampaignPayload {
  name: string;
  objective: "OUTCOME_TRAFFIC";
  status: "PAUSED";
  special_ad_categories: string[];
  buying_type: "AUCTION";
  /**
   * Mandatory when the budget lives on the ad set instead of the campaign —
   * Meta refuses the create without it (proven by the first smoke run,
   * fbtrace ArXfrGupWnbyAC9r6waNzSE). False: with a single ad set there is
   * nothing to share, and true would let Meta move budget between groups.
   */
  is_adset_budget_sharing_enabled: false;
}

export interface AdSetPayload {
  name: string;
  campaign_id: string;
  status: "PAUSED";
  optimization_goal: "LINK_CLICKS";
  billing_event: "IMPRESSIONS";
  bid_strategy: "LOWEST_COST_WITHOUT_CAP";
  daily_budget: number;
  start_time: string;
  targeting: Record<string, unknown>;
  /** Required for EU-targeted ad sets (code 100 / subcode 3858081 without it). */
  dsa_beneficiary: string;
  dsa_payor: string;
}

export interface CreativePayload {
  name: string;
  object_story_spec: Record<string, unknown>;
}

export interface AdPayload {
  name: string;
  adset_id: string;
  creative: { creative_id: string };
  status: "PAUSED";
}

export type MapperResult =
  | {
      supported: true;
      localAdId: string;
      campaign: CampaignPayload;
      adSet: Omit<AdSetPayload, "campaign_id">;
      creative: CreativePayload;
      ad: Omit<AdPayload, "adset_id" | "creative">;
    }
  | { supported: false; reasons: string[] };

/** CTA values this first version is willing to send. */
const CTA_MAP: Record<string, string> = {
  shop_now: "SHOP_NOW",
  learn_more: "LEARN_MORE",
  sign_up: "SIGN_UP",
  subscribe: "SUBSCRIBE",
  contact_us: "CONTACT_US",
};

const UNSUPPORTED = "publish v1 no soporta";

/**
 * Build the four payloads, or say precisely why the draft is out of scope.
 *
 * The refusal list is exhaustive rather than early-return: seeing every reason
 * at once is what makes it possible to decide whether v2 is worth it.
 */
export function mapDraftToMetaV1(draft: CampaignDraft, ctx: PublishContext): MapperResult {
  const reasons: string[] = [];
  const a = draft.audience;
  const d = draft.delivery;

  // ── Campaign shape ─────────────────────────────────────────────────────────
  if (draft.objective !== "traffic") {
    reasons.push(`${UNSUPPORTED} el objetivo «${draft.objective ?? "sin definir"}»; solo «traffic».`);
  }
  if (d.specialCategory !== "none") {
    reasons.push(`${UNSUPPORTED} categorías especiales de anuncios.`);
  }
  if (d.bidStrategy !== "highest_volume") {
    reasons.push(`${UNSUPPORTED} la estrategia de puja «${d.bidStrategy}»; solo «highest_volume».`);
  }
  if (draft.budgetType !== "daily") {
    reasons.push(`${UNSUPPORTED} presupuesto total; solo presupuesto diario.`);
  }
  if (d.budgetControl !== "adset") {
    reasons.push(`${UNSUPPORTED} presupuesto a nivel de campaña (CBO); ponlo a nivel de grupo.`);
  }
  if (d.minimumDailySpend !== null) {
    reasons.push(`${UNSUPPORTED} gasto mínimo diario.`);
  }
  if (d.dynamicCreative) {
    reasons.push(`${UNSUPPORTED} creatividad dinámica.`);
  }

  // ── Schedule ───────────────────────────────────────────────────────────────
  // The instant is resolved in the AD ACCOUNT's zone, not the draft's. The two
  // are kept aligned by the builder, but a draft saved before the account was
  // bound could carry a stale zone — and scheduling an ad set an hour off is
  // exactly the kind of silent wrong result worth refusing over.
  let startTime = "";
  if (!draft.startsAt) {
    reasons.push("Falta la fecha de inicio.");
  } else if (!isValidTimeZone(ctx.timezone)) {
    reasons.push("La cuenta publicitaria no tiene una zona horaria utilizable.");
  } else if (draft.timezone && draft.timezone !== ctx.timezone) {
    reasons.push(
      `La zona horaria del borrador («${draft.timezone}») no coincide con la de la cuenta ` +
      `publicitaria («${ctx.timezone}»). Vuelve a abrir la campaña para realinearla.`
    );
  } else {
    const resolved = zonedLocalToOffsetIso(draft.startsAt, ctx.timezone);
    if (!resolved) reasons.push("La fecha de inicio no es válida.");
    else startTime = resolved;
  }
  if (draft.endsAt) reasons.push(`${UNSUPPORTED} fecha de fin.`);

  // ── Conversion ─────────────────────────────────────────────────────────────
  if (d.conversionLocation !== "website") {
    reasons.push(`${UNSUPPORTED} destinos de mensajes.`);
  }

  // ── Targeting ──────────────────────────────────────────────────────────────
  if (a.globalReach) {
    reasons.push(`${UNSUPPORTED} alcance global; elige exactamente un país.`);
  }
  const countries = a.includedLocations.filter((l) => l.type === "country" && l.countryCode);
  const nonCountries = a.includedLocations.filter((l) => l.type !== "country");
  if (nonCountries.length > 0) {
    reasons.push(`${UNSUPPORTED} ciudades ni regiones; solo un país.`);
  }
  if (countries.length !== 1) {
    reasons.push(`${UNSUPPORTED} ${countries.length} países; debe ser exactamente uno.`);
  }
  if (a.excludedLocations.length > 0) {
    reasons.push(`${UNSUPPORTED} exclusiones geográficas.`);
  }
  if (!a.advantageAudience) {
    reasons.push(`${UNSUPPORTED} audiencia manual; activa Audiencia Advantage+.`);
  }
  if (a.interests.length > 0) reasons.push(`${UNSUPPORTED} intereses.`);
  if (a.customAudiencesIncluded.length > 0 || a.customAudiencesExcluded.length > 0) {
    reasons.push(`${UNSUPPORTED} audiencias personalizadas.`);
  }
  if (a.languages.length > 0) {
    reasons.push(`${UNSUPPORTED} idiomas.`);
  }
  if (!d.advantagePlacements) {
    reasons.push(`${UNSUPPORTED} ubicaciones manuales; activa Advantage+ placements.`);
  }

  // ── Creative ───────────────────────────────────────────────────────────────
  const ads = draft.creative.ads;
  if (ads.length !== 1) {
    reasons.push(`${UNSUPPORTED} ${ads.length} anuncios; debe ser exactamente uno.`);
  }
  const ad = ads[0];
  if (ad) {
    if (ad.mediaType !== "image") {
      reasons.push(`${UNSUPPORTED} vídeo; solo imagen.`);
    }
    if (!ad.mediaUrl) reasons.push("El anuncio no tiene imagen.");
    if (!ad.primaryText.trim()) reasons.push("El anuncio no tiene texto principal.");
    if (!ad.headline.trim()) reasons.push("El anuncio no tiene título.");
    if (!CTA_MAP[ad.cta]) {
      reasons.push(`${UNSUPPORTED} la llamada a la acción «${ad.cta}».`);
    }
  }

  // The destination link: the campaign URL, or the ad's own override.
  const link = (ad?.destinationUrl.trim() || draft.customUrl.trim() || "").trim();
  if (!link) reasons.push("No hay URL de destino.");

  // ── Context ────────────────────────────────────────────────────────────────
  if (!ctx.pageId) reasons.push("No hay página de Facebook seleccionada.");
  if (!ctx.adAccountId) reasons.push("No hay cuenta publicitaria seleccionada.");
  if (!ctx.dsaBeneficiary.trim()) reasons.push("Falta el beneficiario DSA del anuncio.");
  if (!ctx.dsaPayor.trim()) reasons.push("Falta el pagador DSA del anuncio.");

  let dailyBudget = 0;
  try {
    dailyBudget = toMinorUnits(draft.budgetAmount, ctx.currency);
  } catch (e) {
    reasons.push(e instanceof Error ? e.message : "Importe de presupuesto no válido.");
  }

  if (reasons.length > 0 || !ad) return { supported: false, reasons };

  // ── Payloads ───────────────────────────────────────────────────────────────
  const countryCode = countries[0].countryCode as string;

  return {
    supported: true,
    localAdId: ad.id,
    campaign: {
      name: metaCampaignName(ctx.adCampaignId, draft.name),
      objective: "OUTCOME_TRAFFIC",
      status: "PAUSED",
      special_ad_categories: [],
      buying_type: "AUCTION",
      is_adset_budget_sharing_enabled: false,
    },
    adSet: {
      name: metaAdSetName(ctx.adCampaignId),
      status: "PAUSED",
      // Verified against Meta's docs: LINK_CLICKS is a valid optimization goal
      // for OUTCOME_TRAFFIC to a website, and pairing an action goal with
      // billing_event IMPRESSIONS is oCPM — the documented default. It needs no
      // pixel and no promoted_object, which is why v1 uses it rather than
      // LANDING_PAGE_VIEWS (a better goal, but one more moving part).
      optimization_goal: "LINK_CLICKS",
      billing_event: "IMPRESSIONS",
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      daily_budget: dailyBudget,
      // Explicit offset, resolved for this instant in the ad account's zone.
      // Never a bare date: "2026-09-10" would let Meta pick the meaning.
      start_time: startTime,
      targeting: {
        geo_locations: { countries: [countryCode] },
        targeting_automation: { advantage_audience: 1 },
      },
      dsa_beneficiary: ctx.dsaBeneficiary.trim(),
      dsa_payor: ctx.dsaPayor.trim(),
    },
    creative: {
      name: metaCreativeName(ctx.adCampaignId, ad.id),
      object_story_spec: {
        page_id: ctx.pageId,
        link_data: {
          link,
          message: ad.primaryText.trim(),
          name: ad.headline.trim(),
          ...(ad.description.trim() ? { description: ad.description.trim() } : {}),
          // Documented: "URL of a picture to use in the post. Specify this
          // field or image_hash but not both" — Meta fetches it and copies it
          // into the ad account's image library. Requires the URL to be
          // publicly reachable, which the Supabase public bucket is.
          picture: ad.mediaUrl,
          call_to_action: {
            type: CTA_MAP[ad.cta],
            // Meta requires this to equal link_data.link exactly.
            value: { link },
          },
        },
      },
    },
    ad: {
      name: metaAdName(ctx.adCampaignId, ad.id, 0),
      status: "PAUSED",
    },
  };
}
