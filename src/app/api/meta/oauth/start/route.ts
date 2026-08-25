import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBusinessById } from "@/lib/supabase/queries";
import { getMetaAppConfig, META_SCOPES, OAUTH_DIALOG, MetaConfigError } from "@/lib/meta/config";
import {
  createOAuthState, stateCookieOptions, OAUTH_STATE_COOKIE, STATE_TTL_SECONDS,
} from "@/lib/meta/oauth-state";

/**
 * Start the Meta OAuth flow.
 *
 * GET /api/meta/oauth/start?businessId=<uuid>
 *
 * Ownership is checked here and again in the callback: the businessId travels
 * through the browser, so it is never trusted on the way back either.
 */
export async function GET(req: NextRequest) {
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "Falta businessId." }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // getBusinessById is already scoped to the authed owner.
  const business = await getBusinessById(businessId, userId);
  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });
  }

  let config;
  try {
    config = getMetaAppConfig();
  } catch (e) {
    const message = e instanceof MetaConfigError ? e.message : "Meta no está configurado.";
    console.error("[meta:oauth] config error:", message);
    return NextResponse.redirect(
      new URL(`/mis-negocios/${businessId}/configuraciones?meta_error=config`, req.url)
    );
  }

  const state = createOAuthState(business.id, userId);

  const dialog = new URL(OAUTH_DIALOG);
  dialog.searchParams.set("client_id", config.appId);
  dialog.searchParams.set("redirect_uri", config.redirectUri);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("scope", META_SCOPES.join(","));
  dialog.searchParams.set("response_type", "code");

  const response = NextResponse.redirect(dialog.toString());
  // The authoritative half of the CSRF pair. Never readable by scripts.
  response.cookies.set(OAUTH_STATE_COOKIE, state, stateCookieOptions(STATE_TTL_SECONDS));
  return response;
}
