import type { MetaConnection } from "@/lib/meta/connection-types";
import { connectionReadiness, isTokenExpired } from "@/lib/meta/connection-types";
import type { CampaignDraft, CampaignGeoLocation } from "./campaign-types";
import {
  validateAll, unresolvedTargeting, CTA_OPTIONS, isHttpUrl,
} from "./campaign-types";
import type { ReadinessIssue, ReadinessCode, ReadinessSection } from "./readiness-types";

/**
 * Everything about publish readiness that can be decided without calling Meta.
 *
 * Pure: no network, no server-only imports, no React. The server-only validator
 * runs this first and then adds what only Graph can answer.
 *
 * The draft's own completeness rules are NOT rewritten here — `validateAll`
 * already owns them and stays the single source. This module translates its
 * output into coded issues and adds the rules it does not have: alignment with
 * the connected ad account, resolvable targeting, geo overlap, media, CTA.
 */

/**
 * How each `validateAll` key becomes a coded issue.
 *
 * Keys are matched exactly, except the per-ad ones which arrive as
 * `ad.<id>.<field>` and are matched by suffix.
 */
const VALIDATE_ALL_MAP: Record<string, { code: ReadinessCode; section: ReadinessSection }> = {
  platform: { code: "CAMPAIGN_PLATFORM_MISSING", section: "campaign" },
  objective: { code: "CAMPAIGN_OBJECTIVE_MISSING", section: "campaign" },
  name: { code: "CAMPAIGN_NAME_MISSING", section: "campaign" },
  budgetAmount: { code: "BUDGET_INVALID", section: "campaign" },
  productId: { code: "DESTINATION_PRODUCT_MISSING", section: "campaign" },
  paymentLinkId: { code: "DESTINATION_PAYMENT_LINK_MISSING", section: "campaign" },
  customUrl: { code: "DESTINATION_URL_INVALID", section: "campaign" },
  conversionEvent: { code: "CONVERSION_EVENT_MISSING", section: "campaign" },
  includedLocations: { code: "GEO_NO_INCLUDED", section: "audience" },
  ageMin: { code: "AGE_RANGE_INVALID", section: "audience" },
  ageMax: { code: "AGE_RANGE_INVALID", section: "audience" },
  startsAt: { code: "SCHEDULE_START_MISSING", section: "campaign" },
  endsAt: { code: "SCHEDULE_INVALID", section: "campaign" },
  ads: { code: "CREATIVE_NO_ADS", section: "creative" },
};

const AD_FIELD_MAP: Record<string, { code: ReadinessCode; section: ReadinessSection }> = {
  primaryText: { code: "CREATIVE_MISSING_PRIMARY_TEXT", section: "creative" },
  headline: { code: "CREATIVE_MISSING_HEADLINE", section: "creative" },
  destinationUrl: { code: "CREATIVE_DESTINATION_URL_INVALID", section: "creative" },
};

function err(
  code: ReadinessCode,
  section: ReadinessSection,
  message: string,
  extra?: { field?: string; remediation?: string }
): ReadinessIssue {
  return { code, section, severity: "error", message, ...extra };
}

function warn(
  code: ReadinessCode,
  section: ReadinessSection,
  message: string,
  extra?: { field?: string; remediation?: string }
): ReadinessIssue {
  return { code, section, severity: "warning", message, ...extra };
}

/** Translate `validateAll` output rather than restating its rules. */
function fromValidateAll(draft: CampaignDraft): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];
  for (const [key, message] of Object.entries(validateAll(draft))) {
    const direct = VALIDATE_ALL_MAP[key];
    if (direct) {
      out.push(err(direct.code, direct.section, message, { field: key }));
      continue;
    }
    // `ad.<id>.<field>`
    const adField = key.split(".").pop() ?? "";
    const mapped = AD_FIELD_MAP[adField];
    if (mapped) out.push(err(mapped.code, mapped.section, message, { field: key }));
  }
  return out;
}

