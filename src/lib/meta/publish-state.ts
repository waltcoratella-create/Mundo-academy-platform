/**
 * The publish state machine, as pure functions.
 *
 * Deliberately free of `server-only` and of any client: this is the part of the
 * pipeline that can be reasoned about — and tested — without a database or a
 * Meta credential. `publish-links.ts` builds its SQL from these same constants,
 * so the rule the tests exercise is the rule the UPDATE enforces.
 */

export type PublishStatus = "idle" | "running" | "partial" | "failed" | "published";
export type PublishStep = "campaign" | "adset" | "creative" | "ad" | "done";

/** Statuses a new attempt may take over unconditionally. */
export const ACQUIRABLE_STATUSES: readonly PublishStatus[] = ["idle", "partial", "failed"];

/**
 * How long a 'running' row is respected before another attempt may take it.
 *
 * A crashed run leaves 'running' behind forever, so without a takeover window a
 * single crash would make a campaign permanently unpublishable. Ten minutes is
 * comfortably longer than the four Graph calls the pipeline makes.
 */
export const STALE_LOCK_MINUTES = 10;

/**
 * The predicate the conditional UPDATE encodes.
 *
 * `running` is acquirable only once it is stale; `published` never is, which is
 * what makes double-publishing impossible rather than merely unlikely.
 */
export function canAcquire(
  status: PublishStatus,
  attemptStartedAt: string | null,
  now: Date = new Date()
): boolean {
  if (ACQUIRABLE_STATUSES.includes(status)) return true;
  if (status !== "running") return false;
  if (!attemptStartedAt) return false;
  const started = Date.parse(attemptStartedAt);
  if (Number.isNaN(started)) return false;
  return started < now.getTime() - STALE_LOCK_MINUTES * 60_000;
}

/** The PostgREST `or(...)` filter matching `canAcquire`, built from the same list. */
export function acquireFilter(staleBefore: string): string {
  return (
    `publish_status.in.(${ACQUIRABLE_STATUSES.join(",")}),` +
    `and(publish_status.eq.running,attempt_started_at.lt.${staleBefore})`
  );
}

export function staleThreshold(now: Date = new Date()): string {
  return new Date(now.getTime() - STALE_LOCK_MINUTES * 60_000).toISOString();
}

/**
 * Where a failed attempt leaves the row.
 *
 * The distinction matters to a human reading the row later: `partial` means
 * objects exist in Meta under this campaign's name tags, `failed` means nothing
 * was created and a retry starts clean.
 */
export function nextStatusOnFailure(anythingCreated: boolean): PublishStatus {
  return anythingCreated ? "partial" : "failed";
}

/**
 * The first step a resumed attempt must run.
 *
 * Purely a function of which ids are already stored, which is why each id is
 * persisted before the next call is made: whatever the run did survives it.
 */
export function resumeStepFrom(ids: {
  metaCampaignId?: string | null;
  metaAdSetId?: string | null;
  metaCreativeId?: string | null;
  metaAdId?: string | null;
}): PublishStep {
  if (!ids.metaCampaignId) return "campaign";
  if (!ids.metaAdSetId) return "adset";
  if (!ids.metaCreativeId) return "creative";
  if (!ids.metaAdId) return "ad";
  return "done";
}
