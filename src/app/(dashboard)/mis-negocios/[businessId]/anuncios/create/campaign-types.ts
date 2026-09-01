import { utcToZonedLocal, nowInZone, isValidTimeZone } from "@/lib/timezone";

// Campaign-builder contracts + validation.
//
// Deliberately free of React and Supabase imports so the wizard (client) and the
// server action (server) can share the exact same shapes and rules — the client
// validates for UX, the server re-validates because client input is untrusted.
//
// Nothing here talks to Meta. `platform` is fixed to "meta" so the row is ready
// for a future integration, but publishing is not wired.

export type CampaignObjective = "sales" | "leads" | "engagement" | "traffic" | "awareness";
export type AdPlatform = "meta" | "tiktok" | "google_ads" | "snapchat" | "x" | "reddit";
export type BudgetType = "daily" | "lifetime";
export type DestinationKind = "product" | "payment_link" | "url";
export type CampaignStatus = "draft" | "in_review" | "active" | "paused" | "archived";
export type Gender = "all" | "female" | "male";
export type MediaType = "image" | "video";

export const OBJECTIVES: CampaignObjective[] = ["sales", "leads", "engagement", "traffic", "awareness"];

/**
 * `engagement` is NOT yet allowed by the live check constraint
 * (ad_campaigns_objective_chk). Saving it fails with 23514 until the migration
 * in the report is applied; campaign-actions surfaces that as a clear message.
 */
export const OBJECTIVES_NEEDING_MIGRATION: CampaignObjective[] = ["engagement"];
export const BUDGET_TYPES: BudgetType[] = ["daily", "lifetime"];
export const STATUSES: CampaignStatus[] = ["draft", "in_review", "active", "paused", "archived"];

export const TOTAL_STEPS = 3;

/** The three phases the header stepper shows, mirroring Whop's flow. */
export type WizardPhase = "campaign" | "build" | "creatives";

export const PHASES: { key: WizardPhase; label: string }[] = [
  { key: "campaign",  label: "Campaign" },
  { key: "build",     label: "Build" },
  { key: "creatives", label: "Creatives" },
];

/**
 * Steps keep their existing identity and validation; only their presentation is
 * grouped into the three phases. Campaign is now a single complete step.
 */
export function phaseOfStep(step: number): WizardPhase {
  if (step <= 1) return "campaign";
  if (step <= 2) return "build";
  return "creatives";
}

/** Stable id for an ad. Falls back when crypto.randomUUID is unavailable (SSR). */
export function newAdId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ad_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Daily-budget presets offered under the amount field. */
export const BUDGET_PRESETS = [200, 1000, 5000];

/** Meta's own floor/ceiling — mirrored so the draft stays portable later. */
export const AGE_MIN = 13;
export const AGE_MAX = 65;

/** Options the Build step needs; previously declared in StepProduct. */
export interface ProductOption {
  id: string;
  name: string;
  price: number;
  currency: string;
  status: string;
}

export interface PaymentLinkOption {
  id: string;
  title: string;
  slug: string;
  productName: string;
  active: boolean;
}

export type ConversionLocation = "website" | "message";

/**
 * What the builder knows about the Meta ad account this business uses.
 *
 * Carries no token and no secret — only the few display fields the wizard
 * needs, so it is safe to hand to a Client Component.
 *
 * Two independent facts, deliberately not collapsed into one flag:
 *
 *  · `bound` — we know WHICH ad account this business advertises from, so its
 *    currency and timezone are the source of truth and both controls lock.
 *    Meta reads a budget in the account's own currency, so a builder saying USD
 *    against a EUR account would silently mean euros. This stays true when the
 *    authorisation expires: the account did not change, only the token did.
 *
 *  · `apiAvailable` — the stored credential can be used for live Graph calls
 *    right now. Only this one gates the geo search.
 */
export interface MetaAccountBinding {
  bound: boolean;
  apiAvailable: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  currency: string | null;
  timezone: string | null;
}

export const NO_META_ACCOUNT: MetaAccountBinding = {
  bound: false,
  apiAvailable: false,
  adAccountId: null,
  adAccountName: null,
  currency: null,
  timezone: null,
};

/**
 * The account's values win when present, otherwise the existing fallbacks
 * stand. Never invents a currency or a zone.
 */
export function effectiveCurrency(meta: MetaAccountBinding, fallback: string): string {
  return meta.bound && meta.currency ? meta.currency : fallback;
}

export function effectiveTimezone(meta: MetaAccountBinding, fallback: string): string {
  return meta.bound && meta.timezone ? meta.timezone : fallback;
}

