"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById, getProductById, getContentById } from "@/lib/supabase/queries";

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

export type ContentFormState = { error: string | null };

export async function createProductContent(
  _prev: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const businessId = formData.get("businessId") as string;
  const productId  = formData.get("productId") as string;
  if (!businessId || !productId) return { error: "Parámetros requeridos" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Negocio no encontrado o sin permisos" };

  const product = await getProductById(productId, businessId);
  if (!product) return { error: "Producto no encontrado" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "El título es requerido" };

  const type    = (formData.get("type") as string) || "texto";
  const content = (formData.get("content") as string)?.trim() || null;

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("product_content")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error } = await supabase.from("product_content").insert({
    product_id: productId,
    title,
    type,
    content,
    position: count ?? 0,
  });

  if (error) return { error: error.message };

  redirect(`/mis-negocios/${businessId}/productos/${productId}/contenido`);
}

export async function updateProductContent(
  _prev: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const businessId = formData.get("businessId") as string;
  const productId  = formData.get("productId") as string;
  const contentId  = formData.get("contentId") as string;
  if (!businessId || !productId || !contentId) return { error: "Parámetros requeridos" };

  const business = await getBusinessById(businessId, userId);
  if (!business) return { error: "Negocio no encontrado o sin permisos" };

  const product = await getProductById(productId, businessId);
  if (!product) return { error: "Producto no encontrado" };

  const existing = await getContentById(contentId, productId);
  if (!existing) return { error: "Contenido no encontrado" };

  const title = (formData.get("title") as string)?.trim();
  if (!title) return { error: "El título es requerido" };

  const type    = (formData.get("type") as string) || existing.type;
  const content = (formData.get("content") as string)?.trim() || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("product_content")
    .update({ title, type, content })
    .eq("id", contentId)
    .eq("product_id", productId);

  if (error) return { error: error.message };

  redirect(
    `/mis-negocios/${businessId}/productos/${productId}/contenido/${contentId}?updated=1`
  );
}
