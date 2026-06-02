"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FeedReply {
  id: string;
  comment_id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
}

export interface FeedComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string | null;
  author_avatar_url: string | null;
  content: string;
  created_at: string;
  /** Up to 2 replies (initial load) or all replies (getPostComments), oldest first */
  recent_replies: FeedReply[];
}

export interface FeedBusiness {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface FeedPost {
  id: string;
  user_id: string;
  business_id: string | null;
  /** Resolved from businesses table; null means Mundo Academy */
  business_name: string | null;
  business_logo_url: string | null;
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

export interface FeedCreator {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  post_count: number;
  /** Human-readable context line: "Creador de X", "Miembro activo…", etc. */
  display_context: string;
}

export interface FeedNotification {
  id: string;
  recipient_user_id: string;
  actor_user_id: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
  type: "post_like" | "post_comment" | "comment_reply" | "user_follow";
  post_id: string | null;
  comment_id: string | null;
  reply_id: string | null;
  read_at: string | null;
  created_at: string;
}

// Raw shape straight from feed_posts (before enrichment)
type RawPost = Omit<
  FeedPost,
  "liked_by_current_user" | "recent_comments" | "business_name" | "business_logo_url"
>;

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Resolve actor name/avatar from their most recent feed post — fast, no Clerk API call */
async function resolveActorInfo(
  actorUserId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ name: string | null; avatar_url: string | null }> {
  try {
    const { data } = await supabase
      .from("feed_posts")
      .select("author_name, author_avatar_url")
      .eq("user_id", actorUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return {
      name: (data?.author_name ?? null) as string | null,
      avatar_url: (data?.author_avatar_url ?? null) as string | null,
    };
  } catch {
    return { name: null, avatar_url: null };
  }
}

/** Insert a notification row; silently skips if actor === recipient or table missing */
async function createNotification(
  supabase: ReturnType<typeof createAdminClient>,
  opts: {
    recipientUserId: string;
    actorUserId: string;
    actorName: string | null;
    actorAvatarUrl: string | null;
    type: string;
    postId?: string | null;
    commentId?: string | null;
    replyId?: string | null;
  }
): Promise<void> {
  if (opts.recipientUserId === opts.actorUserId) return;
  try {
    await supabase.from("notifications").insert({
      recipient_user_id: opts.recipientUserId,
      actor_user_id: opts.actorUserId,
      actor_name: opts.actorName,
      actor_avatar_url: opts.actorAvatarUrl,
      type: opts.type,
      post_id: opts.postId ?? null,
      comment_id: opts.commentId ?? null,
      reply_id: opts.replyId ?? null,
    });
  } catch {
    // notifications table not yet created — safe to ignore
  }
}

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
    type RawComment = Omit<FeedComment, "recent_replies">;
    const rawCommentsByPost = new Map<string, RawComment[]>();
    const loadedCommentIds: string[] = [];

    try {
      const { data: commentsData } = await supabase
        .from("feed_post_comments")
        .select(
          "id, post_id, user_id, author_name, author_avatar_url, content, created_at"
        )
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(150);

      (commentsData ?? []).forEach((c) => {
        const arr = rawCommentsByPost.get(c.post_id as string) ?? [];
        if (arr.length < 3) {
          arr.push(c as RawComment);
          loadedCommentIds.push(c.id as string);
        }
        rawCommentsByPost.set(c.post_id as string, arr);
      });
    } catch {
      // table not yet created — safe to ignore
    }

    // 4. Fetch up to 2 replies per loaded comment
    //    (gracefully skip if feed_comment_replies table doesn't exist yet)
    const repliesByComment = new Map<string, FeedReply[]>();
    if (loadedCommentIds.length > 0) {
      try {
        const { data: repliesData } = await supabase
          .from("feed_comment_replies")
          .select(
            "id, comment_id, post_id, user_id, author_name, author_avatar_url, content, created_at"
          )
          .in("comment_id", loadedCommentIds)
          .order("created_at", { ascending: false })
          .limit(loadedCommentIds.length * 2);

        (repliesData ?? []).forEach((r) => {
          const arr = repliesByComment.get(r.comment_id as string) ?? [];
          if (arr.length < 2) arr.push(r as FeedReply);
          repliesByComment.set(r.comment_id as string, arr);
        });
      } catch {
        // table not yet created — safe to ignore
      }
    }

    // Merge: attach replies to each comment, attach comments to each post
    const commentsByPost = new Map<string, FeedComment[]>();
    rawCommentsByPost.forEach((rawComments, pid) => {
      const enriched: FeedComment[] = [...rawComments]
        .reverse() // DESC → ASC (oldest first)
        .map((c) => ({
          ...c,
          recent_replies: [...(repliesByComment.get(c.id) ?? [])].reverse(),
        }));
      commentsByPost.set(pid, enriched);
    });

    // 5. Fetch business names/logos for posts that have a business_id
    const bizMap = new Map<string, { name: string; logo_url: string | null }>();
    const uniqueBizIds = [
      ...new Set(rawPosts.map((p) => p.business_id).filter(Boolean) as string[]),
    ];
    if (uniqueBizIds.length > 0) {
      try {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("id, name, logo_url")
          .in("id", uniqueBizIds);
        (bizData ?? []).forEach((b) => {
          bizMap.set(b.id as string, {
            name: b.name as string,
            logo_url: (b.logo_url as string | null) ?? null,
          });
        });
      } catch {
        // safe to ignore
      }
    }

    const posts: FeedPost[] = rawPosts.map((p) => {
      const biz = p.business_id ? bizMap.get(p.business_id) : null;
      return {
        ...p,
        business_name: biz?.name ?? null,
        business_logo_url: biz?.logo_url ?? null,
        liked_by_current_user: likedPostIds.has(p.id),
        recent_comments: commentsByPost.get(p.id) ?? [],
      };
    });

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

    // business_id from form — validate ownership server-side, never trust the value
    const rawBizId = ((formData.get("business_id") as string) ?? "").trim();
    const businessId: string | null = rawBizId || null;

    // Author info from Clerk — never trust frontend
    const user = await currentUser();
    const authorName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const authorAvatarUrl = user?.imageUrl ?? null;

    const supabase = createAdminClient();

    // ── Validate business ownership if publishing to a business ──────────
    if (businessId) {
      // businesses.owner_id → users.id (UUID), not Clerk ID
      const { data: userData } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", userId)
        .maybeSingle();

      if (!userData) {
        return { error: "No se encontró tu perfil de usuario." };
      }

      const { data: bizData } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", businessId)
        .eq("owner_id", userData.id)
        .maybeSingle();

      if (!bizData) {
        return { error: "No tienes acceso a ese negocio." };
      }
    }

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
      business_id: businessId,
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

    // Notify post owner when a like is given (not removed)
    if (liked) {
      try {
        const { data: post } = await supabase
          .from("feed_posts")
          .select("user_id")
          .eq("id", postId)
          .maybeSingle();
        if (post?.user_id) {
          const actor = await resolveActorInfo(userId, supabase);
          await createNotification(supabase, {
            recipientUserId: post.user_id as string,
            actorUserId: userId,
            actorName: actor.name,
            actorAvatarUrl: actor.avatar_url,
            type: "post_like",
            postId,
          });
        }
      } catch {
        // non-critical — never fail the like action
      }
    }

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

    // Notify post owner
    try {
      const { data: post } = await supabase
        .from("feed_posts")
        .select("user_id")
        .eq("id", postId)
        .maybeSingle();
      if (post?.user_id) {
        await createNotification(supabase, {
          recipientUserId: post.user_id as string,
          actorUserId: userId,
          actorName: authorName,
          actorAvatarUrl: authorAvatarUrl,
          type: "post_comment",
          postId,
          commentId: (commentData as { id: string }).id,
        });
      }
    } catch {
      // non-critical
    }

    revalidatePath("/inicio");
    return {
      success: true,
      comment: { ...(commentData as Omit<FeedComment, "recent_replies">), recent_replies: [] },
    };
  } catch (err) {
    console.error("[createPostComment] unexpected:", err);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// ── getPostComments ───────────────────────────────────────────────────────────

export async function getPostComments(
  postId: string
): Promise<{ comments: FeedComment[]; error?: string }> {
  try {
    const supabase = createAdminClient();

    // All comments for the post, oldest first
    const { data: commentsData, error } = await supabase
      .from("feed_post_comments")
      .select(
        "id, post_id, user_id, author_name, author_avatar_url, content, created_at"
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getPostComments]", error.code, error.message);
      return { comments: [], error: "Error al cargar comentarios." };
    }

    const rawComments = (commentsData ?? []) as Omit<FeedComment, "recent_replies">[];

    if (rawComments.length === 0) return { comments: [] };

    const commentIds = rawComments.map((c) => c.id);

    // All replies for those comments
    const repliesByComment = new Map<string, FeedReply[]>();
    try {
      const { data: repliesData } = await supabase
        .from("feed_comment_replies")
        .select(
          "id, comment_id, post_id, user_id, author_name, author_avatar_url, content, created_at"
        )
        .in("comment_id", commentIds)
        .order("created_at", { ascending: true });

      (repliesData ?? []).forEach((r) => {
        const arr = repliesByComment.get(r.comment_id as string) ?? [];
        arr.push(r as FeedReply);
        repliesByComment.set(r.comment_id as string, arr);
      });
    } catch {
      // replies table not yet created — safe to ignore
    }

    const comments: FeedComment[] = rawComments.map((c) => ({
      ...c,
      recent_replies: repliesByComment.get(c.id) ?? [],
    }));

    return { comments };
  } catch (err) {
    console.error("[getPostComments] unexpected:", err);
    return { comments: [], error: "Error inesperado al cargar comentarios." };
  }
}

// ── createCommentReply ────────────────────────────────────────────────────────

export async function createCommentReply(
  commentId: string,
  postId: string,
  content: string
): Promise<{ success?: boolean; reply?: FeedReply; error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const trimmed = content.trim();
    if (!trimmed) return { error: "La respuesta no puede estar vacía" };
    if (trimmed.length > 2000) {
      return { error: "La respuesta no puede superar 2 000 caracteres" };
    }

    // Author info from Clerk — never trust frontend
    const user = await currentUser();
    const authorName = user?.firstName
      ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
      : (user?.emailAddresses?.[0]?.emailAddress ?? "Usuario");
    const authorAvatarUrl = user?.imageUrl ?? null;

    const supabase = createAdminClient();

    const { data: replyData, error: insertError } = await supabase
      .from("feed_comment_replies")
      .insert({
        comment_id: commentId,
        post_id: postId,
        user_id: userId,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl,
        content: trimmed,
      })
      .select(
        "id, comment_id, post_id, user_id, author_name, author_avatar_url, content, created_at"
      )
      .single();

    if (insertError) {
      console.error(
        "[feed_comment_replies insert]",
        insertError.code,
        insertError.message
      );
      return { error: "Error al publicar la respuesta. Intenta de nuevo." };
    }

    // Notify comment owner
    try {
      const { data: comment } = await supabase
        .from("feed_post_comments")
        .select("user_id")
        .eq("id", commentId)
        .maybeSingle();
      if (comment?.user_id) {
        await createNotification(supabase, {
          recipientUserId: comment.user_id as string,
          actorUserId: userId,
          actorName: authorName,
          actorAvatarUrl: authorAvatarUrl,
          type: "comment_reply",
          postId,
          commentId,
          replyId: (replyData as { id: string }).id,
        });
      }
    } catch {
      // non-critical
    }

    revalidatePath("/inicio");
    return { success: true, reply: replyData as FeedReply };
  } catch (err) {
    console.error("[createCommentReply] unexpected:", err);
    return { error: "Error inesperado. Intenta de nuevo." };
  }
}

// ── getUserFollowedIds ────────────────────────────────────────────────────────

export async function getUserFollowedIds(): Promise<string[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("user_follows")
      .select("following_user_id")
      .eq("follower_user_id", userId);
    return (data ?? []).map((r) => r.following_user_id as string);
  } catch {
    return [];
  }
}