/**
 * Delivery configuration: where/how the campaign is delivered.
 *
 * Persisted to `ad_campaigns.delivery` (jsonb). Kept strictly separate from
 * `audience`, which is targeting only. Nothing here is sent to Meta yet.
 */
export interface CampaignDelivery {
  // Build
  conversionLocation: ConversionLocation;
  conversionEvent: string;
  advantagePlacements: boolean;
  // Campaign → advanced options
  budgetControl: string;
  bidStrategy: string;
  specialCategory: string;
  // Build → advanced options
  /**
   * Optional ad-set spend floor, distinct from Campaign's daily budget.
   * null = "no minimum"; 0 would be a real (and meaningless) floor, so the
   * absence is kept explicit rather than collapsed into a number.
   */
  minimumDailySpend: number | null;
  dynamicCreative: boolean;
}

export const CONVERSION_LOCATIONS: {
  value: ConversionLocation;
  label: string;
  description: string;
  available: boolean;
}[] = [
  { value: "website", label: "Sitio web",             description: "Lleva a la gente a tu página.",        available: true },
  { value: "message", label: "Destinos de mensajes",  description: "Messenger, Instagram o WhatsApp.",     available: false },
];

/** Standard web conversion events. No Pixel IDs yet. */
export const CONVERSION_EVENTS = [
  { value: "purchase",              label: "Compra" },
  { value: "lead",                  label: "Cliente potencial" },
  { value: "complete_registration", label: "Registro completado" },
  { value: "view_content",          label: "Visualización de contenido" },
];

export const MIN_AGE_OPTIONS = [18, 21, 25, 30];

/**
 * One targeted place, as Meta understands it.
 *
 * `key` is Meta's targeting id and is the only field the Marketing API accepts;
 * names are display-only. Entries saved before the geo search existed carry
 * `key: null` — they are shown, kept and re-saved, but they are NOT publishable
 * and must be re-picked through the search. Nothing here ever invents a key.
 */
export interface CampaignGeoLocation {
  key: string | null;
  name: string;
  /** country | region | city | zip | geo_market | electoral_district | … */
  type: string | null;
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
}

/** Meta's location types, used to scope the search request. */
export const GEO_LOCATION_TYPES = [
  "country", "region", "city", "zip", "geo_market", "electoral_district",
];

export const GEO_MIN_QUERY = 2;
export const GEO_SEARCH_LIMIT = 10;
export const GEO_DEBOUNCE_MS = 350;

const GEO_TYPE_LABEL: Record<string, string> = {
  country: "País",
  region: "Región",
  city: "Ciudad",
  zip: "Código postal",
  geo_market: "Mercado",
  electoral_district: "Distrito electoral",
  neighborhood: "Barrio",
  subneighborhood: "Subbarrio",
};

/**
 * Secondary line for a chip or a search row.
 *
 * Meta returns several "Madrid" (city in Spain, region in Spain, city in
 * Colombia), so the type and the containing region/country are what make the
 * options distinguishable. Returns "" when there is nothing extra to add.
 */
export function geoLocationContext(loc: CampaignGeoLocation): string {
  const parts: string[] = [];
  if (loc.type) parts.push(GEO_TYPE_LABEL[loc.type] ?? loc.type);
  if (loc.region && loc.region !== loc.name) parts.push(loc.region);
  if (loc.countryName && loc.countryName !== loc.name) parts.push(loc.countryName);
  else if (!loc.countryName && loc.countryCode) parts.push(loc.countryCode);
  return parts.join(" · ");
}

/** A stable identity for React keys and de-duplication. */
export function geoLocationId(loc: CampaignGeoLocation): string {
  return loc.key ?? `name:${loc.name}`;
}

/** Locations that carry no Meta key cannot be published. */
export function unresolvedLocations(a: CampaignAudience): CampaignGeoLocation[] {
  return [...a.includedLocations, ...a.excludedLocations].filter((l) => !l.key);
}

/**
 * One detailed-targeting interest, as Meta understands it.
 *
 * `id` is what `targeting.flexible_spec` accepts; the name is display-only.
 * `path` is Meta's taxonomy ("Intereses › Fitness › Yoga") and is what makes
 * two same-named interests distinguishable, the way region/country does for
 * places. `id: null` marks a value saved before this search existed.
 */
export interface CampaignInterest {
  id: string | null;
  name: string;
  path: string[];
  topic: string | null;
  audienceSizeLower: number | null;
  audienceSizeUpper: number | null;
}

/**
 * One Custom Audience already saved in the connected ad account.
 *
 * Never created here — only listed and referenced by id. `deliveryStatus` is
 * kept so an audience Meta considers unusable is visible as such instead of
 * silently failing at publish time.
 */
