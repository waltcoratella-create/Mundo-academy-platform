"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  user_id: string;
  business_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface FeedPostsResult {
  posts: FeedPost[];
  tableExists: boolean;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getFeedPosts(): Promise<FeedPostsResult> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("feed_posts")
      .select(
        "id, user_id, business_id, author_name, author_avatar_url, content, image_url, likes_count, comments_count, views_count, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      const tableExists = error.code !== "42P01";
      console.error("[feed_posts] query error:", error.code, error.message);
      return { posts: [], tableExists };
    }

    return {
      posts: (data ?? []) as FeedPost[],
      tableExists: true,
    };
  } catch {
    return { posts: [], tableExists: false };
  }
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function createFeedPost(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const content = ((formData.get("content") as string) ?? "").trim();
    const imageFile = formData.get("image") as File | null;
    const hasImage = !!imageFile && imageFile.size > 0;

    if (!content && !hasImage) {
      return { error: "Escribe algo o adjunta una imagen" };
    }
    if (content.length > 5000) {
      return { error: "El contenido no puede superar 5 000 caracteres" };
    }

    // Resolve author info from Clerk (server-side — never trust frontend)
    const user = await currentUser();
    const authorName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const authorAvatarUrl = user?.imageUrl ?? null;

    const supabase = createAdminClient();

    // ── Optional image upload ─────────────────────────────────────────────
    let imageUrl: string | null = null;

    if (hasImage) {
      const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
      if (imageFile.size > MAX_BYTES) {
        return { error: "La imagen no puede superar 5 MB" };
      }
      if (!imageFile.type.startsWith("image/")) {
        return { error: "Solo se permiten archivos de imagen (jpg, png, gif, webp…)" };
      }

      const ext = (imageFile.name.split(".").pop() ?? "jpg").toLowerCase();
      const randomSuffix = Math.random().toString(36).slice(2, 10);
      const storagePath = `${userId}/${Date.now()}-${randomSuffix}.${ext}`;

      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("feed-post-images")
        .upload(storagePath, buffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[feed image upload]", uploadError.message);
        if (uploadError.message?.includes("Bucket not found")) {
          return {
            error:
              'El bucket "feed-post-images" no existe. Créalo en Supabase → Storage.',
          };
        }
        return { error: "Error al subir la imagen. Intenta de nuevo." };
      }

      const { data: urlData } = supabase.storage
        .from("feed-post-images")
        .getPublicUrl(storagePath);
      imageUrl = urlData.publicUrl;
    }

    // ── Insert post ───────────────────────────────────────────────────────
    const { error: insertError } = await supabase.from("feed_posts").insert({
      user_id:           userId,
      author_name:       authorName,
      author_avatar_url: authorAvatarUrl,
      content:           content,
      image_url:         imageUrl,
    });

    if (insertError) {
      console.error("[feed_posts insert]", insertError.code, insertError.message);
      if (insertError.code === "42P01") {
        return {
          error: "La tabla feed_posts no existe. Ejecuta la migración en Supabase primero.",
        };
      }
      return { error: "Error al publicar. Intenta de nuevo." };
    }

    revalidatePath("/inicio");
    return { success: true };
  } catch (err) {
    console.error("[createFeedPost] unexpected:", err);
    return { error: "Error inesperado al publicar" };
  }
}
