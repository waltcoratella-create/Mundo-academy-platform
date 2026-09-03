"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { zonedLocalToUtc, isValidTimeZone } from "@/lib/timezone";
import type { CampaignDraft, CampaignRow, PaymentLinkOption } from "./create/campaign-types";
import {
  validateDraftForSave, draftFromRow, normalizeAudience, resolvedCampaignName,
} from "./create/campaign-types";
import { getMetaAccountBinding } from "./meta-account";

export type SaveResult =
  | { ok: true; id: string; mode: "created" | "updated" }
  | { ok: false; error: string };

/** Only drafts are editable — nothing is synced to an ad platform yet. */
const NOT_EDITABLE =
  "Solo se pueden editar campañas en borrador.";
const NOT_FOUND = "Campaña no encontrada.";

const OBJECTIVE_MIGRATION_HINT =
  'El objetivo "Interacción" todavía no está permitido en la base de datos. ' +
  "Amplía la restricción ad_campaigns_objective_chk para incluir 'engagement'.";

const MIGRATION_HINT =
  "La tabla ad_campaigns no existe todavía. Ejecuta scripts/ads-campaigns-schema.sql en Supabase → SQL Editor.";

/**
 * Resolve the authed Clerk user to a Supabase user row and confirm they own the
 * business. Returns the internal user id, or null when either check fails —
 * businessId arrives from the client and is never trusted.
 */
async function resolveOwner(businessId: string): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const supabase = createAdminClient();

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();
  if (!user?.id) return null;

  const { data: biz } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!biz) return null;

  return user.id as string;
}

const INVALID_TIMEZONE =
  "La zona horaria seleccionada no es válida. Elige otra antes de guardar.";



/** Columns the builder reads back when resuming a draft. */
const DRAFT_COLUMNS =
  "id, platform, objective, name, product_id, destination_url, budget_type, " +
  "budget_amount, currency, starts_at, ends_at, timezone, audience, delivery, " +
  "creative, status";

export type LoadResult =
  | { ok: true; draft: CampaignDraft; campaignId: string; status: string }
  | { ok: false; error: string };

/**
 * Load a campaign as a draft for editing.
 *
 * Ownership is resolved server-side from the Clerk session; `campaignId` from
 * the client is only ever used inside a query that is already scoped to a
 * business the caller owns, so another business's campaign simply is not found.
 */
export async function getCampaignDraft(params: {
  businessId: string;
  campaignId: string;
  paymentLinks: PaymentLinkOption[];
}): Promise<LoadResult> {
  const { businessId, campaignId, paymentLinks } = params;
  try {
    const userId = await resolveOwner(businessId);
    if (!userId) return { ok: false, error: "No tienes permiso sobre este negocio." };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ad_campaigns")
      .select(DRAFT_COLUMNS)
      .eq("id", campaignId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      if (error.code === "42P01") return { ok: false, error: MIGRATION_HINT };
      console.error("[ad_campaigns] load error:", error.code, error.message);
      return { ok: false, error: NOT_FOUND };
    }
    if (!data) return { ok: false, error: NOT_FOUND };

    const row = data as unknown as CampaignRow;
    if ((row.status ?? "draft") !== "draft") {
      return { ok: false, error: NOT_EDITABLE };
    }

    // Resolved here, not passed in: the loader already owns the trust boundary,
    // so the account that rules currency and zone is read server-side too.
    const metaAccount = await getMetaAccountBinding(businessId);

    return {
      ok: true,
      campaignId: row.id,
      status: row.status ?? "draft",
      draft: draftFromRow(row, { paymentLinks, metaAccount }),
    };
  } catch {
    return { ok: false, error: NOT_FOUND };
  }
}

/**
 * Create or update a campaign draft.
 *
 * Without `campaignId` this inserts; with one it updates that row, scoped to
 * the owned business and to `status = 'draft'` so an already-live campaign is
 * never rewritten. `business_id` is taken from the verified server-side value,
 * never from the payload, so it cannot be moved between businesses.
 *
 * Publishing is still not implemented: Meta is not connected, so even the
 * "Publicar campaña" button lands here and the row stays `status: 'draft'`.
 */
