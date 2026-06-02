"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  FeedPost,
  FeedComment,
  FeedReply,
} from "@/app/(dashboard)/inicio/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_at: string;
  /** Display name of the business owner */
  owner_name: string | null;
  /** Clerk ID — used for linking to /u/[id] */
  owner_clerk_id: string | null;
  members_count: number;
  posts_count: number;
  products_count: number;
}

export interface BusinessProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: string;
  billing_period: string;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

type ProfileRow = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

async function batchProfiles(
  userIds: string[],
  supabase: ReturnType<typeof createAdminClient>
): Promise<Map<string, ProfileRow>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const { data } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", ids);
    const map = new Map<string, ProfileRow>();
    (data ?? []).forEach((p) =>
      map.set(p.user_id as string, {
        display_name: (p.display_name ?? null) as string | null,
        username: (p.username ?? null) as string | null,
        avatar_url: (p.avatar_url ?? null) as string | null,
      })
    );
    return map;
  } catch {
    return new Map();
  }
}

function bestName(p: ProfileRow | undefined, stored: string | null): string | null {
  if (p?.display_name?.trim()) return p.display_name.trim();
  if (p?.username?.trim()) return `@${p.username.trim()}`;
  if (stored?.trim()) {
    const n = stored.trim();
    return n.includes("@") ? (n.split("@")[0] ?? n) : n;
  }
  return null;
}

function bestAvatar(p: ProfileRow | undefined, stored: string | null): string | null {
  return p?.avatar_url ?? stored ?? null;
}

// ── getBusinessProfile ────────────────────────────────────────────────────────

export async function getBusinessProfile(
  businessId: string
): Promise<BusinessProfile | null> {
  try {
    const supabase = createAdminClient();

    // 1. Business row — try full columns, fall back on 42703 (missing columns)
    let biz: {
      id: string;
      name: string;
      description: string | null;
      logo_url: string | null;
      cover_url: string | null;
      owner_id: string;
      created_at: string;
    } | null = null;

    const { data: fullData, error: fullError } = await supabase
      .from("businesses")
      .select("id, name, description, logo_url, cover_url, owner_id, created_at")
      .eq("id", businessId)
      .maybeSingle();

    if (fullError?.code === "42703") {
      // Extended columns not yet migrated — fetch minimal set
      const { data: minData } = await supabase
        .from("businesses")
        .select("id, name, owner_id, created_at")
        .eq("id", businessId)
        .maybeSingle();
      if (minData) {
        const r = minData as Record<string, unknown>;
        biz = {
          id: r.id as string,
          name: r.name as string,
          description: null,
          logo_url: null,
          cover_url: null,
          owner_id: r.owner_id as string,
          created_at: r.created_at as string,
        };
      }
    } else if (!fullError && fullData) {
      const r = fullData as Record<string, unknown>;
      biz = {
        id: r.id as string,
        name: r.name as string,
        description: (r.description ?? null) as string | null,
        logo_url: (r.logo_url ?? null) as string | null,
        cover_url: (r.cover_url ?? null) as string | null,
        owner_id: r.owner_id as string,
        created_at: r.created_at as string,
      };
    }

    if (!biz) return null;

    // 2. Owner — resolve from users table, enrich with user_profiles if possible
    let ownerName: string | null = null;
    let ownerClerkId: string | null = null;
    try {
      const { data: ownerData } = await supabase
        .from("users")
        .select("clerk_id, name")
        .eq("id", biz.owner_id)
        .maybeSingle();

      if (ownerData) {
        const u = ownerData as Record<string, unknown>;
        ownerClerkId = (u.clerk_id as string | null) ?? null;
        ownerName    = (u.name    as string | null) ?? null;

        // Prefer user_profiles display_name if the owner has one
        if (ownerClerkId) {
          const profiles = await batchProfiles([ownerClerkId], supabase);
          const profile  = profiles.get(ownerClerkId);
          if (profile?.display_name?.trim()) ownerName = profile.display_name.trim();
          else if (profile?.username?.trim()) ownerName = profile.username.trim();
        }
        // Strip email domain from ownerName as last resort
        if (ownerName?.includes("@")) ownerName = ownerName.split("@")[0] ?? ownerName;
      }
    } catch {
      // graceful — owner info is non-critical
    }

    // 3. Counts — all fire in parallel, all gracefully degrade on missing tables
    const [membersCount, postsCount, productsCount] = await Promise.all([
      (async () => {
        const { count, error } = await supabase
          .from("product_members")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "active");
        if (error) return 0;
        return count ?? 0;
      })(),
      (async () => {
        const { count, error } = await supabase
          .from("feed_posts")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId);
        if (error) return 0;
        return count ?? 0;
      })(),
      (async () => {
        const { count, error } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("business_id", businessId)
          .eq("status", "published");
        if (error) return 0;
        return count ?? 0;
      })(),
    ]);

    return {
      id: biz.id,
      name: biz.name,
      description: biz.description,
      logo_url: biz.logo_url,
      cover_url: biz.cover_url,
      created_at: biz.created_at,
      owner_name: ownerName,
      owner_clerk_id: ownerClerkId,
      members_count: membersCount,
      posts_count: postsCount,
      products_count: productsCount,
    };
  } catch {
    return null;
  }
}

