import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Persisted state of the publish pipeline.
 *
 * Everything here exists so a run that dies halfway can be resumed rather than
 * repeated. The rule the whole module is built around: write the id we just
 * received BEFORE doing anything else, because an id we did not persist is an
 * object we can no longer find except by name.
 */

export type { PublishStatus, PublishStep } from "./publish-state";
import type { PublishStatus, PublishStep } from "./publish-state";
import { acquireFilter, nextStatusOnFailure, staleThreshold } from "./publish-state";

export interface CampaignLink {
  adCampaignId: string;
  metaCampaignId: string | null;
  metaAdSetId: string | null;
  publishStatus: PublishStatus;
  publishStep: PublishStep;
  publishError: string | null;
  attemptToken: string | null;
  publishedAt: string | null;
}

export interface AdLink {
  localAdId: string;
  metaVideoId: string | null;
  metaCreativeId: string | null;
  metaAdId: string | null;
}

/**
 * How long a run may hold the lock before another may take it.
 *
 * A process killed mid-flight leaves `running` behind forever otherwise. Ten
 * minutes is far longer than any successful run and short enough that a user
 * is not locked out for the rest of the day.
 */
const TABLE = "meta_campaign_links";
const AD_TABLE = "meta_ad_links";

const MIGRATION_HINT =
  "Las tablas de publicación no existen todavía. Ejecuta " +
  "scripts/meta-publish-links-schema.sql en Supabase → SQL Editor.";

export class PublishLinkError extends Error {}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toCampaignLink(row: any): CampaignLink {
  return {
    adCampaignId: row.ad_campaign_id,
    metaCampaignId: row.meta_campaign_id ?? null,
    metaAdSetId: row.meta_adset_id ?? null,
    publishStatus: row.publish_status,
    publishStep: row.publish_step,
    publishError: row.publish_error ?? null,
    attemptToken: row.attempt_token ?? null,
    publishedAt: row.published_at ?? null,
  };
}

function toAdLink(row: any): AdLink {
  return {
    localAdId: row.local_ad_id,
    metaVideoId: row.meta_video_id ?? null,
    metaCreativeId: row.meta_creative_id ?? null,
    metaAdId: row.meta_ad_id ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function fail(error: { code?: string; message?: string }): never {
  if (error.code === "42P01") throw new PublishLinkError(MIGRATION_HINT);
  console.error("[meta:publish-links]", error.code, error.message);
  throw new PublishLinkError("No se pudo leer o escribir el estado de publicación.");
}

/** Create the row if this campaign has never been published. Idempotent. */
async function ensureRow(adCampaignId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(TABLE)
    .upsert({ ad_campaign_id: adCampaignId }, { onConflict: "ad_campaign_id", ignoreDuplicates: true });
  if (error) fail(error);
}

export async function getCampaignLink(adCampaignId: string): Promise<CampaignLink | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("ad_campaign_id", adCampaignId)
    .maybeSingle();
  if (error) fail(error);
  return data ? toCampaignLink(data) : null;
}

export async function getAdLinks(adCampaignId: string): Promise<AdLink[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(AD_TABLE)
    .select("*")
    .eq("ad_campaign_id", adCampaignId);
  if (error) fail(error);
  return (data ?? []).map(toAdLink);
}

export type AcquireResult =
  | { ok: true; token: string; link: CampaignLink }
  | { ok: false; reason: "busy" | "already_published"; link: CampaignLink | null };

/**
 * Take exclusive ownership of the publish for this campaign.
 *
 * The race is closed by a single conditional UPDATE, not by read-then-write:
 *
 *   update … set publish_status='running', attempt_token=<new>
 *   where ad_campaign_id = <id>
 *     and (publish_status in ('idle','partial','failed')
 *          or (publish_status='running' and attempt_started_at < now()-10min))
 *   returning *
 *
 * Postgres takes a row lock for the duration of the statement, so two
 * concurrent requests are serialised: the first flips the row and gets it back,
 * the second re-evaluates the WHERE against the already-updated row, matches
 * nothing, and returns zero rows. Zero rows means "someone else owns it" — no
 * second pipeline can start, and no read-modify-write window exists for two
 * callers to both observe 'idle'.
 *
 * The freshly generated token is what proves ownership afterwards: every write
 * from here on is conditioned on it, so a resumed run that lost the lock cannot
 * overwrite the state of the run that took it.
 */
export async function acquirePublishLock(adCampaignId: string): Promise<AcquireResult> {
  await ensureRow(adCampaignId);

  const supabase = createAdminClient();
  const token = randomUUID();
  const staleBefore = staleThreshold();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      publish_status: "running",
      attempt_token: token,
      attempt_started_at: new Date().toISOString(),
      publish_error: null,
    })
    .eq("ad_campaign_id", adCampaignId)
    .or(acquireFilter(staleBefore))
    .select()
    .maybeSingle();

  if (error) fail(error);

  if (!data) {
    const current = await getCampaignLink(adCampaignId);
    return {
      ok: false,
      reason: current?.publishStatus === "published" ? "already_published" : "busy",
      link: current,
    };
  }

  return { ok: true, token, link: toCampaignLink(data) };
}

