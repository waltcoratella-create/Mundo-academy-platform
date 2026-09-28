"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getBusinessById, resolveSupabaseUserId } from "@/lib/supabase/queries";
import { getDsaSettings, saveDsaSettings, AdSettingsError, type DsaSettings } from "@/lib/meta/ad-settings";
import { validateDsaInput } from "@/lib/meta/dsa";

/**
 * DSA declaration for a business.
 *
 * Saving requires an explicit confirmation from the person: the two names go
 * into the public EU ad library under this business's ads.
 */

export type DsaActionResult =
  | { ok: true; settings: DsaSettings | null }
  | { ok: false; error: string };

async function ownerContext(businessId: string) {
  const { userId } = await auth();
  if (!userId) return null;
  const business = await getBusinessById(businessId, userId);
  if (!business) return null;
  return { business, clerkUserId: userId };
}

export async function getDsaSettingsAction(businessId: string): Promise<DsaActionResult> {
  const ctx = await ownerContext(businessId);
  if (!ctx) return { ok: false, error: "No tienes permiso sobre este negocio." };
  try {
    return { ok: true, settings: await getDsaSettings(ctx.business.id) };
  } catch (e) {
    return { ok: false, error: e instanceof AdSettingsError ? e.message : "No se pudo leer la configuración." };
  }
}

export async function saveDsaSettingsAction(input: {
  businessId: string;
  beneficiary: string;
  payor: string;
  confirmed: boolean;
}): Promise<DsaActionResult> {
  const ctx = await ownerContext(input.businessId);
  if (!ctx) return { ok: false, error: "No tienes permiso sobre este negocio." };

  if (input.confirmed !== true) {
    return { ok: false, error: "Confirma que los datos son correctos antes de guardarlos." };
  }

  const valid = validateDsaInput(input);
  if (!valid.ok) return { ok: false, error: valid.reasons.join(" ") };

  const confirmedBy = await resolveSupabaseUserId(ctx.clerkUserId);
  if (!confirmedBy) return { ok: false, error: "No se pudo identificar al usuario que confirma." };

  try {
    const settings = await saveDsaSettings(ctx.business.id, confirmedBy, valid.value);
    revalidatePath(`/mis-negocios/${ctx.business.id}/configuraciones`);
    return { ok: true, settings };
  } catch (e) {
    return { ok: false, error: e instanceof AdSettingsError ? e.message : "No se pudo guardar la configuración." };
  }
}
