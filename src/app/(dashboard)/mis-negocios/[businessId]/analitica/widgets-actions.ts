"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type WidgetConfig, DEFAULT_CONFIG, normalizeConfig, sanitizeConfig,
} from "./widgets-config";

/**
 * Resolve the authenticated Clerk user to its internal users.id, but only if it
 * owns `businessId`. Returns null otherwise — the security gate for every write.
 */
async function resolveOwner(businessId: string): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const supabase = createAdminClient();

  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  if (!user?.id) return null;

  const { data: biz } = await supabase
    .from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  if (!biz) return null;

  return user.id as string;
}

export async function getAnalyticsWidgets({ businessId }: { businessId: string }): Promise<WidgetConfig[]> {
  try {
    const ownerId = await resolveOwner(businessId);
    if (!ownerId) return DEFAULT_CONFIG;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("analytics_widgets")
      .select("widget_key, position, visible")
      .eq("user_id", ownerId)
      .eq("business_id", businessId)
      .order("position", { ascending: true });

    if (error || !data || data.length === 0) return DEFAULT_CONFIG;
    return normalizeConfig(data as { widget_key: string; position: number; visible: boolean }[]);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveAnalyticsWidgets({
  businessId,
  widgets,
}: {
  businessId: string;
  widgets: WidgetConfig[];
}): Promise<{ ok: boolean }> {
  const ownerId = await resolveOwner(businessId);
  if (!ownerId) return { ok: false };

  const clean = sanitizeConfig(widgets);
  if (clean.length === 0) return { ok: false };

  const supabase = createAdminClient();
  await supabase.from("analytics_widgets").delete().eq("user_id", ownerId).eq("business_id", businessId);

  const now = new Date().toISOString();
  const rows = clean.map((w, i) => ({
    user_id: ownerId, business_id: businessId, widget_key: w.key,
    position: i, visible: w.visible, updated_at: now,
  }));
  const { error } = await supabase.from("analytics_widgets").insert(rows);
  return { ok: !error };
}

export async function resetAnalyticsWidgets({ businessId }: { businessId: string }): Promise<{ ok: boolean }> {
  const ownerId = await resolveOwner(businessId);
  if (!ownerId) return { ok: false };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("analytics_widgets").delete().eq("user_id", ownerId).eq("business_id", businessId);
  return { ok: !error };
}