/**
 * Every write is conditioned on still holding the lock.
 *
 * If a takeover happened while we were waiting on Meta, our update matches
 * nothing and we stop instead of clobbering the newer run.
 */
async function updateOwned(
  adCampaignId: string,
  token: string,
  patch: Record<string, unknown>
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq("ad_campaign_id", adCampaignId)
    .eq("attempt_token", token)
    .select("id")
    .maybeSingle();
  if (error) fail(error);
  return Boolean(data);
}

/** Persist the campaign id the instant Meta returns it. */
export async function saveMetaCampaignId(
  adCampaignId: string, token: string, metaCampaignId: string
): Promise<boolean> {
  return updateOwned(adCampaignId, token, {
    meta_campaign_id: metaCampaignId,
    publish_step: "adset",
  });
}

export async function saveMetaAdSetId(
  adCampaignId: string, token: string, metaAdSetId: string
): Promise<boolean> {
  return updateOwned(adCampaignId, token, {
    meta_adset_id: metaAdSetId,
    publish_step: "creative",
  });
}

export async function saveMetaCreativeId(
  adCampaignId: string, token: string, localAdId: string, metaCreativeId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(AD_TABLE)
    .upsert(
      { ad_campaign_id: adCampaignId, local_ad_id: localAdId, meta_creative_id: metaCreativeId },
      { onConflict: "ad_campaign_id,local_ad_id" }
    );
  if (error) fail(error);
  return updateOwned(adCampaignId, token, { publish_step: "ad" });
}

export async function saveMetaAdId(
  adCampaignId: string, token: string, localAdId: string, metaAdId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from(AD_TABLE)
    .upsert(
      { ad_campaign_id: adCampaignId, local_ad_id: localAdId, meta_ad_id: metaAdId },
      { onConflict: "ad_campaign_id,local_ad_id" }
    );
  if (error) fail(error);
  return true;
}

export async function markPublished(adCampaignId: string, token: string): Promise<boolean> {
  return updateOwned(adCampaignId, token, {
    publish_status: "published",
    publish_step: "done",
    published_at: new Date().toISOString(),
    publish_error: null,
    attempt_token: null,
  });
}

/**
 * Release the lock after a failure.
 *
 * `partial` when something already exists in Meta, `failed` when nothing does.
 * The distinction matters to the operator: `partial` means there are objects
 * out there — paused, so harmless — that a retry will adopt rather than
 * duplicate. Nothing is ever deleted here.
 */
export async function markFailed(
  adCampaignId: string,
  token: string,
  step: PublishStep,
  error: string,
  anythingCreated: boolean
): Promise<boolean> {
  return updateOwned(adCampaignId, token, {
    publish_status: nextStatusOnFailure(anythingCreated),
    publish_step: step,
    publish_error: error.slice(0, 1000),
    attempt_token: null,
  });
}
