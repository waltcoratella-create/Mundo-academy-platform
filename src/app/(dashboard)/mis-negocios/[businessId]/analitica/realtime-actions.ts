"use server";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  computeTransactionSlice, computeMemberSlice,
  type SliceParams, type TransactionSlice, type MemberSlice,
} from "./data";

/** Only the authed owner of `businessId` may fetch its metrics. */
async function ownsBusiness(businessId: string): Promise<boolean> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return false;
  const supabase = createAdminClient();
  const { data: user } = await supabase.from("users").select("id").eq("clerk_id", clerkId).maybeSingle();
  if (!user?.id) return false;
  const { data: biz } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  return !!biz;
}

/** Re-fetch the transaction-derived slice (today, revenue, net, breakdown, charts, balance). */
export async function getTransactionMetrics(params: SliceParams): Promise<TransactionSlice | null> {
  try {
    if (!(await ownsBusiness(params.businessId))) return null;
    return await computeTransactionSlice(params);
  } catch {
    return null;
  }
}

/** Re-fetch the member-derived slice (new users, MRR, ARR). */
export async function getMemberMetrics(params: SliceParams): Promise<MemberSlice | null> {
  try {
    if (!(await ownsBusiness(params.businessId))) return null;
    return await computeMemberSlice(params);
  } catch {
    return null;
  }
}
