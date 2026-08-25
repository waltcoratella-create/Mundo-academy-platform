import "server-only";
import { metaGraphList, MetaGraphError } from "./graph";
import { getMetaAccessToken } from "./connections";
import type { MetaAssets } from "./connection-types";

export type {
  MetaAssets, MetaAdAccountOption, MetaPageOption, MetaPixelOption, MetaBusinessOption,
} from "./connection-types";

/**
 * Asset discovery.
 *
 * Reads the businesses, ad accounts, pages and pixels the connected person can
 * reach, and returns ONLY ids, names and the few safe fields the picker needs.
 * The access token is fetched here and never leaves this module.
 *
 * These come from different edges on purpose — Meta has no single "everything
 * I can use" endpoint.
 */

export type DiscoveryResult =
  | { ok: true; assets: MetaAssets }
  | { ok: false; error: string; needsReconnect?: boolean };

/** Meta signals an invalid/expired token with code 190. */
function isAuthError(e: unknown): boolean {
  return e instanceof MetaGraphError && e.code === 190;
}

function friendly(e: unknown, what: string): string {
  if (e instanceof MetaGraphError) return e.message;
  return `No se pudieron cargar ${what}.`;
}

/**
 * Everything the connection screen needs, in one call.
 *
 * A failure on one edge does not sink the rest: a business without a Business
 * Portfolio, or without pixel permissions, should still be able to pick a page
 * and an ad account.
 */
export async function discoverMetaAssets(
  businessId: string,
  adAccountId?: string | null
): Promise<DiscoveryResult> {
  const token = await getMetaAccessToken(businessId);
  if (!token) {
    return {
      ok: false,
      error: "La conexión con Meta no está activa o caducó.",
      needsReconnect: true,
    };
  }

  const assets: MetaAssets = { businesses: [], adAccounts: [], pages: [], pixels: [] };

  // ── Ad accounts ── the one edge we cannot do without.
  try {
    const rows = await metaGraphList<{
      id: string; account_id: string; name: string;
      currency?: string; timezone_name?: string; account_status?: number;
    }>({
      path: "/me/adaccounts",
      accessToken: token,
      params: { fields: "id,account_id,name,currency,timezone_name,account_status" },
    });

    assets.adAccounts = rows.map((r) => ({
      id: r.id,
      accountId: r.account_id,
      name: r.name || r.id,
      currency: r.currency ?? null,
      timezone: r.timezone_name ?? null,
      status: r.account_status ?? null,
      // 1 = ACTIVE. Anything else cannot run ads, so flag it rather than
      // letting the user pick an account that will reject the campaign.
      usable: r.account_status === 1,
    }));
  } catch (e) {
    if (isAuthError(e)) {
      return { ok: false, error: "La sesión con Meta caducó.", needsReconnect: true };
    }
    return { ok: false, error: friendly(e, "las cuentas publicitarias") };
  }

  // ── Pages ── needed as the advertiser identity on every Ad Creative.
  try {
    assets.pages = (
      await metaGraphList<{ id: string; name: string }>({
        path: "/me/accounts", accessToken: token, params: { fields: "id,name" },
      })
    ).map((p) => ({ id: p.id, name: p.name || p.id }));
  } catch (e) {
    console.warn("[meta:discovery] pages unavailable:", e instanceof Error ? e.message : "unknown");
  }

  // ── Business portfolios ── informational; not every account has one.
  try {
    assets.businesses = (
      await metaGraphList<{ id: string; name: string }>({
        path: "/me/businesses", accessToken: token, params: { fields: "id,name" },
      })
    ).map((b) => ({ id: b.id, name: b.name || b.id }));
  } catch (e) {
    console.warn("[meta:discovery] businesses unavailable:", e instanceof Error ? e.message : "unknown");
  }

  // ── Pixels ── scoped to the chosen ad account, so only once one is picked.
  if (adAccountId) {
    try {
      assets.pixels = (
        await metaGraphList<{ id: string; name: string }>({
          path: `/${adAccountId}/adspixels`, accessToken: token, params: { fields: "id,name" },
        })
      ).map((p) => ({ id: p.id, name: p.name || p.id }));
    } catch (e) {
      console.warn("[meta:discovery] pixels unavailable:", e instanceof Error ? e.message : "unknown");
    }
  }

  return { ok: true, assets };
}
