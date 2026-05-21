"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById } from "@/lib/supabase/queries";

export async function updateBusinessSettings(
  businessId: string,
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Negocio no encontrado o sin acceso" };

  const name = (formData.get("name") as string | null)?.trim() ?? "";
  if (!name) return { error: "El nombre del negocio es obligatorio" };

  const description    = (formData.get("description") as string | null)?.trim() || null;
  const website        = (formData.get("website") as string | null)?.trim() || null;
  const support_email  = (formData.get("support_email") as string | null)?.trim() || null;
  const logo_url       = (formData.get("logo_url") as string | null)?.trim() || null;
  const cover_url      = (formData.get("cover_url") as string | null)?.trim() || null;

  const supabase = createAdminClient();

  // Try full update with extended columns
  const { error } = await supabase
    .from("businesses")
    .update({ name, description, website, support_email, logo_url, cover_url })
    .eq("id", businessId);

  if (error) {
    // Column-not-found (42703) — columns haven't been added yet; fall back to name only
    if (error.code === "42703") {
      const { error: nameErr } = await supabase
        .from("businesses")
        .update({ name })
        .eq("id", businessId);
      if (nameErr) return { error: nameErr.message };
    } else {
      return { error: error.message };
    }
  }

  redirect(`/mis-negocios/${businessId}/configuraciones?updated=1`);
}
