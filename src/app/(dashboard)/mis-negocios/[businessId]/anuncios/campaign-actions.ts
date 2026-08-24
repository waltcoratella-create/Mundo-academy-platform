"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignDraft, CampaignRow, PaymentLinkOption } from "./create/campaign-types";
import { validateAll, draftFromRow } from "./create/campaign-types";

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

/** yyyy-mm-dd → ISO timestamp at UTC midnight; "" → null. */
function toTimestamp(date: string): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

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

    return {
      ok: true,
      campaignId: row.id,
      status: row.status ?? "draft",
      draft: draftFromRow(row, { paymentLinks }),
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
    const errors = validateAll(draft);
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: Object.values(errors)[0] };
    }

    const supabase = createAdminClient();

    // Shared column payload — identical for insert and update so the two paths
    // can never drift apart.
    const payload = {
      product_id: draft.destinationKind === "product" ? draft.productId : null,
      name: draft.name.trim(),
      objective: draft.objective,
      destination_url: draft.creative.destinationUrl.trim() || null,
      budget_type: draft.budgetType,
      budget_amount: Number(draft.budgetAmount),
      currency: draft.currency,
      starts_at: toTimestamp(draft.startsAt),
      ends_at: toTimestamp(draft.endsAt),
      timezone: draft.timezone,
      // Targeting only.
      audience: draft.audience,
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