export interface CampaignCustomAudience {
  id: string | null;
  name: string;
  subtype: string | null;
  approximateCount: number | null;
  deliveryStatus: string | null;
}

export const INTEREST_MIN_QUERY = 2;
export const INTEREST_SEARCH_LIMIT = 15;

const INTEREST_ROOT = "Interests";

/** Secondary line for an interest: its taxonomy path, minus the root. */
export function interestContext(i: CampaignInterest): string {
  const trail = i.path.filter((p) => p && p !== INTEREST_ROOT);
  if (trail.length) return trail.join(" › ");
  return i.topic ?? "";
}

export function interestId(i: CampaignInterest): string {
  return i.id ?? `name:${i.name}`;
}

const AUDIENCE_SUBTYPE_LABEL: Record<string, string> = {
  CUSTOM: "Personalizada",
  WEBSITE: "Sitio web",
  APP: "App",
  OFFLINE_CONVERSION: "Conversión offline",
  CLAIM: "Claim",
  ENGAGEMENT: "Interacción",
  LOOKALIKE: "Similar",
  VIDEO: "Vídeo",
  BAG_OF_ACCOUNTS: "Cuentas",
  STUDY_RULE_AUDIENCE: "Estudio",
  FOX: "Fox",
};

/** Secondary line for a custom audience: subtype, size and delivery state. */
export function customAudienceContext(a: CampaignCustomAudience): string {
  const parts: string[] = [];
  if (a.subtype) parts.push(AUDIENCE_SUBTYPE_LABEL[a.subtype] ?? a.subtype);
  if (typeof a.approximateCount === "number" && a.approximateCount >= 0) {
    parts.push(`~${a.approximateCount.toLocaleString("es-ES")} personas`);
  }
  // Meta reports readiness per audience; anything but "ready" matters here.
  if (a.deliveryStatus && a.deliveryStatus.toLowerCase() !== "ready") {
    parts.push(a.deliveryStatus);
  }
  return parts.join(" · ");
}

export function customAudienceId(a: CampaignCustomAudience): string {
  return a.id ?? `name:${a.name}`;
}

/** What still blocks publishing, across every targeting family. */
export interface UnresolvedTargetingItem {
  kind: "location" | "interest" | "audience";
  name: string;
}

/**
 * Every targeting value still missing its Meta id.
 *
 * Deliberately not wired to validation: a draft with unresolved values saves
 * fine. This is the hook a future publish gate calls to refuse instead.
 */
export function unresolvedTargeting(a: CampaignAudience): UnresolvedTargetingItem[] {
  const out: UnresolvedTargetingItem[] = [];
  for (const l of unresolvedLocations(a)) out.push({ kind: "location", name: l.name });
  for (const i of a.interests) if (!i.id) out.push({ kind: "interest", name: i.name });
  for (const c of [...a.customAudiencesIncluded, ...a.customAudiencesExcluded]) {
    if (!c.id) out.push({ kind: "audience", name: c.name });
  }
  return out;
}

export interface CampaignAudience {
  /** true → Meta delivers worldwide and the location lists are ignored. */
  globalReach: boolean;
  includedLocations: CampaignGeoLocation[];
  excludedLocations: CampaignGeoLocation[];
  /** Let Meta pick the audience; when off, the manual controls below apply. */
  advantageAudience: boolean;
  ageMin: number;
  ageMax: number;
  gender: Gender;
  /**
   * Detailed targeting. Only meaningful while `advantageAudience` is off —
   * Meta ignores manual detailed targeting under Advantage+ — but the list is
   * kept either way so turning Advantage+ off restores what was chosen.
   */
  interests: CampaignInterest[];
  /** Empty = target every language, matching the reference's copy. */
  languages: string[];
  /**
   * Meta Custom Audiences. Distinct from the geographic lists above — these are
   * saved audiences, not places. Stays empty until Meta is connected; nothing
   * fabricates entries here.
   */
  customAudiencesIncluded: CampaignCustomAudience[];
  customAudiencesExcluded: CampaignCustomAudience[];
}

/** One ad inside the group. Each uploaded file becomes one of these. */
export interface CampaignAd {
  id: string;
  mediaUrl: string | null;
  mediaType: MediaType | null;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  destinationUrl: string;
}

/**
 * The `creative` jsonb.
 *
 * Was a single ad's fields at the top level; now holds a list. Both shapes are
 * read by `normalizeCreative`, so existing rows open as a one-ad campaign and
 * no SQL migration is needed — the column is already jsonb.
 */
