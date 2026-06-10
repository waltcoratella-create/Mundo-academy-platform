"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AboutTeamMember {
  clerk_id: string;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: "owner" | "member";
  joined_at: string | null;
}

export interface AboutInfo {
  description: string | null;
  website: string | null;
  created_at: string | null;
}

export interface BusinessAboutData {
  team: AboutTeamMember[];
  info: AboutInfo;
}

const EMPTY: BusinessAboutData = {
  team: [],
  info: { description: null, website: null, created_at: null },
};

// ─── getBusinessAbout ─────────────────────────────────────────────────────────

export async function getBusinessAbout(
  businessId: string
): Promise<BusinessAboutData> {
  const { userId } = await auth();
  if (!userId) return EMPTY;

  try {
    const supabase = createAdminClient();

    // ── 1. Business info + owner_id ─────────────────────────────────────────
    const { data: biz } = await supabase
      .from("businesses")
      .select("description, website, created_at, owner_id")
      .eq("id", businessId)
      .maybeSingle();

    if (!biz) return EMPTY;

    const row = biz as Record<string, unknown>;

    const info: AboutInfo = {
      description: (row.description as string | null) ?? null,
      website:     (row.website     as string | null) ?? null,
      created_at:  (row.created_at  as string | null) ?? null,
    };

    const ownerId = row.owner_id as string | null;

    // ── 2. Owner → clerk_id + name ──────────────────────────────────────────
    let ownerClerkId: string | null = null;
    let ownerDbName:  string | null = null;

    if (ownerId) {
      const { data: ownerUser } = await supabase
        .from("users")
        .select("clerk_id, name")
        .eq("id", ownerId)
        .maybeSingle();
      ownerClerkId = (ownerUser as Record<string, unknown> | null)?.clerk_id as string | null;
      ownerDbName  = (ownerUser as Record<string, unknown> | null)?.name  as string | null;
    }

    // ── 3. Active product_members → distinct clerk_ids (max 20) ────────────
    const { data: memberRows } = await supabase
      .from("product_members")
      .select("user_id, created_at, users(clerk_id, name)")
      .eq("business_id", businessId)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(40); // fetch extra, dedupe below

    // Deduplicate by clerk_id, skip owner & nulls
    const seenClerkIds = new Set<string>(ownerClerkId ? [ownerClerkId] : []);
    const memberInfo: { clerkId: string; name: string | null; joined_at: string }[] = [];

    for (const mr of memberRows ?? []) {
      const u = (mr as Record<string, unknown>).users as Record<string, unknown> | null;
      const clerkId = (u?.clerk_id as string | null) ?? null;
      if (!clerkId || seenClerkIds.has(clerkId)) continue;
      seenClerkIds.add(clerkId);
      memberInfo.push({
        clerkId,
        name:      (u?.name as string | null) ?? null,
        joined_at: (mr as Record<string, unknown>).created_at as string,
      });
      if (memberInfo.length >= 20) break;
    }

    // ── 4. Batch-fetch user_profiles ────────────────────────────────────────
    const allClerkIds = [ownerClerkId, ...memberInfo.map((m) => m.clerkId)].filter(
      (id): id is string => !!id
    );

    type ProfileRow = { user_id: string; display_name: string | null; username: string | null; avatar_url: string | null };
    const profileMap = new Map<string, ProfileRow>();

    if (allClerkIds.length > 0) {
      const { data: profiles } = await supabase
        .from("user_profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", allClerkIds);

      (profiles ?? []).forEach((p) => {
        profileMap.set(p.user_id as string, p as unknown as ProfileRow);
      });
    }

    // ── 5. Build team array ─────────────────────────────────────────────────

    function resolveName(
      profile: ProfileRow | undefined,
      fallback: string | null
    ): string | null {
      if (profile?.display_name?.trim()) return profile.display_name.trim();
      if (profile?.username?.trim())     return `@${profile.username.trim()}`;
      return fallback ?? null;
    }

    const team: AboutTeamMember[] = [];

    // Owner always first
    if (ownerClerkId) {
      const p = profileMap.get(ownerClerkId);
      team.push({
        clerk_id:   ownerClerkId,
        name:       resolveName(p, ownerDbName),
        username:   p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        role:       "owner",
        joined_at:  info.created_at,
      });
    }

    // Members
    for (const m of memberInfo) {
      const p = profileMap.get(m.clerkId);
      team.push({
        clerk_id:   m.clerkId,
        name:       resolveName(p, m.name),
        username:   p?.username ?? null,
        avatar_url: p?.avatar_url ?? null,
        role:       "member",
        joined_at:  m.joined_at,
      });
    }

    return { team, info };
  } catch {
    return EMPTY;
  }
}
