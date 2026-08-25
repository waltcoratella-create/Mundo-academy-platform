import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { getMetaAppConfig } from "./config";
import { safeEqual } from "./crypto";

/**
 * OAuth `state`: signed, bound and single-use.
 *
 * A bare businessId as state would let anyone craft a callback that attaches
 * their Meta account to someone else's business. Instead the state carries the
 * business, the Clerk user and a nonce, all HMAC-signed with the App Secret,
 * and a copy is stored in an HttpOnly cookie.
 *
 * The callback requires BOTH to be present and identical, which gives:
 *   · CSRF protection  — an attacker cannot set our cookie
 *   · anti-tamper      — changing the business invalidates the signature
 *   · anti-replay      — the cookie is deleted on use, so a captured URL
 *                        cannot be redeemed twice
 *   · session binding  — the Clerk user must match the one who started it
 */

export const OAUTH_STATE_COOKIE = "ma_meta_oauth_state";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StatePayload {
  /** business id */
  b: string;
  /** clerk user id */
  u: string;
  /** nonce */
  n: string;
  /** expiry, epoch ms */
  e: number;
}

function sign(encodedPayload: string): string {
  const { appSecret } = getMetaAppConfig();
  return createHmac("sha256", appSecret).update(encodedPayload).digest("base64url");
}

/** Build a signed state token for this business + user. */
export function createOAuthState(businessId: string, clerkUserId: string): string {
  const payload: StatePayload = {
    b: businessId,
    u: clerkUserId,
    n: randomBytes(16).toString("base64url"),
    e: Date.now() + TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export type StateCheck =
  | { ok: true; businessId: string; clerkUserId: string }
  | { ok: false; error: string };

/**
 * Validate the state returned by Meta against the cookie we set.
 *
 * `cookieValue` is the authoritative copy; `returned` is what came back through
 * the browser. Both must match exactly and the signature must verify.
 */
export function verifyOAuthState(returned: string | null, cookieValue: string | null): StateCheck {
  if (!returned || !cookieValue) {
    return { ok: false, error: "Falta el parámetro de seguridad de la conexión." };
  }

  // Constant-time: the cookie is the secret half of the pair.
  if (!safeEqual(returned, cookieValue)) {
    return { ok: false, error: "El parámetro de seguridad no coincide." };
  }

  const parts = returned.split(".");
  if (parts.length !== 2) {
    return { ok: false, error: "Parámetro de seguridad malformado." };
  }

  const [encoded, signature] = parts;
  if (!safeEqual(signature, sign(encoded))) {
    return { ok: false, error: "El parámetro de seguridad no es válido." };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
  } catch {
    return { ok: false, error: "Parámetro de seguridad ilegible." };
  }

  if (!payload.b || !payload.u || typeof payload.e !== "number") {
    return { ok: false, error: "Parámetro de seguridad incompleto." };
  }
  if (Date.now() > payload.e) {
    return { ok: false, error: "La conexión tardó demasiado. Vuelve a intentarlo." };
  }

  return { ok: true, businessId: payload.b, clerkUserId: payload.u };
}

/** Cookie attributes. HttpOnly so no script can read it; Lax survives the redirect back. */
export function stateCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/meta/oauth",
    maxAge: maxAgeSeconds,
  };
}

export const STATE_TTL_SECONDS = TTL_MS / 1000;
