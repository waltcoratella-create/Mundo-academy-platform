export interface Option {
  value: string;
  label: string;
}

export const RANGE_OPTIONS: Option[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
  { value: "this_month", label: "Este mes" },
  { value: "last_month", label: "Mes anterior" },
];

export const COMPARISON_OPTIONS: Option[] = [
  { value: "previous_period", label: "Período anterior" },
  { value: "last_month", label: "Mes anterior" },
  { value: "last_year", label: "Año anterior" },
  { value: "none", label: "Sin comparación" },
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

function valid(opts: Option[], v: string | undefined, def: string): string {
  return v && opts.some((o) => o.value === v) ? v : def;
}

/** Validate a raw searchParam against the option set, returning a safe default. */
export function validateRange(v?: string): string {
  return v === "custom" ? "custom" : valid(RANGE_OPTIONS, v, DEFAULTS.range);
}
export function validateComparison(v?: string): string {
  return valid(COMPARISON_OPTIONS, v, DEFAULTS.comparison);
}
export function validateGranularity(v?: string): string {
  return valid(GRANULARITY_OPTIONS, v, DEFAULTS.granularity);
}

export function labelFor(opts: Option[], value: string, fallback: string): string {
  return opts.find((o) => o.value === value)?.label ?? fallback;
}
