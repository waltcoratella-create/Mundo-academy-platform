import "server-only";
import { metaGraphRequest, MetaGraphError } from "./graph";
import { getMetaAccessToken, getMetaConnectionForBusiness } from "./connections";
import { listMetaCustomAudiences } from "./custom-audiences";
import type { CampaignDraft } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/campaign-types";
import type {
  ReadinessIssue, ReadinessResult,
} from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/readiness-types";
import { toReadinessResult } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/readiness-types";
import { pureReadinessIssues } from "@/app/(dashboard)/mis-negocios/[businessId]/anuncios/create/readiness-rules";

/**
 * Is this draft actually ready to become Meta objects?
 *
 * Two layers: the pure rules decide everything computable from the draft and
 * the stored connection, and this module adds the three questions only Graph
 * can answer — is the ad account still live and still on the same currency and
 * zone, are the saved interest ids still valid, do the saved custom audiences
 * still exist and deliver.
 *
 * Nothing here creates or changes anything on Meta, and the access token never
 * leaves this module.
 */

// ── Ad account re-read ───────────────────────────────────────────────────────

interface RawAdAccount {
  account_status?: number;
  currency?: string;
  timezone_name?: string;
  disable_reason?: number;
}

/** 1 = ACTIVE. Anything else cannot run ads. */
const ACCOUNT_ACTIVE = 1;

async function checkAdAccount(
  token: string,
  adAccountId: string,
  draft: CampaignDraft
): Promise<ReadinessIssue[]> {
  try {
    const account = await metaGraphRequest<RawAdAccount>({
      path: `/${adAccountId}`,
      accessToken: token,
      params: { fields: "account_status,currency,timezone_name,disable_reason" },
    });

    const out: ReadinessIssue[] = [];

    if (typeof account.account_status === "number" && account.account_status !== ACCOUNT_ACTIVE) {
      out.push({
        code: "META_AD_ACCOUNT_INACTIVE", section: "meta", severity: "error",
        message: "La cuenta publicitaria no está activa en Meta.",
        remediation: "Revísala en el Administrador de anuncios antes de publicar.",
      });
    }

    // The stored values can lag behind Meta; the live account is the truth.
    if (account.currency && draft.currency !== account.currency) {
      out.push({
        code: "CURRENCY_MISMATCH", section: "meta", severity: "error",
        message: `La cuenta publicitaria está en ${account.currency} y la campaña en ${draft.currency}.`,
        field: "currency",
        remediation: "Vuelve a conectar la cuenta para refrescar la moneda guardada.",
      });
    }
    if (account.timezone_name && draft.timezone !== account.timezone_name) {
      out.push({
        code: "TIMEZONE_MISMATCH", section: "meta", severity: "error",
        message: `La cuenta publicitaria usa ${account.timezone_name} y la campaña ${draft.timezone}.`,
        field: "timezone",
        remediation: "Vuelve a conectar la cuenta para refrescar la zona guardada.",
      });
    }

    return out;
  } catch (e) {
    // Not knowing is not the same as failing: a check we could not run is a
    // warning, never a block.
    return [{
      code: "META_ACCOUNT_CHECK_FAILED", section: "meta", severity: "warning",
      message: e instanceof MetaGraphError
        ? `No se pudo verificar la cuenta publicitaria: ${e.message}`
        : "No se pudo verificar la cuenta publicitaria en Meta.",
    }];
  }
}

// ── Interests ────────────────────────────────────────────────────────────────

interface RawInterestValid {
  id?: string;
  name?: string;
  valid?: boolean;
}

/**
 * Meta retires interests continuously, so a stored id can go stale. The docs
 * recommend validating by id rather than by name, because names get rewritten.
 */
async function checkInterests(
  token: string,
  draft: CampaignDraft
): Promise<ReadinessIssue[]> {
  const ids = draft.audience.interests.map((i) => i.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];

  try {
    const res = await metaGraphRequest<{ data?: RawInterestValid[] }>({
      path: "/search",
      accessToken: token,
      params: {
        type: "adinterestvalid",
        interest_fbid_list: JSON.stringify(ids),
      },
    });

    const rows = res.data ?? [];
    // An empty or unreadable answer proves nothing; treat it as unverified.
    if (rows.length === 0) {
      return [{
        code: "INTEREST_CHECK_FAILED", section: "audience", severity: "warning",
        message: "Meta no devolvió el estado de los intereses guardados.",
      }];
    }

    const invalid = new Set(
      rows.filter((r) => r.valid === false && r.id).map((r) => r.id as string)
    );

    return draft.audience.interests
      .filter((i) => i.id && invalid.has(i.id))
      .map((i) => ({
        code: "INTEREST_INVALID" as const, section: "audience" as const, severity: "error" as const,
        message: `Meta ya no reconoce el interés «${i.name}».`,
        field: i.id ?? i.name,
        remediation: "Quítalo o busca uno equivalente.",
      }));
  } catch (e) {
    return [{
      code: "INTEREST_CHECK_FAILED", section: "audience", severity: "warning",
      message: e instanceof MetaGraphError
        ? `No se pudieron revalidar los intereses: ${e.message}`
        : "No se pudieron revalidar los intereses en Meta.",
    }];
  }
}