// ── getFeedCreators ───────────────────────────────────────────────────────────

export async function getFeedCreators(): Promise<FeedCreator[]> {
  try {
    const { userId } = await auth();
    const supabase = createAdminClient();

    // 1. Pull the most recent 200 posts to count activity per user
    const { data, error } = await supabase
      .from("feed_posts")
      .select("user_id, author_name, author_avatar_url")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return [];

    // Deduplicate: keep first-seen (most recent) author info, count posts
    const creatorMap = new Map<
      string,
      { name: string | null; avatar_url: string | null; count: number }
    >();
    for (const post of data ?? []) {
      const uid = post.user_id as string;
      if (creatorMap.has(uid)) {
        creatorMap.get(uid)!.count++;
      } else {
        creatorMap.set(uid, {
          name: post.author_name as string | null,
          avatar_url: post.author_avatar_url as string | null,
          count: 1,
        });
      }
    }

    // Sort by activity, exclude self, cap at 10
    const topEntries = [...creatorMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .filter(([uid]) => uid !== userId)
      .slice(0, 10);

    if (topEntries.length === 0) return [];

    const topClerkIds = topEntries.map(([uid]) => uid);

    // 2. Resolve Clerk IDs → internal UUIDs (needed for businesses.owner_id)
    const clerkToUuid = new Map<string, string>();
    try {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, clerk_id")
        .in("clerk_id", topClerkIds);
      (usersData ?? []).forEach((u) => {
        clerkToUuid.set(u.clerk_id as string, u.id as string);
      });
    } catch {
      // users table may have different schema — graceful skip
    }

    // 3. Fetch business names owned by those users (oldest first = primary)
    const bizByOwnerUuid = new Map<string, string[]>();
    const uuids = [...clerkToUuid.values()];
    if (uuids.length > 0) {
      try {
        const { data: bizData } = await supabase
          .from("businesses")
          .select("name, owner_id")
          .in("owner_id", uuids)
          .order("created_at", { ascending: true });
        (bizData ?? []).forEach((b) => {
          const arr = bizByOwnerUuid.get(b.owner_id as string) ?? [];
          arr.push(b.name as string);
          bizByOwnerUuid.set(b.owner_id as string, arr);
        });
      } catch {
        // safe to ignore
      }
    }

    // 4. Build FeedCreator objects
    return topEntries.map(([clerkId, info]) => {
      // Name: strip email domain if author_name looks like an email address
      let displayName = info.name;
      if (displayName?.includes("@")) {
        displayName = displayName.split("@")[0] ?? displayName;
      }

      // display_context priority:
      //   A) 1 business  → "Creador de [name]"
      //   B) >1 business → "Creador de [name] + X more"
      //   C) ≥3 posts, no business → "Miembro activo de Mundo Academy"
      //   D) fallback    → "Creador de Mundo Academy"
      const uuid = clerkToUuid.get(clerkId);
      const businesses = uuid ? (bizByOwnerUuid.get(uuid) ?? []) : [];

      let displayContext: string;
      if (businesses.length === 1) {
        displayContext = `Creador de ${businesses[0]}`;
      } else if (businesses.length > 1) {
        displayContext = `Creador de ${businesses[0]} + ${businesses.length - 1} more`;
      } else if (info.count >= 3) {
        displayContext = "Miembro activo de Mundo Academy";
      } else {
        displayContext = "Creador de Mundo Academy";
      }

      return {
        user_id: clerkId,
        name: displayName,
        avatar_url: info.avatar_url,
        post_count: info.count,
        display_context: displayContext,
      };
    });
  } catch {
    return [];
  }
}

// ── followUser ────────────────────────────────────────────────────────────────

export async function followUser(
  targetUserId: string
): Promise<{ error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };
    if (userId === targetUserId) return { error: "No puedes seguirte a ti mismo" };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_follows")
      .insert({ follower_user_id: userId, following_user_id: targetUserId });

    if (error) {
      if (error.code === "42P01")
        return { error: "Ejecuta la migración de user_follows primero." };
      if (error.code === "23505") return {}; // already following — idempotent
      return { error: "Error al seguir. Intenta de nuevo." };
    }

    // Notify the followed user (best-effort, non-critical)
    try {
      const user = await currentUser();
      const actorName = user?.firstName
        ? `${user.firstName}${user.lastName ? " " + user.lastName : ""}`.trim()
        : (user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ?? null);
      const actorAvatarUrl = user?.imageUrl ?? null;
      await createNotification(supabase, {
        recipientUserId: targetUserId,
        actorUserId: userId,
        actorName,
        actorAvatarUrl,
        type: "user_follow",
      });
    } catch {
      // non-critical
    }

    revalidatePath("/inicio");
    return {};
  } catch {
    return { error: "Error inesperado." };
  }
}