export interface CampaignCreative {
  ads: CampaignAd[];
}

export function emptyAd(destinationUrl = ""): CampaignAd {
  return {
    id: newAdId(),
    mediaUrl: null,
    mediaType: null,
    primaryText: "",
    headline: "",
    description: "",
    cta: "shop_now",
    destinationUrl,
  };
}

export const BUDGET_CONTROL_OPTIONS = [
  { value: "campaign", label: "Presupuesto de campaña" },
  { value: "adset",    label: "Presupuesto por grupo" },
];
export const BID_STRATEGY_OPTIONS = [
  { value: "highest_volume", label: "Mayor volumen" },
  { value: "cost_cap",       label: "Límite de coste" },
  { value: "bid_cap",        label: "Límite de puja" },
];
export const SPECIAL_CATEGORY_OPTIONS = [
  { value: "none",        label: "Ninguno" },
  { value: "credit",      label: "Crédito" },
  { value: "employment",  label: "Empleo" },
  { value: "housing",     label: "Vivienda" },
  { value: "social",      label: "Temas sociales, elecciones o política" },
];

export interface CampaignDraft {
  name: string;
  /** Ad platform the campaign targets. Persisted to ad_campaigns.platform. */
  platform: AdPlatform;
  objective: CampaignObjective | null;
  destinationKind: DestinationKind;
  productId: string | null;
  paymentLinkId: string | null;
  customUrl: string;
  audience: CampaignAudience;
  budgetType: BudgetType;
  /** Kept as a string while editing so the field can be empty; parsed on validate. */
  budgetAmount: string;
  currency: string;
  /** yyyy-mm-dd */
  startsAt: string;
  /** yyyy-mm-dd, "" = open-ended */
  endsAt: string;
  timezone: string;
  delivery: CampaignDelivery;
  creative: CampaignCreative;
}

// ─── Option catalogues ────────────────────────────────────────────────────────

/**
 * Objective cards. `accent` / `tint` / `iconBg` are the exact values from the
 * Whop Ads build spec so the selected state matches the reference: the border
 * and icon take the solid accent, the card takes the light tint.
 */
export const OBJECTIVE_OPTIONS: {
  value: CampaignObjective;
  label: string;
  description: string;
  accent: string;
  tint: string;
  /** Inactive icon-box fill. Sales is solid accent in the reference. */
  iconBg: string;
  iconSolid?: boolean;
}[] = [
  { value: "sales",      label: "Ventas",         description: "Consigue compras de tus productos.", accent: "#30a46c", tint: "#f4fbf6", iconBg: "#30a46c", iconSolid: true },
  { value: "leads",      label: "Leads",          description: "Capta contactos interesados.",       accent: "#107d98", tint: "#f0fafc", iconBg: "#caf1f6" },
  { value: "engagement", label: "Interacción",    description: "Consigue más interacción.",          accent: "#6550b9", tint: "#f7f5ff", iconBg: "#ebe4ff" },
  { value: "traffic",    label: "Tráfico",        description: "Lleva visitas a tu página.",         accent: "#265ccf", tint: "#f3f7ff", iconBg: "#ddeaff" },
  { value: "awareness",  label: "Reconocimiento", description: "Llega al máximo de personas.",       accent: "#ab6400", tint: "#fffbeb", iconBg: "#fff7c2" },
];

/**
 * Platform selector. Logos are real brand marks served from
 * /public/brands/ads (see _source.txt). Only Meta is selectable — the rest
 * render disabled with reduced opacity and cursor-not-allowed, per the spec,
 * because no other ad platform is wired.
 */
export const PLATFORM_OPTIONS: {
  value: AdPlatform;
  label: string;
  /** File in /public/brands/ads */
  icon: string;
  /** Official brand colour, used for the mark. */
  brand: string;
  available: boolean;
}[] = [
  { value: "meta",       label: "Meta",       icon: "meta.svg",       brand: "#0467DF", available: true },
  { value: "tiktok",     label: "TikTok",     icon: "tiktok.svg",     brand: "#000000", available: false },
  { value: "google_ads", label: "Google Ads", icon: "google-ads.svg", brand: "#4285F4", available: false },
  { value: "snapchat",   label: "Snapchat",   icon: "snapchat.svg",   brand: "#F7B500", available: false },
  { value: "x",          label: "X",          icon: "x.svg",          brand: "#000000", available: false },
  { value: "reddit",     label: "Reddit",     icon: "reddit.svg",     brand: "#FF4500", available: false },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "all",    label: "Todos" },
  { value: "female", label: "Mujeres" },
  { value: "male",   label: "Hombres" },
];