export async function saveCampaignDraft(params: {
  businessId: string;
  campaignId?: string;
  draft: CampaignDraft;
}): Promise<SaveResult> {
  const { businessId, campaignId, draft } = params;
  try {
    const userId = await resolveOwner(businessId);
    if (!userId) return { ok: false, error: "No tienes permiso sobre este negocio." };

    // Re-validate server-side; the client checks are UX only.
    //
    // Only what the table itself refuses. A draft is allowed to be unfinished —
    // no creatives, no destination, unresolved targeting — because "can this be
    // stored" and "is this ready to publish" are different questions, and the
    // second one is not asked here.
    const errors = validateDraftForSave(draft);
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: Object.values(errors)[0] };
    }

    // The wall clock the user typed means that time IN the chosen zone, so the
    // stored instant depends on that zone's offset on that date (DST included).
    // A zone we cannot resolve aborts the save rather than silently storing a
    // wrong instant.
    if (!isValidTimeZone(draft.timezone)) {
      return { ok: false, error: INVALID_TIMEZONE };
    }
    const startsAt = zonedLocalToUtc(draft.startsAt, draft.timezone);
    const endsAt = draft.endsAt ? zonedLocalToUtc(draft.endsAt, draft.timezone) : null;
    if (draft.startsAt && !startsAt) {
      return { ok: false, error: "La fecha de inicio no es válida." };
    }
    if (draft.endsAt && !endsAt) {
      return { ok: false, error: "La fecha de fin no es válida." };
    }

    const supabase = createAdminClient();

    // Shared column payload — identical for insert and update so the two paths
    // can never drift apart.
    const payload = {
      product_id: draft.destinationKind === "product" ? draft.productId : null,
      // NOT NULL with no default: an unnamed draft gets the placeholder instead
      // of being refused. Resolved by the same helper the wizard uses.
      name: resolvedCampaignName(draft.name),
      objective: draft.objective,
      // The campaign-level column takes the first ad's destination; every ad is
      // seeded from the same Build selection, so they agree unless deliberately
      // overridden per ad.
      destination_url: draft.creative.ads[0]?.destinationUrl.trim() || null,
      budget_type: draft.budgetType,
      // `Number("")` is 0, which violates CHECK (budget_amount > 0). An empty
      // field means "not decided yet", so it is stored as null.
      budget_amount: draft.budgetAmount.trim() ? Number(draft.budgetAmount) : null,
      currency: draft.currency,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: draft.timezone,
      // Targeting only. Re-normalised server-side so a hand-crafted payload
      // cannot store a location shape the loader would not understand, and so
      // legacy name-only entries are written back in the current object form
      // (still with key: null — a key is never invented).
      audience: normalizeAudience(draft.audience),
      // Where/how it is delivered: conversion location + event, Advantage+
      // placements and the Campaign advanced options.
      delivery: draft.delivery,
      creative: draft.creative,
      platform: draft.platform ?? "meta",
    };

    const failed = (error: { code?: string; message?: string }): SaveResult => {
      if (error.code === "42P01") return { ok: false, error: MIGRATION_HINT };
      if (error.code === "23514" && draft.objective === "engagement") {
        return { ok: false, error: OBJECTIVE_MIGRATION_HINT };
      }
      console.error("[ad_campaigns] write error:", error.code, error.message);
      return { ok: false, error: "No se pudo guardar la campaña. Inténtalo de nuevo." };
    };

    if (campaignId) {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .update(payload)
        .eq("id", campaignId)
        .eq("business_id", businessId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (error) return failed(error);
      if (!data) {
        // Either it does not exist, belongs elsewhere, or is no longer a draft.
        return { ok: false, error: NOT_EDITABLE };
      }
      revalidatePath(`/mis-negocios/${businessId}/anuncios`);
      return { ok: true, id: (data as { id: string }).id, mode: "updated" };
    }

    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({ ...payload, business_id: businessId, user_id: userId, status: "draft" })
      .select("id")
      .single();

    if (error) return failed(error);
    revalidatePath(`/mis-negocios/${businessId}/anuncios`);
    return { ok: true, id: (data as { id: string }).id, mode: "created" };
  } catch {
    return { ok: false, error: "No se pudo guardar la campaña. Inténtalo de nuevo." };
  }
}