/** Connection state, from the fields the builder already receives. */
function connectionIssues(connection: MetaConnection | null): ReadinessIssue[] {
  if (!connection) {
    return [err("META_NOT_CONNECTED", "meta",
      "No hay ninguna cuenta de Meta conectada a este negocio.",
      { remediation: "Conéctala en Configuraciones → Meta Ads." })];
  }

  const out: ReadinessIssue[] = [];

  if (connection.status === "expired") {
    out.push(err("META_CONNECTION_EXPIRED", "meta",
      "La autorización con Meta caducó.",
      { remediation: "Vuelve a conectar en Configuraciones → Meta Ads." }));
  } else if (connection.status === "error") {
    out.push(err("META_CONNECTION_ERROR", "meta",
      "La última operación con Meta falló.",
      { remediation: "Revisa la conexión en Configuraciones." }));
  } else if (connection.status !== "connected") {
    out.push(err("META_CONNECTION_ERROR", "meta", "La conexión con Meta no está activa."));
  } else if (isTokenExpired(connection)) {
    // Status can lag behind the stored expiry.
    out.push(err("META_CONNECTION_EXPIRED", "meta",
      "El token de Meta ha caducado.",
      { remediation: "Vuelve a conectar en Configuraciones → Meta Ads." }));
  }

  const readiness = connectionReadiness(connection);
  if (!connection.adAccountId) {
    out.push(err("META_AD_ACCOUNT_MISSING", "meta", "No hay cuenta publicitaria seleccionada.",
      { remediation: readiness.missing.join(" · ") || undefined }));
  }
  if (!connection.pageId) {
    out.push(err("META_PAGE_MISSING", "meta",
      "No hay página de Facebook seleccionada.",
      { remediation: "La página es la identidad que firma los anuncios." }));
  }

  return out;
}

/**
 * Currency and timezone must match the ad account.
 *
 * Meta reads the budget in the account's own currency, so a draft saying USD
 * against a EUR account would silently mean euros. Drafts created before the
 * account was connected can still hold the old values.
 */
function alignmentIssues(draft: CampaignDraft, connection: MetaConnection | null): ReadinessIssue[] {
  if (!connection?.adAccountId) return [];
  const out: ReadinessIssue[] = [];

  if (connection.adAccountCurrency && draft.currency !== connection.adAccountCurrency) {
    out.push(err("CURRENCY_MISMATCH", "meta",
      `La campaña está en ${draft.currency} y la cuenta publicitaria en ${connection.adAccountCurrency}.`,
      { field: "currency", remediation: "Vuelve a abrir el paso Build para realinearla." }));
  }
  if (connection.adAccountTimezone && draft.timezone !== connection.adAccountTimezone) {
    out.push(err("TIMEZONE_MISMATCH", "meta",
      `El horario usa ${draft.timezone} y la cuenta publicitaria ${connection.adAccountTimezone}.`,
      { field: "timezone", remediation: "Vuelve a abrir el paso Build para realinearlo." }));
  }
  return out;
}

/** A pixel is only required where the conversion actually needs one. */
function pixelIssues(draft: CampaignDraft, connection: MetaConnection | null): ReadinessIssue[] {
  const needsPixel =
    draft.delivery.conversionLocation === "website" &&
    Boolean(draft.delivery.conversionEvent) &&
    (draft.objective === "sales" || draft.objective === "leads");

  if (!needsPixel || connection?.pixelId) return [];

  return [err("PIXEL_REQUIRED_MISSING", "campaign",
    "Este objetivo mide conversiones en tu web y necesita un pixel o dataset.",
    { remediation: "Selecciónalo en Configuraciones → Meta Ads." })];
}

const COUNTRY = "country";
const CITYLIKE = new Set(["city", "region", "neighborhood", "subneighborhood"]);

/**
 * Geo rules.
 *
 * Only the case Meta documents as a rejection is treated as an error: a country
 * included together with a place inside that same country. Exclusions are NOT
 * overlap — excluding a city from an included country is the normal pattern.
 *
 * Region-vs-city containment is a warning, not an error: we store the region's
 * display name but not its key, so the comparison is a string match and could
 * be wrong. Zips and geo markets are left alone entirely.
 */
function geoIssues(draft: CampaignDraft): ReadinessIssue[] {
  const a = draft.audience;
  if (a.globalReach) return [];

  const out: ReadinessIssue[] = [];
  const included = a.includedLocations;

  const countries = new Set(
    included.filter((l) => l.type === COUNTRY && l.countryCode).map((l) => l.countryCode as string)
  );

  const overlapping = included.filter(
    (l) => l.type !== COUNTRY && l.countryCode && countries.has(l.countryCode)
  );
  for (const loc of overlapping) {
    out.push(err("GEO_OVERLAP_COUNTRY_CITY", "audience",
      `«${loc.name}» está dentro de un país que ya incluyes; Meta rechaza esa combinación.`,
      { field: loc.key ?? loc.name, remediation: "Deja el país o el lugar concreto, no ambos." }));
  }

  const overlappingKeys = new Set(overlapping.map((l) => l.key));
  const regionNames = new Set(
    included.filter((l) => l.type === "region").map((l) => l.name.toLowerCase())
  );
  for (const loc of included) {
    if (loc.type !== "city" || overlappingKeys.has(loc.key)) continue;
    if (loc.region && regionNames.has(loc.region.toLowerCase())) {
      out.push(warn("GEO_OVERLAP_REGION_CITY", "audience",
        `«${loc.name}» parece estar dentro de «${loc.region}», que también incluyes.`,
        { field: loc.key ?? loc.name, remediation: "Compruébalo: podría ser un solape." }));
    }
  }

  return out;
}

