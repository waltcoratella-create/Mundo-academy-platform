"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById } from "@/lib/supabase/queries";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createPaymentLink(
  businessId: string,
  _prevState: { error: string },
  formData: FormData
): Promise<{ error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Negocio no encontrado o sin acceso" };

  const title     = (formData.get("title") as string | null)?.trim() ?? "";
  const slug      = (formData.get("slug") as string | null)?.trim().toLowerCase() ?? "";
  const productId = (formData.get("product_id") as string | null)?.trim() ?? "";

  if (!title)     return { error: "El título es obligatorio" };
  if (!productId) return { error: "Selecciona un producto" };
  if (!slug)      return { error: "El slug es obligatorio" };
  if (!SLUG_RE.test(slug)) {
    return { error: "El slug solo puede contener letras minúsculas, números y guiones (sin espacios ni caracteres especiales)" };
  }

  const supabase = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("payment_links")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) return { error: "Este slug ya está en uso. Elige otro." };

  const { error } = await supabase.from("payment_links").insert({
    business_id: businessId,
    product_id:  productId,
    title,
    slug,
    active: true,
  });

  if (error) return { error: error.message };

  redirect(`/mis-negocios/${businessId}/enlaces-pago?created=1`);
}

export async function togglePaymentLink(
  linkId: string,
  businessId: string
): Promise<{ error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Sin acceso" };

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("payment_links")
    .select("active")
    .eq("id", linkId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!data) return { error: "Link no encontrado" };

  await supabase
    .from("payment_links")
    .update({ active: !data.active })
    .eq("id", linkId);

  revalidatePath(`/mis-negocios/${businessId}/enlaces-pago`);
  return {};
}
