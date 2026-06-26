export interface Option {
  value: string;
  label: string;
}

export const RANGE_OPTIONS: Option[] = [
  { value: "today", label: "Hoy" },
  { value: "7d", label: "Últimos 7 días" },
  { value: "4w", label: "Últimas 4 semanas" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "12m", label: "Últimos 12 meses" },
  { value: "all", label: "Todo el tiempo" },
  { value: "month_to_date", label: "Mes en curso" },
  { value: "quarter_to_date", label: "Trimestre hasta la fecha" },
  { value: "year_to_date", label: "Año actual" },
];

export const COMPARISON_OPTIONS: Option[] = [
  { value: "previous_period", label: "Período anterior" },
  { value: "last_year", label: "Año anterior" },
  { value: "custom", label: "Personalizado" },
];

export const GRANULARITY_OPTIONS: Option[] = [
  { value: "daily", label: "Diario" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
];

export const DEFAULTS = {
  range: "7d",
  comparison: "previous_period",
  granularity: "daily",
  productId: "all",
} as const;

/** Sensible granularity choices + default per range (no absurd combinations). */
const GRANULARITY_BY_RANGE: Record<string, { allowed: string[]; default: string }> = {
  today:           { allowed: ["daily"], default: "daily" },
  "7d":            { allowed: ["daily"], default: "daily" },
  "4w":            { allowed: ["daily", "weekly"], default: "daily" },
  month_to_date:   { allowed: ["daily", "weekly"], default: "daily" },
  "3m":            { allowed: ["weekly", "monthly"], default: "weekly" },
  quarter_to_date: { allowed: ["weekly", "monthly"], default: "weekly" },
  "12m":           { allowed: ["monthly"], default: "monthly" },
  year_to_date:    { allowed: ["monthly", "weekly"], default: "monthly" },
  all:             { allowed: ["monthly"], default: "monthly" },
  custom:          { allowed: ["daily", "weekly", "monthly"], default: "daily" },
};

export function granularityOptionsForRange(range: string): Option[] {
  const allowed = (GRANULARITY_BY_RANGE[range] ?? GRANULARITY_BY_RANGE["7d"]).allowed;
  return GRANULARITY_OPTIONS.filter((o) => allowed.includes(o.value));
}

function valid(opts: Option[], v: string | undefined, def: string): string {
  return v && opts.some((o) => o.value === v) ? v : def;
}

export function validateRange(v?: string): string {
  return v === "custom" ? "custom" : valid(RANGE_OPTIONS, v, DEFAULTS.range);
}
export function validateComparison(v?: string): string {
  return valid(COMPARISON_OPTIONS, v, DEFAULTS.comparison);
}
/** Clamp granularity to what makes sense for the active range. */
export function validateGranularity(v: string | undefined, range: string): string {
  const cfg = GRANULARITY_BY_RANGE[range] ?? GRANULARITY_BY_RANGE["7d"];
  return v && cfg.allowed.includes(v) ? v : cfg.default;
}

export function labelFor(opts: Option[], value: string, fallback: string): string {
  return opts.find((o) => o.value === value)?.label ?? fallback;
}
