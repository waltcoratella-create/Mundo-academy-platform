import type {
  MetaAdAccountOption, MetaPageOption, MetaPixelOption,
} from "./connection-types";

/**
 * Asset selection, resolved against what Meta says — never against the client.
 *
 * The browser may only name ids. Everything we persist next to them (names,
 * currency, timezone) is copied from a discovery made server-side with the
 * business's own token, and an id that discovery did not return is refused.
 *
 * Pure: no network, no database. The caller does the discovery.
 */

export interface RequestedSelection {
  adAccountId: string;
  pageId: string;
  pixelId?: string | null;
}

/** One edge of the discovery, with what we know about its completeness. */
export interface DiscoveredList<T> {
  items: T[];
  /** The edge answered. False means "could not check", never "not yours". */
  available: boolean;
  /** The walk stopped at its page cap, so absence proves nothing. */
  truncated: boolean;
}

export interface DiscoveryForValidation {
  adAccounts: DiscoveredList<MetaAdAccountOption>;
  pages: DiscoveredList<MetaPageOption>;
  /** Pixels of the requested ad account only. */
  pixels: DiscoveredList<MetaPixelOption>;
}

export interface ResolvedSelection {
  adAccountId: string;
  adAccountName: string;
  adAccountCurrency: string;
  adAccountTimezone: string;
  pageId: string;
  pageName: string;
  pixelId: string | null;
  pixelName: string | null;
}

export type ResolveResult =
  | { ok: true; selection: ResolvedSelection }
  | { ok: false; reasons: string[] };

function clean(id: string | null | undefined): string {
  return typeof id === "string" ? id.trim() : "";
}

function notFound(what: string, list: DiscoveredList<unknown>): string {
  if (!list.available) return `No se pudo verificar ${what} con Meta. Inténtalo de nuevo.`;
  if (list.truncated) {
    return `No se pudo verificar ${what}: tu usuario de Meta tiene más activos de los que ` +
      `podemos revisar. Contacta con soporte.`;
  }
  return `${what[0].toUpperCase()}${what.slice(1)} no está entre los activos a los que tu ` +
    `conexión de Meta tiene acceso.`;
}

export function resolveSelection(
  requested: RequestedSelection,
  discovered: DiscoveryForValidation
): ResolveResult {
  const reasons: string[] = [];

  const adAccountId = clean(requested.adAccountId);
  const pageId = clean(requested.pageId);
  const pixelId = clean(requested.pixelId);

  // ── Ad account ── exact match on the act_ id Meta returned.
  let account: MetaAdAccountOption | undefined;
  if (!adAccountId) {
    reasons.push("Selecciona una cuenta publicitaria.");
  } else {
    account = discovered.adAccounts.items.find((a) => a.id === adAccountId);
    if (!account) {
      reasons.push(notFound("la cuenta publicitaria", discovered.adAccounts));
    } else if (!account.currency || !account.timezone) {
      // Without Meta's own currency and zone the builder cannot lock them, and
      // we will not fill the gap with anything the client sent.
      reasons.push("Meta no devolvió la moneda o la zona horaria de esta cuenta publicitaria.");
    }
  }

  // ── Page ── must be one the connected person has a role on.
  let page: MetaPageOption | undefined;
  if (!pageId) {
    reasons.push("Selecciona una página de Facebook.");
  } else {
    page = discovered.pages.items.find((p) => p.id === pageId);
    if (!page) reasons.push(notFound("la página", discovered.pages));
  }

  // ── Pixel ── optional, but when named it must belong to that ad account.
  let pixel: MetaPixelOption | undefined;
  if (pixelId) {
    pixel = discovered.pixels.items.find((p) => p.id === pixelId);
    if (!pixel) reasons.push(notFound("el pixel", discovered.pixels));
  }

  if (reasons.length > 0 || !account || !page) return { ok: false, reasons };

  return {
    ok: true,
    selection: {
      adAccountId: account.id,
      adAccountName: account.name,
      adAccountCurrency: account.currency as string,
      adAccountTimezone: account.timezone as string,
      pageId: page.id,
      pageName: page.name,
      pixelId: pixel?.id ?? null,
      pixelName: pixel?.name ?? null,
    },
  };
}