export const LANGUAGE_OPTIONS = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "pt", label: "Portugués" },
  { value: "fr", label: "Francés" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Alemán" },
  { value: "nl", label: "Neerlandés" },
  { value: "ca", label: "Catalán" },
  { value: "eu", label: "Euskera" },
  { value: "gl", label: "Gallego" },
  { value: "ja", label: "Japonés" },
  { value: "zh", label: "Chino" },
  { value: "ar", label: "Árabe" },
];

export const CURRENCY_OPTIONS = ["USD", "EUR", "MXN", "ARS", "COP", "CLP", "BRL"];

export const DEFAULT_TIMEZONE = "UTC";

export const TIMEZONE_OPTIONS = [
  "UTC",
  "Europe/Madrid",
  "America/Argentina/Buenos_Aires",
  "America/Mexico_City",
  "America/Bogota",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Los_Angeles",
];

export const CTA_OPTIONS = [
  { value: "shop_now",     label: "Comprar ahora" },
  { value: "learn_more",   label: "Más información" },
  { value: "sign_up",      label: "Registrarte" },
  { value: "subscribe",    label: "Suscribirte" },
  { value: "get_offer",    label: "Obtener oferta" },
  { value: "contact_us",   label: "Contactarnos" },
  { value: "book_now",     label: "Reservar" },
];

export const OBJECTIVE_LABEL: Record<CampaignObjective, string> = {
  sales: "Ventas",
  leads: "Leads",
  engagement: "Interacción",
  traffic: "Tráfico",
  awareness: "Reconocimiento",
};

export const BUDGET_TYPE_LABEL: Record<BudgetType, string> = {
  daily: "Presupuesto diario",
  lifetime: "Presupuesto total",
};

// ─── Defaults + normalisation ─────────────────────────────────────────────────

export const DEFAULT_DELIVERY: CampaignDelivery = {
  conversionLocation: "website",
  conversionEvent: "",
  advantagePlacements: true,
  budgetControl: "campaign",
  bidStrategy: "highest_volume",
  specialCategory: "none",
  minimumDailySpend: null,
  dynamicCreative: false,
};

export const DEFAULT_AUDIENCE: CampaignAudience = {
  globalReach: false,
  includedLocations: [],
  excludedLocations: [],
  advantageAudience: true,
  ageMin: 18,
  ageMax: 65,
  gender: "all",
  interests: [],
  languages: [],
  customAudiencesIncluded: [],
  customAudiencesExcluded: [],
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.length > 0 ? v : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function nullableStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** A bare name, kept without a key so nothing is fabricated. */
function geoFromName(name: string): CampaignGeoLocation {
  return { key: null, name, type: null, countryCode: null, countryName: null, region: null };
}

/** A bare interest name, kept without an id so nothing is fabricated. */
function interestFromName(name: string): CampaignInterest {
  return { id: null, name, path: [], topic: null, audienceSizeLower: null, audienceSizeUpper: null };
}

/** A bare audience name, same rule. */
function audienceFromName(name: string): CampaignCustomAudience {
  return { id: null, name, subtype: null, approximateCount: null, deliveryStatus: null };
}

function nullableNum(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Read a stored interest list. Accepts plain names (the shape before the Meta
 * search existed) and the current objects; a missing id stays null.
 */
function interestList(v: unknown): CampaignInterest[] {
  if (!Array.isArray(v)) return [];
  const out: CampaignInterest[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      if (item.trim()) out.push(interestFromName(item.trim()));
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      out.push({
        id: nullableStr(o.id),
        name,
        path: strList(o.path),
        topic: nullableStr(o.topic),
        audienceSizeLower: nullableNum(o.audienceSizeLower),
        audienceSizeUpper: nullableNum(o.audienceSizeUpper),
      });
    }
  }
  return out;
}

/** Same, for Custom Audiences. */
function customAudienceList(v: unknown): CampaignCustomAudience[] {
  if (!Array.isArray(v)) return [];
  const out: CampaignCustomAudience[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      if (item.trim()) out.push(audienceFromName(item.trim()));
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      out.push({
        id: nullableStr(o.id),
        name,
        subtype: nullableStr(o.subtype),
        approximateCount: nullableNum(o.approximateCount),
        deliveryStatus: nullableStr(o.deliveryStatus),
      });
    }
  }
  return out;
}

/**
 * Read a stored location list, accepting every shape this column has ever had:
 *   1. `string[]`                — names picked from the old local list
 *   2. `CampaignGeoLocation[]`   — current, Meta-ready
 * (the even older single `locations` string is handled by the caller).
 *
 * Objects missing a usable `name` are dropped; a missing `key` is preserved as
 * null rather than guessed.
 */
