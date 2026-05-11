"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessById, getProductById, getContentById } from "@/lib/supabase/queries";
import { normalizeAccessType, normalizeBillingPeriod } from "@/lib/constants/products";
import { generateSlug } from "@/lib/utils";

export type ProductFormState = { error: string | null };
export type ContentFormState = { error: string | null };

// ─── helpers ────────────────────────────────────────────────────────────────

function internalError(e: unknown): ProductFormState {
  console.error("[products action]", e);
  return { error: "Error interno. Inténtalo de nuevo." };
}

// ─── createProduct ───────────────────────────────────────────────────────────

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  let redirectPath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const businessId = formData.get("businessId") as string;
    if (!businessId) return { error: "businessId requerido" };

    const business = await getBusinessById(businessId, userId);
    if (!business) return { error: "Negocio no encontrado o sin permisos" };

    const name = (formData.get("name") as string)?.trim();
    if (!name) return { error: "El nombre del producto es requerido" };

    const description    = (formData.get("description") as string)?.trim() || null;
    const price          = parseFloat(formData.get("price") as string) || 0;
    const type           = (formData.get("type") as string) || "curso";
    const status         = (formData.get("status") as string) || "draft";

    const supabase = createAdminClient();

    // Generate a unique slug from the product name
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 2;
    while (attempt < 100) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      slug = `${baseSlug}-${attempt}`;
      attempt++;
    }

    const { error } = await supabase.from("products").insert({
      business_id: businessId,
      name,
      description,
      price,
      type,
      status,
      slug: slug || null,
    });

    if (error) return { error: error.message };

    redirectPath = `/mis-negocios/${businessId}/productos`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}

// ─── deleteProduct ───────────────────────────────────────────────────────────

export async function deleteProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  let redirectPath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const businessId = formData.get("businessId") as string;
    const productId  = formData.get("productId") as string;
    if (!businessId || !productId) return { error: "Parámetros requeridos" };

    const business = await getBusinessById(businessId, userId);
    if (!business) return { error: "Negocio no encontrado o sin permisos" };

    const product = await getProductById(productId, businessId);
    if (!product) return { error: "Producto no encontrado" };

    const supabase = createAdminClient();

    // Delete content first (may not have cascade)
    await supabase.from("product_content").delete().eq("product_id", productId);

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("business_id", businessId);

    if (error) return { error: error.message };

    redirectPath = `/mis-negocios/${businessId}/productos`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}

// ─── createProductContent ────────────────────────────────────────────────────

export async function createProductContent(
  _prev: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  let redirectPath: string | null = null;

  try {
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

    redirectPath = `/mis-negocios/${businessId}/productos/${productId}/contenido`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}

// ─── updateProductContent ────────────────────────────────────────────────────

export async function updateProductContent(
  _prev: ContentFormState,
  formData: FormData
): Promise<ContentFormState> {
  let redirectPath: string | null = null;

  try {
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

    redirectPath = `/mis-negocios/${businessId}/productos/${productId}/contenido/${contentId}?updated=1`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}

// ─── updateProductAccess ─────────────────────────────────────────────────────

export async function updateProductAccess(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  let redirectPath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const businessId = formData.get("businessId") as string;
    const productId  = formData.get("productId") as string;
    if (!businessId || !productId) return { error: "Parámetros requeridos" };

    const business = await getBusinessById(businessId, userId);
    if (!business) return { error: "Negocio no encontrado o sin permisos" };

    // Ownership check using base columns only (no new columns needed here)
    const supabase = createAdminClient();
    const { data: existingProduct, error: fetchErr } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (fetchErr || !existingProduct) return { error: "Producto no encontrado" };

    const access_type = normalizeAccessType(formData.get("access_type") as string);
    const is_public   = formData.get("is_public") === "true";

    const { error } = await supabase
      .from("products")
      .update({ access_type, is_public })
      .eq("id", productId)
      .eq("business_id", businessId);

    if (error) return { error: error.message };

    redirectPath = `/mis-negocios/${businessId}/productos/${productId}/acceso?updated=1`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}

// ─── updateProductPricing ────────────────────────────────────────────────────

export async function updateProductPricing(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  let redirectPath: string | null = null;

  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const businessId = formData.get("businessId") as string;
    const productId  = formData.get("productId") as string;
    if (!businessId || !productId) return { error: "Parámetros requeridos" };

    const business = await getBusinessById(businessId, userId);
    if (!business) return { error: "Negocio no encontrado o sin permisos" };

    // Ownership check using base columns only
    const supabase = createAdminClient();
    const { data: existingProduct, error: fetchErr } = await supabase
      .from("products")
      .select("id")
      .eq("id", productId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (fetchErr || !existingProduct) return { error: "Producto no encontrado" };

    const priceRaw = formData.get("price") as string;
    const price    = priceRaw !== "" ? parseFloat(priceRaw) : 0;
    if (isNaN(price) || price < 0) return { error: "Precio inválido" };

    const currency       = (formData.get("currency") as string) || "USD";
    const billing_period = normalizeBillingPeriod(formData.get("billing_period") as string);

    const { error } = await supabase
      .from("products")
      .update({ price, currency, billing_period })
      .eq("id", productId)
      .eq("business_id", businessId);

    if (error) return { error: error.message };

    redirectPath = `/mis-negocios/${businessId}/productos/${productId}/precio?updated=1`;
  } catch (e) {
    return internalError(e);
  }

  redirect(redirectPath!);
}
