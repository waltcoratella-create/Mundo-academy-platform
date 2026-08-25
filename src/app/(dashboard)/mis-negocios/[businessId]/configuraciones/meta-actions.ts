"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getBusinessById } from "@/lib/supabase/queries";
import {
  getMetaConnectionForBusiness, selectMetaAssets, disconnectMetaConnection,
} from "@/lib/meta/connections";
import { discoverMetaAssets } from "@/lib/meta/discovery";
import type { MetaConnection, MetaAssets } from "@/lib/meta/connection-types";

/**
 * Server actions for the Meta connection panel.
 *
 * Every one re-verifies ownership: the businessId comes from the client and is
 * never trusted. None of these ever returns a token — the return types cannot
 * even express one.
 */

async function assertOwner(businessId: string): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  const business = await getBusinessById(businessId, userId);
  return Boolean(business);
}

export type AssetsResult =
  | { ok: true; assets: MetaAssets }
  | { ok: false; error: string; needsReconnect?: boolean };

/** Load the Meta assets the connected person can choose from. */
export async function loadMetaAssets(
  businessId: string,
  adAccountId?: string | null
): Promise<AssetsResult> {
  if (!(await assertOwner(businessId))) {
    return { ok: false, error: "No tienes permiso sobre este negocio." };
  }
  return discoverMetaAssets(businessId, adAccountId);
}

export type ConnectionActionResult =
  | { ok: true; connection: MetaConnection }
  | { ok: false; error: string };

/**
 * Persist the chosen assets.
 *
 * The ad account's currency and timezone are stored alongside the ids: they
 * belong to the account, and the campaign builder must defer to them or a "200"
 * budget gets read in the wrong currency.
 */
export async function saveMetaSelection(input: {
  businessId: string;
  adAccountId: string;
  adAccountName: string;
  adAccountCurrency: string | null;
  adAccountTimezone: string | null;
  pageId: string;
  pageName: string;
  pixelId?: string | null;
  pixelName?: string | null;
  metaBusinessId?: string | null;
  metaBusinessName?: string | null;
}): Promise<ConnectionActionResult> {
  if (!(await assertOwner(input.businessId))) {
    return { ok: false, error: "No tienes permiso sobre este negocio." };
  }
  if (!input.adAccountId) return { ok: false, error: "Selecciona una cuenta publicitaria." };
  if (!input.pageId) return { ok: false, error: "Selecciona una página de Facebook." };

  const result = await selectMetaAssets(input);
  if (result.ok) revalidatePath(`/mis-negocios/${input.businessId}/configuraciones`);
  return result;
}

/**
 * Disconnect.
 *
 * Wipes our copy of the credential and marks the row. It does NOT revoke the
 * grant on Meta's side — see the note in the UI.
 */
export async function disconnectMeta(businessId: string): Promise<ConnectionActionResult> {
  if (!(await assertOwner(businessId))) {
    return { ok: false, error: "No tienes permiso sobre este negocio." };
  }
  const result = await disconnectMetaConnection(businessId);
  if (result.ok) revalidatePath(`/mis-negocios/${businessId}/configuraciones`);
  return result;
}

/** Current connection for the settings panel. Safe fields only. */
export async function fetchMetaConnection(businessId: string): Promise<MetaConnection | null> {
  if (!(await assertOwner(businessId))) return null;
  return getMetaConnectionForBusiness(businessId);
}
