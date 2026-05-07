"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById } from "@/lib/supabase/queries";

export type ProductFormState = { error: string | null };

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const businessId = formData.get("businessId") as string;
  if (!businessId) return { error: "businessId requerido" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Negocio no encontrado o sin permisos" };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "El nombre del producto es requerido" };

  const description = (formData.get("description") as string)?.trim() || null;
  const price = parseFloat(formData.get("price") as string) || 0;
  const type = (formData.get("type") as string) || "curso";
  const status = (formData.get("status") as string) || "draft";

  const supabase = createAdminClient();
  const { error } = await supabase.from("products").insert({
    business_id: businessId,
    name,
    description,
    price,
    type,
    status,
  });

  if (error) return { error: error.message };

  redirect(`/mis-negocios/${businessId}/productos`);
}