// ── unfollowUser ──────────────────────────────────────────────────────────────

export async function unfollowUser(
  targetUserId: string
): Promise<{ error?: string }> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "No autenticado" };

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("user_follows")
      .delete()
      .eq("follower_user_id", userId)
      .eq("following_user_id", targetUserId);

    if (error && error.code !== "42P01") {
      return { error: "Error al dejar de seguir. Intenta de nuevo." };
    }

    revalidatePath("/inicio");
    return {};
  } catch {
    return { error: "Error inesperado." };
  }
}

// ── getNotifications ─────────────────────────────────────────────────────────

export async function getNotifications(): Promise<FeedNotification[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, recipient_user_id, actor_user_id, actor_name, actor_avatar_url, type, post_id, comment_id, reply_id, read_at, created_at"
      )
      .eq("recipient_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []) as FeedNotification[];
  } catch {
    return [];
  }
}

// ── getUnreadNotificationsCount ───────────────────────────────────────────────

export async function getUnreadNotificationsCount(): Promise<number> {
  try {
    const { userId } = await auth();
    if (!userId) return 0;
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

// ── markNotificationsAsRead ───────────────────────────────────────────────────

export async function markNotificationsAsRead(): Promise<void> {
  try {
    const { userId } = await auth();
    if (!userId) return;
    const supabase = createAdminClient();
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_user_id", userId)
      .is("read_at", null);
  } catch {
    // graceful — non-critical
  }
}

// ── getUserFeedBusinesses ─────────────────────────────────────────────────────

export async function getUserFeedBusinesses(): Promise<FeedBusiness[]> {
  try {
    const { userId } = await auth();
    if (!userId) return [];

    const supabase = createAdminClient();

    // businesses.owner_id → users.id (UUID), resolve from Clerk ID
    const { data: userData } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    if (!userData) return [];

    const { data } = await supabase
      .from("businesses")
      .select("id, name, logo_url")
      .eq("owner_id", userData.id)
      .order("created_at", { ascending: false });

    return (data ?? []).map((b) => ({
      id: b.id as string,
      name: b.name as string,
      logo_url: (b.logo_url as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
