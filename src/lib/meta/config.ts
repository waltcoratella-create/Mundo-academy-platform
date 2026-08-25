import "server-only";

/**
 * Meta app configuration. Server-only — none of these are NEXT_PUBLIC_.
 *
 * The App Secret never leaves this process: it signs `appsecret_proof`, signs
 * the OAuth `state`, and exchanges the code for a token. It is never stored in
 * the database and never sent to a client.
 */

/**
 * Graph API version.
 *
 * Pinned so a Meta release never changes our behaviour without a deliberate
 * bump. v26.0 was the current version when this was written; each version stays
 * active a minimum of two years.
 */
export const META_API_VERSION = process.env.META_API_VERSION || "v26.0";

export const GRAPH_BASE = `https://graph.facebook.com/${META_API_VERSION}`;
export const OAUTH_DIALOG = `https://www.facebook.com/${META_API_VERSION}/dialog/oauth`;

/**
 * Scopes requested at OAuth time. Only what we actually use:
 *
 *  · ads_management     — create and manage campaigns (phases E+)
 *  · ads_read           — read insights for the dashboard (phase H)
 *  · business_management — list the business portfolios and their assets
 *  · pages_show_list    — list the Pages the person manages, so they can pick
 *                         the advertiser identity an Ad Creative requires
 *
 * Verified against Meta's permission reference: pages_show_list is current and
 * needs no Advanced Access. The three ads/business scopes need Advanced Access
 * to operate on accounts the app does not own — that is App Review, and Meta
 * additionally requires a track record of 500+ calls in 15 days with under 15%
 * errors before granting it.
 */
export const META_SCOPES = [
  "ads_management",
  "ads_read",
  "business_management",
  "pages_show_list",
] as const;

export interface MetaAppConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export class MetaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetaConfigError";
  }
}

/**
 * The redirect URI registered in the Meta app.
 *
 * Derived from NEXT_PUBLIC_APP_URL so local and production agree without a
 * second variable to keep in sync, and overridable when they must differ.
 */
export function metaRedirectUri(): string {
  const explicit = process.env.META_OAUTH_REDIRECT_URI;
  if (explicit) return explicit;

  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) {
    throw new MetaConfigError(
      "Falta NEXT_PUBLIC_APP_URL (o META_OAUTH_REDIRECT_URI) para construir la URL de retorno."
    );
  }
  return `${base.replace(/\/$/, "")}/api/meta/oauth/callback`;
}

/** Throws when the app is not configured, rather than failing mid-OAuth. */
export function getMetaAppConfig(): MetaAppConfig {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId) throw new MetaConfigError("Falta META_APP_ID.");
  if (!appSecret) throw new MetaConfigError("Falta META_APP_SECRET.");

  return { appId, appSecret, redirectUri: metaRedirectUri() };
}

/** Cheap check for the UI: is the integration configured at all? */
export function isMetaConfigured(): boolean {
  try {
    getMetaAppConfig();
    return true;
  } catch {
    return false;
  }
}
