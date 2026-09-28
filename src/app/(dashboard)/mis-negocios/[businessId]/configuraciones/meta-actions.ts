"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { getBusinessById } from "@/lib/supabase/queries";
import {
  getMetaConnectionForBusiness, selectMetaAssets, disconnectMetaConnection,
} from "@/lib/meta/connections";
import { discoverMetaAssets, discoverForValidation } from "@/lib/meta/discovery";
import { resolveSelection } from "@/lib/meta/asset-validation";
import type {
  MetaConnection, MetaAssets, SaveMetaSelectionRequest,
} from "@/lib/meta/connection-types";

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
 * The browser names ids and nothing else. Each one is re-checked against a
 * discovery made here, with this business's own token: an ad account, page or
 * pixel that discovery did not return is refused, and nothing is written. The
 * names, currency and timezone stored next to the ids are copied from Meta —
 * the builder locks currency and zone to them, so they must not be forgeable.
 */
export async function saveMetaSelection(
  input: SaveMetaSelectionRequest
): Promise<ConnectionActionResult> {
  if (!(await assertOwner(input.businessId))) {
    return { ok: false, error: "No tienes permiso sobre este negocio." };
  }

  const discovery = await discoverForValidation(input.businessId, input.adAccountId || null);
  if (!discovery.ok) return { ok: false, error: discovery.error };

  const resolved = resolveSelection(
    { adAccountId: input.adAccountId, pageId: input.pageId, pixelId: input.pixelId },
    discovery.discovered
  );
  if (!resolved.ok) return { ok: false, error: resolved.reasons.join(" ") };

  const result = await selectMetaAssets({ businessId: input.businessId, ...resolved.selection });
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
