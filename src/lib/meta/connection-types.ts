/**
 * Meta connection contracts.
 *
 * Free of Supabase and node:crypto imports so the shapes can be used anywhere,
 * including tests. The token itself never appears in any type here — see the
 * note on MetaConnection below.
 */

/**
 * Connection lifecycle.
 *
 *   connecting ──► connected ──► expired ──► (re-auth) ──► connected
 *        │             │            │
 *        └──► error ◄──┘            │
 *        │             │            │
 *        └────────► disconnected ◄──┘        (terminal; row kept for history)
 *
 * `expired` is a real state rather than a computed flag because Meta's
 * long-lived user tokens last ~60 days, do NOT auto-refresh, and an expired
 * token cannot be exchanged for a new one — the user must authenticate again.
 * Verified against Meta's long-lived token documentation.
 */
export type MetaConnectionStatus =
  | "connecting"
  | "connected"
  | "expired"
  | "error"
  | "disconnected";

export const META_CONNECTION_STATUSES: MetaConnectionStatus[] = [
  "connecting", "connected", "expired", "error", "disconnected",
];

/** Transitions the app is allowed to make. Anything else is a bug. */
const TRANSITIONS: Record<MetaConnectionStatus, MetaConnectionStatus[]> = {
  connecting:   ["connected", "error", "disconnected"],
  connected:    ["expired", "error", "disconnected"],
  expired:      ["connected", "error", "disconnected"],
  error:        ["connecting", "connected", "disconnected"],
  disconnected: [],
};

export function canTransition(
  from: MetaConnectionStatus,
  to: MetaConnectionStatus
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * A connection as the rest of the app may see it.
 *
 * Deliberately contains NO token field — not even an optional one. If the type
 * cannot express a token, a refactor cannot accidentally serialise one to the
 * browser. The token is read only inside lib/meta, through its own function.
 */
export interface MetaConnection {
  id: string;
  businessId: string;
  status: MetaConnectionStatus;

  /** Meta identity captured during OAuth (phase B). */
  metaUserId: string | null;
  metaBusinessId: string | null;
  metaBusinessName: string | null;

  /**
   * Assets selected by the business (phase C). Currency and timezone come from
   * the ad account and override anything chosen in the builder — a mismatch
   * would make Meta read a 200 budget in the wrong currency.
   */
  adAccountId: string | null;
  adAccountName: string | null;
  adAccountCurrency: string | null;
  adAccountTimezone: string | null;
  pageId: string | null;
  pageName: string | null;
  pixelId: string | null;
  pixelName: string | null;

  scopes: string[];
  tokenExpiresAt: string | null;
  lastError: string | null;
  connectedAt: string | null;
  disconnectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What is still missing before this connection could publish anything. */
export interface MetaReadiness {
  ready: boolean;
  missing: string[];
}

/**
 * A connection is publish-ready only with a live token and every required
 * asset. The page is included because an Ad Creative needs an advertiser
 * identity; the pixel is not, because only conversion objectives require it —
 * that check belongs to the campaign, not the connection.
 */
export function connectionReadiness(c: MetaConnection | null): MetaReadiness {
  if (!c) return { ready: false, missing: ["Conecta tu cuenta de Meta"] };

  const missing: string[] = [];
  if (c.status === "expired") missing.push("La conexión caducó: vuelve a autorizar");
  else if (c.status === "error") missing.push("La última operación falló: revisa la conexión");
  else if (c.status !== "connected") missing.push("La conexión no está activa");

  if (!c.adAccountId) missing.push("Selecciona una cuenta publicitaria");
  if (!c.pageId) missing.push("Selecciona una página de Facebook");

  return { ready: missing.length === 0, missing };
}

/** True when the stored expiry has passed. Callers decide what to do about it. */
export function isTokenExpired(c: Pick<MetaConnection, "tokenExpiresAt">): boolean {
  if (!c.tokenExpiresAt) return false;
  const at = Date.parse(c.tokenExpiresAt);
  return Number.isFinite(at) && at <= Date.now();
}

/** Days until the token expires; negative once past. null when unknown. */
export function daysUntilExpiry(c: Pick<MetaConnection, "tokenExpiresAt">): number | null {
  if (!c.tokenExpiresAt) return null;
  const at = Date.parse(c.tokenExpiresAt);
  if (!Number.isFinite(at)) return null;
  return Math.floor((at - Date.now()) / 86_400_000);
}

/** Input for saving a connection once OAuth lands (phase B). */
export interface SaveMetaConnectionInput {
  businessId: string;
  accessToken: string;
  /** Seconds until expiry, as Meta's token exchange returns it. */
  expiresInSeconds?: number | null;
  scopes: string[];
  metaUserId?: string | null;
  metaBusinessId?: string | null;
  metaBusinessName?: string | null;
}

/** Input for the asset selection step (phase C). */
export interface SelectMetaAssetsInput {
  businessId: string;
  adAccountId?: string | null;
  adAccountName?: string | null;
  adAccountCurrency?: string | null;
  adAccountTimezone?: string | null;
  pageId?: string | null;
  pageName?: string | null;
  pixelId?: string | null;
  pixelName?: string | null;
}

export type MetaConnectionResult =
  | { ok: true; connection: MetaConnection }
  | { ok: false; error: string };


// ─── Asset discovery contracts ────────────────────────────────────────────────
//
// These live here rather than in discovery.ts so a Client Component can type
// against them without importing a `server-only` module. Only ids, names and
// the few safe fields the picker needs — never a token.

export interface MetaBusinessOption {
  id: string;
  name: string;
}

export interface MetaAdAccountOption {
  /** The `act_<id>` form, which every later API call needs. */
  id: string;
  accountId: string;
  name: string;
  currency: string | null;
  timezone: string | null;
  /** Meta's numeric account_status; 1 = ACTIVE. */
  status: number | null;
  usable: boolean;
}

export interface MetaPageOption {
  id: string;
  name: string;
}

export interface MetaPixelOption {
  id: string;
  name: string;
}

export interface MetaAssets {
  businesses: MetaBusinessOption[];
  adAccounts: MetaAdAccountOption[];
  pages: MetaPageOption[];
  /** Empty until an ad account is chosen — pixels hang off the account. */
  pixels: MetaPixelOption[];
}
