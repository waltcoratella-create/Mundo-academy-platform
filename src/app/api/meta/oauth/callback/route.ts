import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { getMetaAppConfig, GRAPH_BASE, META_SCOPES } from "@/lib/meta/config";
import { verifyOAuthState, OAUTH_STATE_COOKIE, stateCookieOptions } from "@/lib/meta/oauth-state";
import { saveMetaConnection } from "@/lib/meta/connections";
import { metaGraphRequest } from "@/lib/meta/graph";

/**
 * OAuth callback.
 *
 * GET /api/meta/oauth/callback?code=…&state=…
 *
 * Nothing sensitive is ever rendered or returned: the browser only receives a
 * redirect back to the settings page carrying a short status flag. The code,
 * the tokens and the ciphertext are never logged.
 */

function settingsUrl(req: NextRequest, businessId: string, params: Record<string, string>) {
  const url = new URL(`/mis-negocios/${businessId}/configuraciones`, req.url);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

/** Clears the single-use state cookie so a captured URL cannot be replayed. */
function withStateCleared(response: NextResponse): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, "", stateCookieOptions(0));
  return response;
}

interface TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const returnedState = params.get("state");
  const oauthError = params.get("error");

  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? null;

  // ── 1 · Validate state before trusting anything else ──────────────────────
  const check = verifyOAuthState(returnedState, cookieState);
  if (!check.ok) {
    console.warn("[meta:oauth] state rejected:", check.error);
    // Without a verified state we do not know the business, so land on the
    // business list rather than guessing one from the query string.
    return withStateCleared(
      NextResponse.redirect(new URL("/mis-negocios?meta_error=state", req.url))
    );
  }
  const { businessId, clerkUserId } = check;

  // The user cancelled or Meta refused. Known business, so we can go back.
  if (oauthError || !code) {
    const reason = params.get("error_reason") === "user_denied" ? "denied" : "oauth";
    return withStateCleared(
      NextResponse.redirect(settingsUrl(req, businessId, { meta_error: reason }))
    );
  }

  // ── 2 · Re-verify session and ownership ───────────────────────────────────
  const { userId } = await auth();
  if (!userId || userId !== clerkUserId) {
    return withStateCleared(
      NextResponse.redirect(new URL("/mis-negocios?meta_error=session", req.url))
    );
  }

  const business = await getBusinessById(businessId, userId);
  if (!business) {
    return withStateCleared(
      NextResponse.redirect(new URL("/mis-negocios?meta_error=forbidden", req.url))
    );
  }

  // ── 3 · Exchange code → short-lived token ─────────────────────────────────
  let config;
  try {
    config = getMetaAppConfig();
  } catch {
    return withStateCleared(
      NextResponse.redirect(settingsUrl(req, businessId, { meta_error: "config" }))
    );
  }

  let shortLived: TokenResponse;
  try {
    const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("client_secret", config.appSecret);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("code", code);

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      // Body may echo the code — log only the status.
      console.error("[meta:oauth] code exchange failed, status", res.status);
      return withStateCleared(
        NextResponse.redirect(settingsUrl(req, businessId, { meta_error: "exchange" }))
      );
    }
    shortLived = (await res.json()) as TokenResponse;
  } catch {
    console.error("[meta:oauth] code exchange threw");
    return withStateCleared(
      NextResponse.redirect(settingsUrl(req, businessId, { meta_error: "exchange" }))
    );
  }

  if (!shortLived.access_token) {
    return withStateCleared(
      NextResponse.redirect(settingsUrl(req, businessId, { meta_error: "exchange" }))
    );
  }

  // ── 4 · Upgrade to a long-lived token (~60 days) ──────────────────────────
  // Verified behaviour: long-lived tokens do not auto-refresh, and an expired
  // one cannot be exchanged. When it lapses the user re-authenticates.
  let token = shortLived.access_token;
  let expiresIn: number | null = shortLived.expires_in ?? null;

  try {
    const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set("grant_type", "fb_exchange_token");
    url.searchParams.set("client_id", config.appId);
    url.searchParams.set("client_secret", config.appSecret);
    url.searchParams.set("fb_exchange_token", shortLived.access_token);

    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) {
      const longLived = (await res.json()) as TokenResponse;
      if (longLived.access_token) {
        token = longLived.access_token;
        expiresIn = longLived.expires_in ?? expiresIn;
      }
    } else {
      // Keep the short-lived token: the connection still works, just briefly.
      console.warn("[meta:oauth] long-lived exchange failed, status", res.status);
    }
  } catch {
    console.warn("[meta:oauth] long-lived exchange threw; keeping short-lived token");
  }

  // ── 5 · Identify the Meta user (nice-to-have, not fatal) ──────────────────
  let metaUserId: string | null = null;
  try {
    const me = await metaGraphRequest<{ id: string }>({
      path: "/me", accessToken: token, params: { fields: "id" },
    });
    metaUserId = me.id ?? null;
  } catch {
    // Discovery will surface a real permission problem more clearly.
  }

  // ── 6 · Encrypt and persist ───────────────────────────────────────────────
  const saved = await saveMetaConnection({
    businessId: business.id,
    accessToken: token,
    expiresInSeconds: expiresIn,
    scopes: [...META_SCOPES],
    metaUserId,
  });

  if (!saved.ok) {
    console.error("[meta:oauth] save failed:", saved.error);
    return withStateCleared(
      NextResponse.redirect(settingsUrl(req, businessId, { meta_error: "save" }))
    );
  }

  // Connected, but assets still need choosing — the settings screen picks up
  // from here. No token, no code, nothing sensitive in this URL.
  return withStateCleared(
    NextResponse.redirect(settingsUrl(req, businessId, { meta: "connected" }))
  );
}