function geoList(v: unknown): CampaignGeoLocation[] {
  if (!Array.isArray(v)) return [];
  const out: CampaignGeoLocation[] = [];
  for (const item of v) {
    if (typeof item === "string") {
      if (item.trim()) out.push(geoFromName(item.trim()));
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name.trim() : "";
      if (!name) continue;
      out.push({
        key: nullableStr(o.key),
        name,
        type: nullableStr(o.type),
        countryCode: nullableStr(o.countryCode),
        countryName: nullableStr(o.countryName),
        region: nullableStr(o.region),
      });
    }
  }
  return out;
}

/**
 * Read `ad_campaigns.delivery` back into the draft shape.
 * Rows saved before the column existed hold `{}` — every field falls back to
 * its default, so older drafts open without losing anything they did store.
 */
export function normalizeDelivery(raw: unknown): CampaignDelivery {
  const d = (raw ?? {}) as Partial<Record<keyof CampaignDelivery, unknown>>;
  const loc = d.conversionLocation === "message" ? "message" : "website";
  return {
    conversionLocation: loc,
    conversionEvent: str(d.conversionEvent, DEFAULT_DELIVERY.conversionEvent),
    advantagePlacements: bool(d.advantagePlacements, DEFAULT_DELIVERY.advantagePlacements),
    budgetControl: str(d.budgetControl, DEFAULT_DELIVERY.budgetControl),
    bidStrategy: str(d.bidStrategy, DEFAULT_DELIVERY.bidStrategy),
    specialCategory: str(d.specialCategory, DEFAULT_DELIVERY.specialCategory),
    minimumDailySpend:
      typeof d.minimumDailySpend === "number" && Number.isFinite(d.minimumDailySpend)
        ? d.minimumDailySpend
        : null,
    dynamicCreative: bool(d.dynamicCreative, DEFAULT_DELIVERY.dynamicCreative),
  };
}

/**
 * Read `ad_campaigns.audience` back into the draft shape.
 *
 * Tolerates every location layout this column has held: a single free-text
 * `locations` string, an array of plain names, and the current array of
 * `CampaignGeoLocation`. The first two arrive without a Meta key and keep
 * `key: null`, which the Build step surfaces as "Pendiente de confirmar".
 */
export function normalizeAudience(raw: unknown): CampaignAudience {
  const a = (raw ?? {}) as Record<string, unknown>;
  const legacy = typeof a.locations === "string" && a.locations.trim()
    ? a.locations.split(",").map((x) => x.trim()).filter(Boolean).map(geoFromName)
    : [];
  const included = geoList(a.includedLocations);
  return {
    globalReach: bool(a.globalReach, DEFAULT_AUDIENCE.globalReach),
    includedLocations: included.length ? included : legacy,
    excludedLocations: geoList(a.excludedLocations),
    advantageAudience: bool(a.advantageAudience, DEFAULT_AUDIENCE.advantageAudience),
    ageMin: num(a.ageMin, DEFAULT_AUDIENCE.ageMin),
    ageMax: num(a.ageMax, DEFAULT_AUDIENCE.ageMax),
    gender: (["all", "female", "male"] as const).includes(a.gender as Gender)
      ? (a.gender as Gender)
      : DEFAULT_AUDIENCE.gender,
    interests: interestList(a.interests),
    // `language` was a single string before the advanced block existed; older
    // drafts are lifted into the array without losing the choice.
    languages: (() => {
      const list = strList(a.languages);
      if (list.length) return list;
      return typeof a.language === "string" && a.language ? [a.language] : [];
    })(),
    customAudiencesIncluded: customAudienceList(a.customAudiencesIncluded),
    customAudiencesExcluded: customAudienceList(a.customAudiencesExcluded),
  };
}

/** Shape of an `ad_campaigns` row as far as the builder cares. */
export interface CampaignRow {
  id: string;
  platform: string | null;
  objective: string | null;
  name: string | null;
  product_id: string | null;
  destination_url: string | null;
  budget_type: string | null;
  budget_amount: string | number | null;
  currency: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  audience: unknown;
  delivery: unknown;
  creative: unknown;
  status: string | null;
}

/**
 * timestamptz → `yyyy-MM-ddTHH:mm` **in the campaign's timezone**, so the editor
 * shows back exactly the wall clock that was typed. A plain toISOString() would
 * show UTC instead.
 */
function toDateInput(value: string | null, timeZone: string): string {
  return utcToZonedLocal(value, timeZone);
}

