/**
 * Publish readiness contracts.
 *
 * Client-safe on purpose: the drawer renders these, the pure rules produce
 * them, and the server-only validator adds to them. No React, no Supabase, no
 * Meta imports here.
 *
 * Codes are the stable identity of an issue. UI copy may be rewritten freely;
 * the code is what future logic (a publish gate, telemetry, a support script)
 * should key on.
 */

export type ReadinessSeverity = "error" | "warning";

/** Groups the drawer uses to keep a long list readable. */
export type ReadinessSection = "meta" | "campaign" | "audience" | "creative";

export const READINESS_SECTION_LABEL: Record<ReadinessSection, string> = {
  meta: "Conexión con Meta",
  campaign: "Campaña",
  audience: "Audiencia",
  creative: "Creativos",
};

export type ReadinessCode =
  // ── Meta connection ────────────────────────────────────────────────────────
  | "META_NOT_CONNECTED"
  | "META_CONNECTION_EXPIRED"
  | "META_CONNECTION_ERROR"
  | "META_AD_ACCOUNT_MISSING"
  | "META_PAGE_MISSING"
  | "META_AD_ACCOUNT_INACTIVE"
  | "META_ACCOUNT_CHECK_FAILED"
  | "CURRENCY_MISMATCH"
  | "TIMEZONE_MISMATCH"
  // ── Campaign ───────────────────────────────────────────────────────────────
  | "CAMPAIGN_PLATFORM_MISSING"
  | "CAMPAIGN_NAME_MISSING"
  | "CAMPAIGN_OBJECTIVE_MISSING"
  | "BUDGET_INVALID"
  | "SCHEDULE_START_MISSING"
  | "SCHEDULE_INVALID"
  | "SCHEDULE_START_IN_PAST"
  | "DESTINATION_PRODUCT_MISSING"
  | "DESTINATION_PAYMENT_LINK_MISSING"
  | "DESTINATION_URL_INVALID"
  | "CONVERSION_EVENT_MISSING"
  | "PIXEL_REQUIRED_MISSING"
  // ── Audience ───────────────────────────────────────────────────────────────
  | "GEO_NO_INCLUDED"
  | "GEO_UNRESOLVED"
  | "GEO_OVERLAP_COUNTRY_CITY"
  | "GEO_OVERLAP_REGION_CITY"
  | "AGE_RANGE_INVALID"
  | "INTEREST_UNRESOLVED"
  | "INTEREST_INVALID"
  | "INTEREST_CHECK_FAILED"
  | "CUSTOM_AUDIENCE_UNRESOLVED"
  | "CUSTOM_AUDIENCE_MISSING"
  | "CUSTOM_AUDIENCE_NOT_READY"
  | "CUSTOM_AUDIENCE_CHECK_FAILED"
  | "ADVANTAGE_AUDIENCE_INTERESTS_IGNORED"
  // ── Creative ───────────────────────────────────────────────────────────────
  | "CREATIVE_NO_ADS"
  | "CREATIVE_MISSING_MEDIA"
  | "CREATIVE_MEDIA_TYPE_UNSUPPORTED"
  | "CREATIVE_MISSING_PRIMARY_TEXT"
  | "CREATIVE_MISSING_HEADLINE"
  | "CREATIVE_DESTINATION_URL_INVALID"
  | "CREATIVE_CTA_INVALID";

export interface ReadinessIssue {
  code: ReadinessCode;
  section: ReadinessSection;
  severity: ReadinessSeverity;
  /** Human copy. Free to change; never key on it. */
  message: string;
  /** Draft field or entity the issue points at, when there is a single one. */
  field?: string;
  /** What the user can do about it, when it is not obvious from the message. */
  remediation?: string;
}

export interface ReadinessResult {
  /** True only when there are zero errors. Warnings never block. */
  ready: boolean;
  errors: ReadinessIssue[];
  warnings: ReadinessIssue[];
  /** Present when the Meta-side checks could not run at all. */
  checkedMeta: boolean;
}

/** Split a flat issue list into the result shape. */
export function toReadinessResult(
  issues: ReadinessIssue[],
  checkedMeta: boolean
): ReadinessResult {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  return { ready: errors.length === 0, errors, warnings, checkedMeta };
}

/** Stable grouping for the drawer. */
export function groupBySection(
  issues: ReadinessIssue[]
): { section: ReadinessSection; items: ReadinessIssue[] }[] {
  const order: ReadinessSection[] = ["meta", "campaign", "audience", "creative"];
  return order
    .map((section) => ({ section, items: issues.filter((i) => i.section === section) }))
    .filter((g) => g.items.length > 0);
}
