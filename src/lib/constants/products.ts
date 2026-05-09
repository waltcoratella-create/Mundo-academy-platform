// ─── Access types ────────────────────────────────────────────────────────────
// These are the canonical values stored in the database.
// The UI may display Spanish labels, but these English strings must be
// persisted and compared everywhere.

export const ACCESS_TYPE = {
  FREE:         "free",
  ONE_TIME:     "one_time",
  SUBSCRIPTION: "subscription",
  MANUAL:       "manual",
} as const;

export type AccessType = typeof ACCESS_TYPE[keyof typeof ACCESS_TYPE];

export const ACCESS_TYPE_LABELS: Record<string, string> = {
  free:         "Gratis",
  one_time:     "Pago único",
  subscription: "Suscripción",
  manual:       "Invitación",
};

export const ACCESS_TYPE_DESCRIPTIONS: Record<string, string> = {
  free:         "Cualquier persona puede acceder sin pagar.",
  one_time:     "Acceso de por vida con un solo pago.",
  subscription: "Acceso recurrente con cobro mensual o anual.",
  manual:       "Tú controlas quién puede acceder manualmente.",
};

export const ACCESS_TYPE_CHECKOUT_LABELS: Record<string, string> = {
  free:         "Acceso gratuito",
  one_time:     "Pago único · acceso de por vida",
  subscription: "Suscripción recurrente",
  manual:       "Solo por invitación",
};

// ─── Billing periods ─────────────────────────────────────────────────────────

export const BILLING_PERIOD = {
  ONE_TIME: "one_time",
  MONTHLY:  "monthly",
  ANNUAL:   "annual",
} as const;

export type BillingPeriod = typeof BILLING_PERIOD[keyof typeof BILLING_PERIOD];

export const BILLING_PERIOD_LABELS: Record<string, string> = {
  one_time: "Pago único",
  monthly:  "Mensual",
  annual:   "Anual",
};

export const BILLING_PERIOD_SUFFIX: Record<string, string> = {
  monthly: "/ mes",
  annual:  "/ año",
};

// ─── Backwards-compat normalizers ────────────────────────────────────────────
// Maps legacy Spanish values that may exist in old DB rows to canonical English.

const LEGACY_ACCESS_MAP: Record<string, string> = {
  gratis:      ACCESS_TYPE.FREE,
  pago_unico:  ACCESS_TYPE.ONE_TIME,
  suscripcion: ACCESS_TYPE.SUBSCRIPTION,
  invitacion:  ACCESS_TYPE.MANUAL,
};

const VALID_ACCESS_TYPES = new Set(Object.values(ACCESS_TYPE));
const VALID_BILLING_PERIODS = new Set(Object.values(BILLING_PERIOD));

export function normalizeAccessType(value: string | null | undefined): AccessType {
  if (!value) return ACCESS_TYPE.MANUAL;
  if (LEGACY_ACCESS_MAP[value]) return LEGACY_ACCESS_MAP[value] as AccessType;
  if (VALID_ACCESS_TYPES.has(value as AccessType)) return value as AccessType;
  return ACCESS_TYPE.MANUAL;
}

export function normalizeBillingPeriod(value: string | null | undefined): BillingPeriod {
  if (!value) return BILLING_PERIOD.ONE_TIME;
  if (VALID_BILLING_PERIODS.has(value as BillingPeriod)) return value as BillingPeriod;
  return BILLING_PERIOD.ONE_TIME;
}
