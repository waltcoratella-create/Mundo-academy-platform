import "server-only";
import { metaGraphList, metaGraphListPaged, MetaGraphError } from "./graph";
import { getMetaAccessToken } from "./connections";
import type { MetaAssets, MetaAdAccountOption } from "./connection-types";
import type { DiscoveryForValidation, DiscoveredList } from "./asset-validation";

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


type AdAccountRow = {
  id: string; account_id: string; name: string;
  currency?: string; timezone_name?: string; account_status?: number;
};

const AD_ACCOUNT_FIELDS = "id,account_id,name,currency,timezone_name,account_status";

function toAdAccountOption(r: AdAccountRow): MetaAdAccountOption {
  return {
    id: r.id,
    accountId: r.account_id,
    name: r.name || r.id,
    currency: r.currency ?? null,
    timezone: r.timezone_name ?? null,
    status: r.account_status ?? null,
    // 1 = ACTIVE. Anything else cannot run ads, so flag it rather than
    // letting the user pick an account that will reject the campaign.
    usable: r.account_status === 1,
  };
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
    const rows = await metaGraphList<AdAccountRow>({
      path: "/me/adaccounts",
      accessToken: token,
      params: { fields: AD_ACCOUNT_FIELDS },
    });

    assets.adAccounts = rows.map(toAdAccountOption);
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

// ── Server-side validation ───────────────────────────────────────────────────

/** Deeper than the picker: validation must not miss an asset on page 4. */
const VALIDATION_MAX_PAGES = 10;

async function listForValidation<T, O>(
  run: () => Promise<{ items: T[]; truncated: boolean }>,
  map: (row: T) => O
): Promise<DiscoveredList<O>> {
  try {
    const { items, truncated } = await run();
    return { items: items.map(map), available: true, truncated };
  } catch (e) {
    if (isAuthError(e)) throw e;
    return { items: [], available: false, truncated: false };
  }
}

export type ValidationDiscoveryResult =
  | { ok: true; discovered: DiscoveryForValidation }
  | { ok: false; error: string; needsReconnect?: boolean };

/**
 * Re-discover, server-side, exactly what a selection must be checked against.
 *
 * Uses the business's own token and nothing the client sent. An edge that
 * fails is reported as unavailable — the resolver then says "could not verify"
 * instead of treating an outage as proof that an asset is not yours.
 */
export async function discoverForValidation(
  businessId: string,
  adAccountId: string | null
): Promise<ValidationDiscoveryResult> {
  const token = await getMetaAccessToken(businessId);
  if (!token) {
    return { ok: false, error: "La conexión con Meta no está activa o caducó.", needsReconnect: true };
  }

  try {
    const adAccounts = await listForValidation(
      () => metaGraphListPaged<AdAccountRow>({
        path: "/me/adaccounts", accessToken: token,
        params: { fields: AD_ACCOUNT_FIELDS }, maxPages: VALIDATION_MAX_PAGES,
      }),
      toAdAccountOption
    );

    const pages = await listForValidation(
      () => metaGraphListPaged<{ id: string; name: string }>({
        path: "/me/accounts", accessToken: token,
        params: { fields: "id,name" }, maxPages: VALIDATION_MAX_PAGES,
      }),
      (p) => ({ id: p.id, name: p.name || p.id })
    );

    // Only asked for an account the discovery itself returned: never call
    // /{id}/adspixels on an id that came from the browser unverified.
    const accountKnown = Boolean(adAccountId) &&
      adAccounts.items.some((a) => a.id === adAccountId);
    const pixels: DiscoveredList<{ id: string; name: string }> = accountKnown
      ? await listForValidation(
          () => metaGraphListPaged<{ id: string; name: string }>({
            path: `/${adAccountId}/adspixels`, accessToken: token,
            params: { fields: "id,name" }, maxPages: VALIDATION_MAX_PAGES,
          }),
          (p) => ({ id: p.id, name: p.name || p.id })
        )
      : { items: [], available: accountKnown, truncated: false };

    return { ok: true, discovered: { adAccounts, pages, pixels } };
  } catch (e) {
    if (isAuthError(e)) {
      return { ok: false, error: "La sesión con Meta caducó.", needsReconnect: true };
    }
    return { ok: false, error: "No se pudieron verificar los activos con Meta." };
  }
}