/** Anything still missing its Meta id cannot be published. */
function unresolvedIssues(draft: CampaignDraft): ReadinessIssue[] {
  const CODES: Record<string, ReadinessCode> = {
    location: "GEO_UNRESOLVED",
    interest: "INTEREST_UNRESOLVED",
    audience: "CUSTOM_AUDIENCE_UNRESOLVED",
  };
  const NOUN: Record<string, string> = {
    location: "La ubicación",
    interest: "El interés",
    audience: "La audiencia",
  };
  return unresolvedTargeting(draft.audience).map((item) =>
    err(CODES[item.kind], "audience",
      `${NOUN[item.kind]} «${item.name}» se guardó sin identificador de Meta.`,
      { field: item.name, remediation: "Vuelve a seleccionarla desde la búsqueda de Meta." })
  );
}

/** Creative checks validateAll does not cover. */
function creativeIssues(draft: CampaignDraft): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];
  const ctas = new Set(CTA_OPTIONS.map((c) => c.value));

  draft.creative.ads.forEach((ad, i) => {
    const label = `Anuncio ${i + 1}`;
    if (!ad.mediaUrl) {
      out.push(err("CREATIVE_MISSING_MEDIA", "creative",
        `${label}: falta la imagen o el vídeo.`, { field: `ad.${ad.id}.mediaUrl` }));
    } else if (ad.mediaType !== "image" && ad.mediaType !== "video") {
      out.push(err("CREATIVE_MEDIA_TYPE_UNSUPPORTED", "creative",
        `${label}: el tipo de archivo no está reconocido.`, { field: `ad.${ad.id}.mediaType` }));
    }
    if (!ctas.has(ad.cta)) {
      out.push(err("CREATIVE_CTA_INVALID", "creative",
        `${label}: la llamada a la acción no es válida.`, { field: `ad.${ad.id}.cta` }));
    }
  });

  return out;
}

/** Warnings that are valid states, not failures. */
function advisoryIssues(draft: CampaignDraft): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];

  if (draft.audience.advantageAudience && draft.audience.interests.length > 0) {
    out.push(warn("ADVANTAGE_AUDIENCE_INTERESTS_IGNORED", "audience",
      "Con Audiencia Advantage+ activada, Meta ignora en gran medida los intereses manuales.",
      { remediation: "Desactívala si quieres que se apliquen." }));
  }

  // The wall clock is stored in the campaign's zone; comparing it to now is
  // approximate, which is exactly why this is a warning.
  if (draft.startsAt) {
    const at = Date.parse(draft.startsAt);
    if (Number.isFinite(at) && at < Date.now()) {
      out.push(warn("SCHEDULE_START_IN_PAST", "campaign",
        "La fecha de inicio ya pasó.",
        { field: "startsAt", remediation: "Meta empezaría a entregar de inmediato." }));
    }
  }

  return out;
}

/** Destination URL of the campaign itself, when the draft uses one. */
function destinationIssues(draft: CampaignDraft): ReadinessIssue[] {
  if (draft.destinationKind !== "url") return [];
  const url = draft.customUrl.trim();
  // An empty one is already reported by validateAll; only a malformed value
  // that slipped through is added here.
  if (url && !isHttpUrl(url)) {
    return [err("DESTINATION_URL_INVALID", "campaign",
      "La URL de destino no es válida.", { field: "customUrl" })];
  }
  return [];
}

/** Everything decidable without Meta. */
export function pureReadinessIssues(
  draft: CampaignDraft,
  connection: MetaConnection | null
): ReadinessIssue[] {
  return [
    ...connectionIssues(connection),
    ...alignmentIssues(draft, connection),
    ...fromValidateAll(draft),
    ...destinationIssues(draft),
    ...pixelIssues(draft, connection),
    ...geoIssues(draft),
    ...unresolvedIssues(draft),
    ...creativeIssues(draft),
    ...advisoryIssues(draft),
  ];
}

export type { CampaignGeoLocation };