function normalizeAd(raw: unknown): CampaignAd {
  const c = (raw ?? {}) as Record<string, unknown>;
  const mediaType = c.mediaType === "video" || c.mediaType === "image" ? c.mediaType : null;
  return {
    id: str(c.id, "") || newAdId(),
    mediaUrl: typeof c.mediaUrl === "string" && c.mediaUrl ? c.mediaUrl : null,
    mediaType,
    primaryText: str(c.primaryText, ""),
    headline: str(c.headline, ""),
    description: str(c.description, ""),
    cta: str(c.cta, "shop_now"),
    destinationUrl: str(c.destinationUrl, ""),
  };
}

/**
 * Read `ad_campaigns.creative` back into the draft shape.
 *
 * Handles both layouts:
 *  · `{ ads: [...] }`  — current
 *  · `{ mediaUrl, primaryText, ... }` — legacy single creative, lifted into a
 *    one-element list so old drafts open as a campaign with one ad.
 * An empty/absent value yields one blank ad so the editor always has something
 * to show.
 */
export function normalizeCreative(raw: unknown): CampaignCreative {
  const c = (raw ?? {}) as Record<string, unknown>;

  if (Array.isArray(c.ads)) {
    const ads = c.ads.map(normalizeAd);
    return { ads: ads.length ? ads : [emptyAd()] };
  }

  // Legacy shape: only treat it as an ad if it actually carries content.
  const hasLegacyContent = ["mediaUrl", "primaryText", "headline", "description", "destinationUrl"]
    .some((k) => typeof c[k] === "string" && (c[k] as string).length > 0);

  return { ads: [hasLegacyContent ? normalizeAd(c) : emptyAd()] };
}

/**
 * Rebuild a draft from a stored row.
 *
 * `destinationKind` / `paymentLinkId` / `customUrl` are UI state with no
 * columns, so they are inferred:
 *   1. product_id set        → "product" (only ever written for that kind)
 *   2. URL matches /pay/slug → "payment_link"
 *   3. any other URL         → "url"
 *   4. nothing stored        → "product" (the create-flow default)
 * Ambiguity is impossible in practice because the writer only sets product_id
 * for the product kind; a hand-edited row with both falls to case 1.
 */
