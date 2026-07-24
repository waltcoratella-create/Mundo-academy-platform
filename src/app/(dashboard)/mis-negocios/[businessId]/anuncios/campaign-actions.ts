"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CampaignDraft } from "./create/campaign-types";
import { validateAll } from "./create/campaign-types";

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

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

/**
 * Persist a campaign as a draft.
 *
 * Publishing is intentionally not implemented: Meta is not connected, so even
 * the "Publicar campaña" button lands here and the row stays `status: 'draft'`.
 * The caller surfaces the "conecta tu cuenta publicitaria…" message.
 */
export async function saveDraftCampaign(
  businessId: string,
  draft: CampaignDraft
): Promise<SaveResult> {
  try {
    const userId = await resolveOwner(businessId);
    if (!userId) return { ok: false, error: "No tienes permiso sobre este negocio." };

    // Re-validate server-side; the client checks are UX only.
    const errors = validateAll(draft);
    if (Object.keys(errors).length > 0) {
      return { ok: false, error: Object.values(errors)[0] };
    }

    const supabase = createAdminClient();

    const productId = draft.destinationKind === "product" ? draft.productId : null;

    const { data, error } = await supabase
      .from("ad_campaigns")
      .insert({
        business_id: businessId,
        user_id: userId,
        product_id: productId,
        name: draft.name.trim(),
        objective: draft.objective,
        status: "draft",
        destination_url: draft.creative.destinationUrl.trim() || null,
        budget_type: draft.budgetType,
        budget_amount: Number(draft.budgetAmount),
        currency: draft.currency,
        starts_at: toTimestamp(draft.startsAt),
        ends_at: toTimestamp(draft.endsAt),
        timezone: draft.timezone,
        audience: draft.audience,
        creative: draft.creative,
        platform: "meta",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "42P01") return { ok: false, error: MIGRATION_HINT };
      console.error("[ad_campaigns] insert error:", error.code, error.message);
      return { ok: false, error: "No se pudo guardar la campaña. Inténtalo de nuevo." };
    }

    revalidatePath(`/mis-negocios/${businessId}/anuncios`);
    return { ok: true, id: (data as { id: string }).id };
  } catch {
    return { ok: false, error: "No se pudo guardar la campaña. Inténtalo de nuevo." };
  }
}
