"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { type SharePreferences, DEFAULT_SHARE_PREFS, normalizeSharePrefs } from "./share-config";

/** Resolve the authed Clerk user to its users.id only if it owns `businessId`. */
async function resolveOwner(businessId: string): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const supabase = createAdminClient();
  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  if (!user?.id) return null;
  const { data: biz } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  if (!biz) return null;
  return user.id as string;
}

export async function getSharePreferences({ businessId }: { businessId: string }): Promise<SharePreferences> {
  try {
    const ownerId = await resolveOwner(businessId);
    if (!ownerId) return DEFAULT_SHARE_PREFS;
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("analytics_share_preferences")
      .select("theme, pattern, show_logo")
      .eq("user_id", ownerId)
      .eq("business_id", businessId)
      .maybeSingle();
    if (!data) return DEFAULT_SHARE_PREFS;
    return normalizeSharePrefs({ theme: data.theme, pattern: data.pattern, showLogo: data.show_logo });
  } catch {
    return DEFAULT_SHARE_PREFS;
  }
}

export async function saveSharePreferences({
  businessId, theme, pattern, showLogo,
}: {
  businessId: string;
  theme: string;
  pattern: string;
  showLogo: boolean;
}): Promise<{ ok: boolean }> {
  const ownerId = await resolveOwner(businessId);
  if (!ownerId) return { ok: false };
  const prefs = normalizeSharePrefs({ theme, pattern, showLogo });
  const supabase = createAdminClient();
  const { error } = await supabase.from("analytics_share_preferences").upsert(
    {
      user_id: ownerId,
      business_id: businessId,
      theme: prefs.theme,
      pattern: prefs.pattern,
      show_logo: prefs.showLogo,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,business_id" },
  );
  return { ok: !error };
}
