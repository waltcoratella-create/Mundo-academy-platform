import { utcToZonedLocal, nowInZone } from "@/lib/timezone";

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

export const TOTAL_STEPS = 4;

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
 * Local suggestion list for the geo search. Deliberately separate from the
 * persistence layer: it only powers the UI picker, and no Meta geo IDs are
 * fabricated — what gets stored is the plain names the user picked.
 */
export const LOCATION_SUGGESTIONS = [
  "España", "México", "Argentina", "Colombia", "Chile", "Perú", "Uruguay",
  "Ecuador", "Bolivia", "Paraguay", "Venezuela", "Costa Rica", "Panamá",
  "Guatemala", "República Dominicana", "Estados Unidos", "Canadá", "Brasil",
  "Portugal", "Francia", "Italia", "Alemania", "Reino Unido", "Países Bajos",
  "Madrid", "Barcelona", "Valencia", "Sevilla", "Ciudad de México",
  "Guadalajara", "Monterrey", "Buenos Aires", "Córdoba", "Rosario",
  "Bogotá", "Medellín", "Cali", "Santiago", "Lima", "Miami", "Nueva York",
];

export interface CampaignAudience {
  /** true → Meta delivers worldwide and the location lists are ignored. */
  globalReach: boolean;
  includedLocations: string[];
  excludedLocations: string[];
  /** Let Meta pick the audience; when off, the manual controls below apply. */
  advantageAudience: boolean;
  ageMin: number;
  ageMax: number;
  gender: Gender;
  interests: string[];
  /** Empty = target every language, matching the reference's copy. */
  languages: string[];
  /**
   * Meta Custom Audiences. Distinct from the geographic lists above — these are
   * saved audiences, not places. Stays empty until Meta is connected; nothing
   * fabricates entries here.
   */
  customAudiencesIncluded: string[];
  customAudiencesExcluded: string[];
}

export interface CampaignCreative {
  mediaUrl: string | null;
  mediaType: MediaType | null;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  destinationUrl: string;
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
 * Read `ad_campaigns.audience` back into the draft shape. Tolerates the older
 * layout, where locations were a single free-text string.
 */
export function normalizeAudience(raw: unknown): CampaignAudience {
  const a = (raw ?? {}) as Record<string, unknown>;
  const legacy = typeof a.locations === "string" && a.locations.trim()
    ? a.locations.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const included = strList(a.includedLocations);
  return {
    globalReach: bool(a.globalReach, DEFAULT_AUDIENCE.globalReach),
    includedLocations: included.length ? included : legacy,
    excludedLocations: strList(a.excludedLocations),
    advantageAudience: bool(a.advantageAudience, DEFAULT_AUDIENCE.advantageAudience),
    ageMin: num(a.ageMin, DEFAULT_AUDIENCE.ageMin),
    ageMax: num(a.ageMax, DEFAULT_AUDIENCE.ageMax),
    gender: (["all", "female", "male"] as const).includes(a.gender as Gender)
      ? (a.gender as Gender)
      : DEFAULT_AUDIENCE.gender,
    interests: strList(a.interests),
    // `language` was a single string before the advanced block existed; older
    // drafts are lifted into the array without losing the choice.
    languages: (() => {
      const list = strList(a.languages);
      if (list.length) return list;
      return typeof a.language === "string" && a.language ? [a.language] : [];
    })(),
    customAudiencesIncluded: strList(a.customAudiencesIncluded),
    customAudiencesExcluded: strList(a.customAudiencesExcluded),
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

export function normalizeCreative(raw: unknown): CampaignCreative {
  const c = (raw ?? {}) as Record<string, unknown>;
  const mediaType = c.mediaType === "video" || c.mediaType === "image" ? c.mediaType : null;
  return {
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
  ctx: { paymentLinks: PaymentLinkOption[]; defaultCurrency?: string }
): CampaignDraft {
  const base = emptyDraft(row.currency ?? ctx.defaultCurrency ?? "USD");
  const zone = row.timezone ?? base.timezone;
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
    currency: row.currency ?? base.currency,
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

export function emptyDraft(currency = "USD"): CampaignDraft {
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
    startsAt: todayISO(DEFAULT_TIMEZONE),
    endsAt: "",
    timezone: DEFAULT_TIMEZONE,
    delivery: { ...DEFAULT_DELIVERY },
    creative: {
      mediaUrl: null,
      mediaType: null,
      primaryText: "",
      headline: "",
      description: "",
      cta: "shop_now",
      destinationUrl: "",
    },
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

  // Step 3 = Creatives.
  if (step === 3) {
    if (!d.creative.primaryText.trim()) e.primaryText = "Escribe el texto principal.";
    if (!d.creative.headline.trim()) e.headline = "Escribe un título.";
    const dest = d.creative.destinationUrl.trim();
    if (dest && !isHttpUrl(dest)) e.destinationUrl = "La URL debe empezar por http:// o https://";
  }

  return e;
}

export function validateAll(d: CampaignDraft): Errors {
  return [1, 2, 3].reduce<Errors>(
    (acc, s) => ({ ...acc, ...validateStep(s, d) }),
    {}
  );
}