export function draftFromRow(
  row: CampaignRow,
  ctx: {
    paymentLinks: PaymentLinkOption[];
    defaultCurrency?: string;
    /** Connected account; its currency and zone override the stored ones. */
    metaAccount?: MetaAccountBinding;
  }
): CampaignDraft {
  const meta = ctx.metaAccount ?? NO_META_ACCOUNT;
  const currency = effectiveCurrency(meta, row.currency ?? ctx.defaultCurrency ?? "USD");
  // Re-reading the stored instant in the account's zone does not move it: the
  // same moment is simply shown as the wall clock that zone would display, and
  // saving converts it back with the same zone.
  const zone = effectiveTimezone(meta, row.timezone ?? DEFAULT_TIMEZONE);
  const base = emptyDraft(currency, zone);
  const destinationUrl = row.destination_url ?? "";

  let destinationKind: DestinationKind = "product";
  let paymentLinkId: string | null = null;
  let customUrl = "";

  if (row.product_id) {
    destinationKind = "product";
  } else if (destinationUrl) {
    const link = ctx.paymentLinks.find((l) => destinationUrl.endsWith(`/pay/${l.slug}`));
    if (link) {
      destinationKind = "payment_link";
      paymentLinkId = link.id;
    } else {
      destinationKind = "url";
      customUrl = destinationUrl;
    }
  }

  const objective = OBJECTIVES.includes(row.objective as CampaignObjective)
    ? (row.objective as CampaignObjective)
    : null;

  return {
    ...base,
    name: row.name ?? "",
    platform: (["meta", "tiktok", "google_ads", "snapchat", "x", "reddit"] as const)
      .includes(row.platform as AdPlatform) ? (row.platform as AdPlatform) : "meta",
    objective,
    destinationKind,
    productId: row.product_id,
    paymentLinkId,
    customUrl,
    budgetType: row.budget_type === "lifetime" ? "lifetime" : "daily",
    budgetAmount: row.budget_amount == null ? "" : String(Number(row.budget_amount)),
    currency,
    startsAt: toDateInput(row.starts_at, zone),
    endsAt: toDateInput(row.ends_at, zone),
    timezone: zone,
    audience: normalizeAudience(row.audience),
    delivery: normalizeDelivery(row.delivery),
    creative: normalizeCreative(row.creative),
  };
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/** Now, as `yyyy-MM-ddTHH:mm` in the given zone. */
function todayISO(timeZone: string): string {
  return nowInZone(timeZone);
}

export function emptyDraft(currency = "USD", timezone = DEFAULT_TIMEZONE): CampaignDraft {
  const zone = isValidTimeZone(timezone) ? timezone : DEFAULT_TIMEZONE;
  return {
    name: "",
    platform: "meta",
    objective: null,
    destinationKind: "product",
    productId: null,
    paymentLinkId: null,
    customUrl: "",
    audience: { ...DEFAULT_AUDIENCE },
    budgetType: "daily",
    budgetAmount: "",
    currency,
    startsAt: todayISO(zone),
    endsAt: "",
    timezone: zone,
    delivery: { ...DEFAULT_DELIVERY },
    creative: { ads: [emptyAd()] },
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export type Errors = Record<string, string>;

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Per-step rules. Returns a field→message map; empty map means the step passes.
 * `validateAll` runs every step, which is what the server action uses.
 */
export function validateStep(step: number, d: CampaignDraft): Errors {
  const e: Errors = {};

  // Step 1 = Campaign: platform, objective, title and daily budget, matching
  // the reference flow. The budget moved here from the old step 4, which now
  // only carries the schedule.
  if (step === 1) {
    if (!d.platform) e.platform = "Elige una plataforma.";
    if (!d.objective) e.objective = "Elige un objetivo.";
    if (!d.name.trim()) e.name = "Ponle un nombre a la campaña.";
    const amount = Number(d.budgetAmount);
    if (!d.budgetAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
      e.budgetAmount = "El importe debe ser mayor que 0.";
    }
  }

  // Step 2 = Build (ad set): destination, conversion event, geo targeting and
  // schedule. Absorbs the old Producto / Audiencia / Calendario rules so no
  // existing requirement is lost.
  if (step === 2) {
    if (d.destinationKind === "product" && !d.productId) {
      e.productId = "Selecciona un producto.";
    }
    if (d.destinationKind === "payment_link" && !d.paymentLinkId) {
      e.paymentLinkId = "Selecciona un enlace de pago.";
    }
    if (d.destinationKind === "url") {
      if (!d.customUrl.trim()) e.customUrl = "Introduce una URL.";
      else if (!isHttpUrl(d.customUrl.trim())) e.customUrl = "La URL debe empezar por http:// o https://";
    }

    if (!d.delivery.conversionEvent) {
      e.conversionEvent = "Selecciona un evento de conversión.";
    }

    // Location is only required when global reach is off.
    if (!d.audience.globalReach && d.audience.includedLocations.length === 0) {
      e.includedLocations = "Añade al menos una ubicación o activa el alcance global.";
    }

    // Manual age range only applies when Advantage+ audience is off.
    if (!d.audience.advantageAudience) {
      const { ageMin, ageMax } = d.audience;
      if (!Number.isFinite(ageMin) || ageMin < AGE_MIN) e.ageMin = `La edad mínima es ${AGE_MIN}.`;
      if (!Number.isFinite(ageMax) || ageMax > AGE_MAX) e.ageMax = `La edad máxima es ${AGE_MAX}.`;
      if (!e.ageMin && !e.ageMax && ageMin > ageMax) {
        e.ageMax = "La edad máxima debe ser mayor o igual que la mínima.";
      }
    }

    if (!d.startsAt) e.startsAt = "Elige una fecha de inicio.";
    if (d.endsAt && d.startsAt && d.endsAt <= d.startsAt) {
      e.endsAt = "La fecha de fin debe ser posterior a la de inicio.";
    }
  }

  // Step 3 = Creatives. Every ad in the group must be usable; an empty one
  // added by mistake should be filled or removed rather than saved blank.
  if (step === 3) {
    const ads = d.creative.ads;
    if (ads.length === 0) {
      e.ads = "Añade al menos un anuncio.";
    }
    ads.forEach((ad, i) => {
      const label = `Anuncio ${i + 1}`;
      if (!ad.primaryText.trim()) e[`ad.${ad.id}.primaryText`] = `${label}: escribe el texto principal.`;
      if (!ad.headline.trim()) e[`ad.${ad.id}.headline`] = `${label}: escribe un título.`;
      const dest = ad.destinationUrl.trim();
      if (dest && !isHttpUrl(dest)) e[`ad.${ad.id}.destinationUrl`] = `${label}: la URL debe empezar por http:// o https://`;
    });
  }

  return e;
}

export function validateAll(d: CampaignDraft): Errors {
  return [1, 2, 3].reduce<Errors>(
    (acc, s) => ({ ...acc, ...validateStep(s, d) }),
    {}
  );
}
