"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FeedPost,
  FeedComment,
  FeedReply,
} from "@/app/(dashboard)/inicio/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  /** Always "Miembro de Mundo Academy" until bio editing exists */
  bio: string;
  posts_count: number;
  followers_count: number;
  following_count: number;
  /** Is the current viewer already following this user? */
  is_following: boolean;
  /** Is the current viewer looking at their own profile? */
  is_own_profile: boolean;
  posts: FeedPost[];
}

// Raw shape before enrichment (matches feed_posts columns)
type RawPost = Omit<
  FeedPost,
  "liked_by_current_user" | "recent_comments" | "business_name" | "business_logo_url"
>;

// ── getUserProfile ────────────────────────────────────────────────────────────

export async function getUserProfile(
  targetUserId: string
): Promise<UserProfile> {
  const { userId: currentUserId } = await auth();
  const supabase = createAdminClient();

  // ── 1. Posts by this user ────────────────────────────────────────────────
  const { data: postsData } = await supabase
    .from("feed_posts")
    .select(
      "id, user_id, business_id, author_name, author_avatar_url, content, image_url, likes_count, comments_count, views_count, created_at, updated_at"
    )
    .eq("user_id", targetUserId)
    .order("created_at", { ascending: false });

  const rawPosts = (postsData ?? []) as RawPost[];

  // Derive display identity from most recent post
  let displayName: string | null = rawPosts[0]?.author_name ?? null;
  let avatarUrl: string | null = rawPosts[0]?.author_avatar_url ?? null;
  // Strip email domains
  if (displayName?.includes("@")) {
    displayName = displayName.split("@")[0] ?? displayName;
  }

  const postIds = rawPosts.map((p) => p.id);

  // ── 2. Which posts the viewer has liked ─────────────────────────────────
  const likedPostIds = new Set<string>();
  if (currentUserId && postIds.length > 0) {
    try {
      const { data: likesData } = await supabase
        .from("feed_post_likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
      (likesData ?? []).forEach((l) => likedPostIds.add(l.post_id as string));
    } catch { /* table not yet created */ }
  }

  // ── 3. Recent comments (up to 3 per post) ───────────────────────────────
  type RawComment = Omit<FeedComment, "recent_replies">;
  const rawCommentsByPost = new Map<string, RawComment[]>();
  const loadedCommentIds: string[] = [];

  if (postIds.length > 0) {
    try {
      const { data: commentsData } = await supabase
        .from("feed_post_comments")
        .select(
          "id, post_id, user_id, author_name, author_avatar_url, content, created_at"
        )
        .in("post_id", postIds)
        .order("created_at", { ascending: false })
        .limit(postIds.length * 3);

      (commentsData ?? []).forEach((c) => {
        const arr = rawCommentsByPost.get(c.post_id as string) ?? [];
        if (arr.length < 3) {
          arr.push(c as RawComment);
          loadedCommentIds.push(c.id as string);
        }
        rawCommentsByPost.set(c.post_id as string, arr);
      });
    } catch { /* table not yet created */ }
  }

  // ── 4. Replies for loaded comments ──────────────────────────────────────
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
    } catch { /* table not yet created */ }
  }

  // Merge comments + replies into enriched FeedComment[]
  const commentsByPost = new Map<string, FeedComment[]>();
  rawCommentsByPost.forEach((rawComments, pid) => {
    const enriched: FeedComment[] = [...rawComments]
      .reverse() // DESC → ASC oldest first
      .map((c) => ({
        ...c,
        recent_replies: [...(repliesByComment.get(c.id) ?? [])].reverse(),
      }));
    commentsByPost.set(pid, enriched);
  });

  // ── 5. Business names ────────────────────────────────────────────────────
  const bizMap = new Map<string, { name: string; logo_url: string | null }>();
  const uniqueBizIds = [
    ...new Set(
      rawPosts.map((p) => p.business_id).filter(Boolean) as string[]
    ),
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
    } catch { /* safe */ }
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

  // ── 6. Follower / following counts + is_following ───────────────────────
  let followersCount = 0;
  let followingCount = 0;
  let isFollowing = false;

  try {
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_user_id", targetUserId),
      supabase
        .from("user_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_user_id", targetUserId),
    ]);
    followersCount = followersRes.count ?? 0;
    followingCount = followingRes.count ?? 0;

    if (currentUserId && currentUserId !== targetUserId) {
      const { data: followRow } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_user_id", currentUserId)
        .eq("following_user_id", targetUserId)
        .maybeSingle();
      isFollowing = !!followRow;
    }
  } catch { /* user_follows table not yet created */ }

  return {
    user_id: targetUserId,
    display_name: displayName ?? "Usuario",
    avatar_url: avatarUrl,
    bio: "Miembro de Mundo Academy",
    posts_count: rawPosts.length,
    followers_count: followersCount,
    following_count: followingCount,
    is_following: isFollowing,
    is_own_profile: currentUserId === targetUserId,
    posts,
  };
}