// ── Custom audiences ─────────────────────────────────────────────────────────

/**
 * Delivery states Meta describes as unusable.
 *
 * Deliberately narrow: only wording that leaves no room for interpretation
 * blocks. Anything else — building, warming up, too small to be sure — is a
 * warning, because guessing at Meta's intermediate states would refuse to
 * publish campaigns that are actually fine.
 */
function deliveryVerdict(status: string | null): "unusable" | "ambiguous" | "ok" {
  if (!status) return "ok";
  const s = status.toLowerCase();
  if (/ready|active/.test(s)) return "ok";
  if (/deleted|expired|too small|not deliverable|unavailable|error/.test(s)) return "unusable";
  return "ambiguous";
}

async function checkCustomAudiences(
  businessId: string,
  adAccountId: string,
  draft: CampaignDraft
): Promise<ReadinessIssue[]> {
  const chosen = [
    ...draft.audience.customAudiencesIncluded,
    ...draft.audience.customAudiencesExcluded,
  ].filter((a) => a.id);
  if (chosen.length === 0) return [];

  const outcome = await listMetaCustomAudiences({ businessId, adAccountId });
  if (!outcome.ok) {
    return [{
      code: "CUSTOM_AUDIENCE_CHECK_FAILED", section: "audience", severity: "warning",
      message: `No se pudieron verificar las audiencias: ${outcome.error}`,
    }];
  }

  const live = new Map(outcome.audiences.map((a) => [a.id, a]));
  const out: ReadinessIssue[] = [];

  for (const saved of chosen) {
    const found = saved.id ? live.get(saved.id) : undefined;
    if (!found) {
      out.push({
        code: "CUSTOM_AUDIENCE_MISSING", section: "audience", severity: "error",
        message: `La audiencia «${saved.name}» ya no existe en la cuenta publicitaria.`,
        field: saved.id ?? saved.name,
        remediation: "Quítala o elige otra.",
      });
      continue;
    }

    const verdict = deliveryVerdict(found.deliveryStatus);
    if (verdict === "unusable") {
      out.push({
        code: "CUSTOM_AUDIENCE_NOT_READY", section: "audience", severity: "error",
        message: `Meta indica que «${found.name}» no se puede usar (${found.deliveryStatus}).`,
        field: found.id,
      });
    } else if (verdict === "ambiguous") {
      out.push({
        code: "CUSTOM_AUDIENCE_NOT_READY", section: "audience", severity: "warning",
        message: `El estado de «${found.name}» en Meta es «${found.deliveryStatus}».`,
        field: found.id,
        remediation: "Compruébalo en el Administrador de anuncios si esperabas que estuviera lista.",
      });
    }
  }

  return out;
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function validateMetaPublishReadiness(params: {
  businessId: string;
  draft: CampaignDraft;
}): Promise<ReadinessResult> {
  const { businessId, draft } = params;

  const connection = await getMetaConnectionForBusiness(businessId);
  const issues = pureReadinessIssues(draft, connection);

  // The Meta checks only make sense with a usable credential and an account to
  // ask about. When they cannot run, the pure result already says why.
  const usable = connection?.status === "connected" && Boolean(connection.adAccountId);
  if (!usable) return toReadinessResult(issues, false);

  const token = await getMetaAccessToken(businessId);
  if (!token) return toReadinessResult(issues, false);

  const adAccountId = connection!.adAccountId as string;

  const [accountIssues, interestIssues, audienceIssues] = await Promise.all([
    checkAdAccount(token, adAccountId, draft),
    checkInterests(token, draft),
    checkCustomAudiences(businessId, adAccountId, draft),
  ]);

  // The pure layer may already have flagged a mismatch from the stored values;
  // the live answer supersedes it, so identical codes are collapsed.
  const merged = [...issues, ...accountIssues, ...interestIssues, ...audienceIssues];
  const seen = new Set<string>();
  const deduped = merged.filter((i) => {
    const key = `${i.code}|${i.field ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return toReadinessResult(deduped, true);
}
