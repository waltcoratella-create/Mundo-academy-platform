"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

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
  /** True when the currently-authenticated user has liked this post */
  liked_by_current_user: boolean;
  /** Up to 3 most-recent comments, oldest first */
  recent_comments: FeedComment[];
}

export interface FeedPostsResult {
  posts: FeedPost[];
  tableExists: boolean;
  /** Present when there is a non-migration DB/network error */
  fetchError?: string;
}

// Raw shape straight from feed_posts (before enrichment)
type RawPost = Omit<FeedPost, "liked_by_current_user" | "recent_comments">;

// ── getFeedPosts ──────────────────────────────────────────────────────────────

export async function getFeedPosts(): Promise<FeedPostsResult> {
  try {
    const { userId } = await auth();
    const supabase = createAdminClient();

    // 1. Fetch posts
    const { data: postsData, error } = await supabase
      .from("feed_posts")
      .select(
        "id, user_id, business_id, author_name, author_avatar_url, content, image_url, likes_count, comments_count, views_count, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      if (error.code === "42P01") {
        return { posts: [], tableExists: false };
      }
      console.error("[feed_posts] query error:", error.code, error.message);
      return {
        posts: [],
        tableExists: true,
        fetchError: "Error al cargar el feed. Intenta recargar la página.",
      };
    }

    const rawPosts = (postsData ?? []) as RawPost[];

    if (rawPosts.length === 0) {
      return { posts: [], tableExists: true };
    }

    const postIds = rawPosts.map((p) => p.id);

    // 2. Fetch which posts the current user has liked
    //    (gracefully skip if feed_post_likes table doesn't exist yet)
    const likedPostIds = new Set<string>();
    if (userId) {
      try {
        const { data: likesData } = await supabase
          .from("feed_post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);
        (likesData ?? []).forEach((l) => likedPostIds.add(l.post_id as string));
      } catch {
        // table not yet created — safe to ignore
      }
    }

    // 3. Fetch up to 3 recent comments per post
    //    (gracefully skip if feed_post_comments table doesn't exist yet)
    const commentsByPost = new Map<string, FeedComment[]>();
    try {
      const { data: commentsData } = await supabase
        .from("feed_post_comments")
        .select(
          "id, post_id, user_id, author_name, author_avatar_url, content, created_at"
        )
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(150); // fetch generously; we cap at 3 per post in JS

      (commentsData ?? []).forEach((c) => {
        const arr = commentsByPost.get(c.post_id as string) ?? [];
        if (arr.length < 3) arr.push(c as FeedComment);
        commentsByPost.set(c.post_id as string, arr);
      });
    } catch {
      // table not yet created — safe to ignore
    }

    const posts: FeedPost[] = rawPosts.map((p) => ({
      ...p,
      liked_by_current_user: likedPostIds.has(p.id),
      // comments came in DESC order; reverse to get oldest-first for display
      recent_comments: [...(commentsByPost.get(p.id) ?? [])].reverse(),
    }));

    return { posts, tableExists: true };
  } catch (err) {
    console.error("[getFeedPosts] unexpected:", err);
    return {
      posts: [],
      tableExists: true,
      fetchError: "Error inesperado al cargar el feed. Intenta recargar la página.",
    };
  }
}

// ── createFeedPost ────────────────────────────────────────────────────────────

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

    // Author info from Clerk — never trust frontend
    const user = await currentUser();
    const authorName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const authorAvatarUrl = user?.imageUrl ?? null;

    const supabase = createAdminClient();

    // ── Optional image upload ─────────────────────────────────────────────
    let imageUrl: string | null = null;

    if (hasImage) {
      const MAX_BYTES = 5 * 1024 * 1024;
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
            error: 'El bucket "feed-post-images" no existe. Créalo en Supabase → Storage.',
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
      user_id: userId,
      author_name: authorName,
      author_avatar_url: authorAvatarUrl,
      content: content,
      image_url: imageUrl,
    });

    if (insertError) {
      console.error("[feed_posts insert]", insertError.code, insertError.message);
      if (insertError.code === "42P01") {
        return {
          error:
            "La tabla feed_posts no existe. Ejecuta la migración en Supabase primero.",
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

// ── togglePostLike ────────────────────────────────────────────────────────────

export async function togglePostLike(
  postId: string
): Promise<{ success?: boolean; liked?: boolean; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const supabase = createAdminClient();

    // Check if the user already liked this post
    const { data: existing } = await supabase
      .from("feed_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    let liked: boolean;

    if (existing) {
      // Remove like
      const { error } = await supabase
        .from("feed_post_likes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        console.error("[togglePostLike] delete error:", error.message);
        return { error: "Error al quitar el like. Intenta de nuevo." };
      }
      liked = false;
    } else {
      // Add like
      const { error } = await supabase
        .from("feed_post_likes")
        .insert({ post_id: postId, user_id: userId });
      if (error) {
        console.error("[togglePostLike] insert error:", error.message);
        return { error: "Error al dar like. Intenta de nuevo." };
      }
      liked = true;
    }

    // Recalculate likes_count from the source of truth
    const { count } = await supabase
      .from("feed_post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    await supabase
      .from("feed_posts")
      .update({ likes_count: count ?? 0 })
      .eq("id", postId);

    revalidatePath("/inicio");
    return { success: true, liked };
  } catch (err) {
    console.error("[togglePostLike] unexpected:", err);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// ── createPostComment ─────────────────────────────────────────────────────────

export async function createPostComment(
  postId: string,
  content: string
): Promise<{ success?: boolean; comment?: FeedComment; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const trimmed = content.trim();
    if (!trimmed) return { error: "El comentario no puede estar vacío" };
    if (trimmed.length > 2000) {
      return { error: "El comentario no puede superar 2 000 caracteres" };
    }

    // Author info from Clerk — never trust frontend
    const user = await currentUser();
    const authorName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const authorAvatarUrl = user?.imageUrl ?? null;

    const supabase = createAdminClient();

    const { data: commentData, error: insertError } = await supabase
      .from("feed_post_comments")
      .insert({
        post_id: postId,
        user_id: userId,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl,
        content: trimmed,
      })
      .select(
        "id, post_id, user_id, author_name, author_avatar_url, content, created_at"
      )
      .single();

    if (insertError) {
      console.error(
        "[feed_post_comments insert]",
        insertError.code,
        insertError.message
      );
      return { error: "Error al publicar el comentario. Intenta de nuevo." };
    }

    // Recalculate comments_count from the source of truth
    const { count } = await supabase
      .from("feed_post_comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    await supabase
      .from("feed_posts")
      .update({ comments_count: count ?? 0 })
      .eq("id", postId);

    revalidatePath("/inicio");
    return { success: true, comment: commentData as FeedComment };
  } catch (err) {
    console.error("[createPostComment] unexpected:", err);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}
