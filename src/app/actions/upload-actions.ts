"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKET = "profile-media";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg":  "jpg",
  "image/jpg":   "jpg",
  "image/png":   "png",
  "image/webp":  "webp",
  "image/gif":   "gif",
  "image/avif":  "avif",
};

// ─── Shared upload helper ─────────────────────────────────────────────────────

async function uploadFile(
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string,
  file: File
): Promise<{ url?: string; error?: string }> {
  // Validate MIME type
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { error: "Tipo de archivo no permitido. Usa JPG, PNG, WebP o GIF." };
  }

  // Validate size
  if (file.size > MAX_BYTES) {
    return { error: "El archivo supera el límite de 5 MB." };
  }

  // Upload buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    if (
      uploadError.message?.toLowerCase().includes("bucket") &&
      uploadError.message?.toLowerCase().includes("not found")
    ) {
      return {
        error:
          'El bucket "profile-media" no existe. Créalo en Supabase → Storage → New bucket (nombre: profile-media, público: ON).',
      };
    }
    return { error: `Error al subir la imagen: ${uploadError.message}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return { url: publicUrl };
}

// ─── User: upload avatar ──────────────────────────────────────────────────────

export async function uploadUserAvatar(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo requerido" };
  }

  const ext = ALLOWED_TYPES[file.type] ?? "jpg";
  const path = `user-profiles/${userId}/avatar-${Date.now()}.${ext}`;

  const supabase = createAdminClient();
  const result = await uploadFile(supabase, path, file);
  if (result.error) return result;

  const { error: dbError } = await supabase
    .from("user_profiles")
    .upsert(
      { user_id: userId, avatar_url: result.url, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (dbError) return { error: "La imagen se subió pero no se pudo guardar en el perfil." };

  revalidatePath("/configuracion");
  revalidatePath(`/u/${userId}`);
  return { url: result.url };
}

// ─── User: upload cover ───────────────────────────────────────────────────────

export async function uploadUserCover(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo requerido" };
  }

  const ext = ALLOWED_TYPES[file.type] ?? "jpg";
  const path = `user-profiles/${userId}/cover-${Date.now()}.${ext}`;

  const supabase = createAdminClient();
  const result = await uploadFile(supabase, path, file);
  if (result.error) return result;

  const { error: dbError } = await supabase
    .from("user_profiles")
    .upsert(
      { user_id: userId, cover_url: result.url, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (dbError) return { error: "La imagen se subió pero no se pudo guardar en el perfil." };

  revalidatePath("/configuracion");
  revalidatePath(`/u/${userId}`);
  return { url: result.url };
}

// ─── Business: upload logo ────────────────────────────────────────────────────

export async function uploadBusinessLogo(
  businessId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo requerido" };
  }

  const supabase = createAdminClient();

  // Verify ownership
  const { data: bizRow } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!bizRow) return { error: "Negocio no encontrado" };

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!userRow?.id || bizRow.owner_id !== userRow.id) {
    return { error: "Sin permiso para editar este negocio" };
  }

  const ext = ALLOWED_TYPES[file.type] ?? "jpg";
  const path = `businesses/${businessId}/logo-${Date.now()}.${ext}`;

  const result = await uploadFile(supabase, path, file);
  if (result.error) return result;

  const { error: dbError } = await supabase
    .from("businesses")
    .update({ logo_url: result.url })
    .eq("id", businessId);

  if (dbError) return { error: "La imagen se subió pero no se pudo guardar." };

  revalidatePath(`/business/${businessId}`);
  revalidatePath(`/mis-negocios/${businessId}`);
  revalidatePath(`/mis-negocios/${businessId}/configuraciones`);
  return { url: result.url };
}

// ─── Business: upload cover ───────────────────────────────────────────────────

export async function uploadBusinessCover(
  businessId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo requerido" };
  }

  const supabase = createAdminClient();

  // Verify ownership
  const { data: bizRow } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!bizRow) return { error: "Negocio no encontrado" };

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!userRow?.id || bizRow.owner_id !== userRow.id) {
    return { error: "Sin permiso para editar este negocio" };
  }

  const ext = ALLOWED_TYPES[file.type] ?? "jpg";
  const path = `businesses/${businessId}/cover-${Date.now()}.${ext}`;

  const result = await uploadFile(supabase, path, file);
  if (result.error) return result;

  const { error: dbError } = await supabase
    .from("businesses")
    .update({ cover_url: result.url })
    .eq("id", businessId);

  if (dbError) return { error: "La imagen se subió pero no se pudo guardar." };

  revalidatePath(`/business/${businessId}`);
  revalidatePath(`/mis-negocios/${businessId}`);
  revalidatePath(`/mis-negocios/${businessId}/configuraciones`);
  return { url: result.url };
}

// ─── Product: upload cover ────────────────────────────────────────────────────

export async function uploadProductCover(
  productId: string,
  businessId: string,
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return { error: "No autenticado" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Archivo requerido" };
  }

  const supabase = createAdminClient();

  // Verify business ownership
  const { data: bizRow } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .maybeSingle();

  if (!bizRow) return { error: "Negocio no encontrado" };

  const { data: userRow } = await supabase
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  if (!userRow?.id || bizRow.owner_id !== userRow.id) {
    return { error: "Sin permiso para editar este producto" };
  }

  // Verify product belongs to this business
  const { data: productRow } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (!productRow) return { error: "Producto no encontrado" };

  const ext = ALLOWED_TYPES[file.type] ?? "jpg";
  const path = `products/${productId}/cover-${Date.now()}.${ext}`;

  const result = await uploadFile(supabase, path, file);
  if (result.error) return result;

  const { error: dbError } = await supabase
    .from("products")
    .update({ cover_url: result.url })
    .eq("id", productId);

  if (dbError) {
    if (dbError.code === "42703") {
      return {
        error:
          "La columna cover_url no existe todavía. Ejecuta el SQL de migración en Supabase → SQL Editor.",
      };
    }
    return { error: "La imagen se subió pero no se pudo guardar." };
  }

  revalidatePath(`/mis-negocios/${businessId}/productos/${productId}`);
  revalidatePath(`/mis-negocios/${businessId}`);
  revalidatePath("/descubrir");
  return { url: result.url };
}