// ── getBusinessFeedPosts ──────────────────────────────────────────────────────

export async function getBusinessFeedPosts(businessId: string): Promise<FeedPost[]> {
  try {
    const { userId } = await auth();
    const supabase = createAdminClient();

    type RawPost = Omit<
      FeedPost,
      "liked_by_current_user" | "recent_comments" | "business_name" | "business_logo_url"
    >;

    // 1. Posts filtered by business
    const { data: postsData, error } = await supabase
      .from("feed_posts")
      .select(
        "id, user_id, business_id, author_name, author_avatar_url, content, image_url, likes_count, comments_count, views_count, created_at, updated_at"
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];
    const rawPosts = (postsData ?? []) as RawPost[];
    if (rawPosts.length === 0) return [];

    const postIds = rawPosts.map((p) => p.id);

    // 2. Liked by current viewer
    const likedPostIds = new Set<string>();
    if (userId) {
      try {
        const { data: likesData } = await supabase
          .from("feed_post_likes")
          .select("post_id")
          .eq("user_id", userId)
          .in("post_id", postIds);
        (likesData ?? []).forEach((l) => likedPostIds.add(l.post_id as string));
      } catch { /* table not yet created */ }
    }

    // 3. Recent comments (up to 3 per post)
    type RawComment = Omit<FeedComment, "recent_replies">;
    const rawCommentsByPost = new Map<string, RawComment[]>();
    const loadedCommentIds: string[] = [];

    try {
      const { data: commentsData } = await supabase
        .from("feed_post_comments")
        .select("id, post_id, user_id, author_name, author_avatar_url, content, created_at")
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
    } catch { /* table not yet created */ }

    // 4. Replies (up to 2 per loaded comment)
    const repliesByComment = new Map<string, FeedReply[]>();
    if (loadedCommentIds.length > 0) {
      try {
        const { data: repliesData } = await supabase
          .from("feed_comment_replies")
          .select("id, comment_id, post_id, user_id, author_name, author_avatar_url, content, created_at")
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

    // 5. Enrich identities from user_profiles
    const allUserIds = [
      ...new Set([
        ...rawPosts.map((p) => p.user_id),
        ...[...rawCommentsByPost.values()].flat().map((c) => c.user_id),
        ...[...repliesByComment.values()].flat().map((r) => r.user_id),
      ]),
    ];
    const profileMap = await batchProfiles(allUserIds, supabase);

    // 6. Merge comments + replies
    const commentsByPost = new Map<string, FeedComment[]>();
    rawCommentsByPost.forEach((rawComments, pid) => {
      const enriched: FeedComment[] = [...rawComments]
        .reverse()
        .map((c) => ({
          ...c,
          author_name: bestName(profileMap.get(c.user_id), c.author_name),
          author_avatar_url: bestAvatar(profileMap.get(c.user_id), c.author_avatar_url),
          recent_replies: [...(repliesByComment.get(c.id) ?? [])].reverse().map((r) => ({
            ...r,
            author_name: bestName(profileMap.get(r.user_id), r.author_name),
            author_avatar_url: bestAvatar(profileMap.get(r.user_id), r.author_avatar_url),
          })),
        }));
      commentsByPost.set(pid, enriched);
    });

    // 7. Assemble FeedPost[]
    return rawPosts.map((p) => ({
      ...p,
      author_name: bestName(profileMap.get(p.user_id), p.author_name),
      author_avatar_url: bestAvatar(profileMap.get(p.user_id), p.author_avatar_url),
      business_name: null,       // not needed inside the business profile page
      business_logo_url: null,
      liked_by_current_user: likedPostIds.has(p.id),
      recent_comments: commentsByPost.get(p.id) ?? [],
    }));
  } catch {
    return [];
  }
}

// ── getBusinessPublicProducts ─────────────────────────────────────────────────

export async function getBusinessPublicProducts(
  businessId: string
): Promise<BusinessProduct[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, price, currency, type, billing_period")
      .eq("business_id", businessId)
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) return [];
    return (data ?? []).map((p) => {
      const r = p as Record<string, unknown>;
      return {
        id:             r.id as string,
        name:           r.name as string,
        description:    (r.description ?? null) as string | null,
        price:          Number(r.price ?? 0),
        currency:       (r.currency as string) ?? "USD",
        type:           (r.type as string) ?? "curso",
        billing_period: (r.billing_period as string) ?? "one_time",
      };
    });
  } catch {
    return [];
  }
}
