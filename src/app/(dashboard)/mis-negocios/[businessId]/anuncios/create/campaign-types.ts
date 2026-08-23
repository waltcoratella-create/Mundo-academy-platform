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

export const TOTAL_STEPS = 6;

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
  if (step <= 4) return "build";
  return "creatives";
}

/** Daily-budget presets offered under the amount field. */
export const BUDGET_PRESETS = [200, 1000, 5000];

/** Meta's own floor/ceiling — mirrored so the draft stays portable later. */
export const AGE_MIN = 13;
export const AGE_MAX = 65;

export interface CampaignAudience {
  locations: string;
  ageMin: number;
  ageMax: number;
  gender: Gender;
  interests: string[];
  language: string;
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

/**
 * Meta delivery settings shown under "Opciones avanzadas".
 *
 * NOT PERSISTED YET: ad_campaigns has no column for campaign-level delivery
 * config (`audience` / `creative` jsonb are semantically the wrong home). They
 * live in the draft so they survive step navigation, and the report lists the
 * one column needed to store them. Nothing here is sent to Meta.
 */
export interface CampaignAdvanced {
  budgetControl: string;
  bidStrategy: string;
  specialCategory: string;
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
  advanced: CampaignAdvanced;
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
];

export const CURRENCY_OPTIONS = ["USD", "EUR", "MXN", "ARS", "COP", "CLP", "BRL"];

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

// ─── Factory ──────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    audience: {
      locations: "",
      ageMin: 18,
      ageMax: 65,
      gender: "all",
      interests: [],
      language: "es",
    },
    budgetType: "daily",
    budgetAmount: "",
    currency,
    startsAt: todayISO(),
    endsAt: "",
    timezone: "UTC",
    advanced: {
      budgetControl: "campaign",
      bidStrategy: "highest_volume",
      specialCategory: "none",
    },
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
  }

  if (step === 3) {
    const { ageMin, ageMax } = d.audience;
    if (!Number.isFinite(ageMin) || ageMin < AGE_MIN) e.ageMin = `La edad mínima es ${AGE_MIN}.`;
    if (!Number.isFinite(ageMax) || ageMax > AGE_MAX) e.ageMax = `La edad máxima es ${AGE_MAX}.`;
    if (!e.ageMin && !e.ageMax && ageMin > ageMax) {
      e.ageMax = "La edad máxima debe ser mayor o igual que la mínima.";
    }
  }

  // Step 4 = schedule only; the amount is validated in step 1.
  if (step === 4) {
    if (!d.startsAt) e.startsAt = "Elige una fecha de inicio.";
    if (d.endsAt && d.startsAt && d.endsAt <= d.startsAt) {
      e.endsAt = "La fecha de fin debe ser posterior a la de inicio.";
    }
  }

  if (step === 5) {
    if (!d.creative.primaryText.trim()) e.primaryText = "Escribe el texto principal.";
    if (!d.creative.headline.trim()) e.headline = "Escribe un título.";
    const dest = d.creative.destinationUrl.trim();
    if (dest && !isHttpUrl(dest)) e.destinationUrl = "La URL debe empezar por http:// o https://";
  }

  return e;
}

export function validateAll(d: CampaignDraft): Errors {
  return [1, 2, 3, 4, 5].reduce<Errors>(
    (acc, s) => ({ ...acc, ...validateStep(s, d) }),
    {}
  );
}
