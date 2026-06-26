export const ANALYTICS_WIDGETS = [
  { key: "gross-revenue", label: "Ingresos brutos", category: "Ingresos" },
  { key: "net-revenue", label: "Ingresos netos", category: "Ingresos" },
  { key: "new-users", label: "Nuevos usuarios", category: "Usuarios" },
  { key: "mrr", label: "MRR", category: "Ingresos" },
  { key: "arr", label: "ARR", category: "Ingresos" },
  { key: "payment-breakdown", label: "Desglose de pagos", category: "Pagos" },
] as const;

export type WidgetKey = (typeof ANALYTICS_WIDGETS)[number]["key"];

export interface WidgetConfig {
  key: WidgetKey;
  visible: boolean;
}

export const WIDGET_LABEL: Record<string, string> = Object.fromEntries(
  ANALYTICS_WIDGETS.map((w) => [w.key, w.label]),
);
export const WIDGET_CATEGORY: Record<string, string> = Object.fromEntries(
  ANALYTICS_WIDGETS.map((w) => [w.key, w.category]),
);
export const CATEGORY_ORDER = ["Usuarios", "Ingresos", "Pagos"];

const VALID_KEYS = new Set<string>(ANALYTICS_WIDGETS.map((w) => w.key));

export function isWidgetKey(k: string): k is WidgetKey {
  return VALID_KEYS.has(k);
}

/** Default layout: all widgets visible in canonical order. */
export const DEFAULT_CONFIG: WidgetConfig[] = ANALYTICS_WIDGETS.map((w) => ({ key: w.key, visible: true }));

/**
 * Normalize raw rows into a safe config: drop invalid keys, dedupe, order by
 * position, append any available widget missing from the saved config (visible),
 * and fall back to the default if the result is empty/corrupt.
 */
export function normalizeConfig(rows: { widget_key: string; position: number; visible: boolean }[]): WidgetConfig[] {
  const seen = new Set<string>();
  const ordered: WidgetConfig[] = [...rows]
    .sort((a, b) => a.position - b.position)
    .filter((r) => isWidgetKey(r.widget_key) && !seen.has(r.widget_key) && (seen.add(r.widget_key), true))
    .map((r) => ({ key: r.widget_key as WidgetKey, visible: !!r.visible }));

  if (ordered.length === 0) return DEFAULT_CONFIG;
  for (const w of ANALYTICS_WIDGETS) {
    if (!ordered.some((o) => o.key === w.key)) ordered.push({ key: w.key, visible: true });
  }
  return ordered;
}

/** Validate a client-provided config before persisting. */
export function sanitizeConfig(widgets: WidgetConfig[]): WidgetConfig[] {
  const seen = new Set<string>();
  return widgets.filter((w) => isWidgetKey(w.key) && !seen.has(w.key) && (seen.add(w.key), true));
}
