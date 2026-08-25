import "server-only";
import { createHmac } from "node:crypto";
import { GRAPH_BASE, getMetaAppConfig } from "./config";

/**
 * Minimal Graph API client. Deliberately not an SDK.
 *
 * Everything that talks to Meta goes through `metaGraphRequest` so versioning,
 * `appsecret_proof`, timeouts, error parsing and log hygiene live in exactly
 * one place. No token is ever logged, and Meta's error payloads are converted
 * into a sanitised type before they can reach a caller.
 */

const DEFAULT_TIMEOUT_MS = 15_000;

export class MetaGraphError extends Error {
  /** Meta's error code, when it sent one. */
  readonly code: number | null;
  readonly subcode: number | null;
  readonly httpStatus: number;
  /** Meta's trace id, safe to show for support. */
  readonly traceId: string | null;
  /** Transient errors are worth retrying; validation errors are not. */
  readonly retryable: boolean;

  constructor(init: {
    message: string;
    code?: number | null;
    subcode?: number | null;
    httpStatus: number;
    traceId?: string | null;
    retryable?: boolean;
  }) {
    super(init.message);
    this.name = "MetaGraphError";
    this.code = init.code ?? null;
    this.subcode = init.subcode ?? null;
    this.httpStatus = init.httpStatus;
    this.traceId = init.traceId ?? null;
    this.retryable = init.retryable ?? false;
  }
}

/**
 * HMAC-SHA256 of the access token, keyed with the App Secret.
 *
 * Proves the call came from our server. Without it a stolen token is usable on
 * its own; with it, an attacker also needs the App Secret. Meta can enforce it
 * app-wide under Settings → Advanced → Security, which is worth turning on.
 */
export function createAppSecretProof(accessToken: string): string {
  const { appSecret } = getMetaAppConfig();
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}

/** Meta rate-limit and transient failures worth a retry. */
function isRetryable(httpStatus: number, code: number | null): boolean {
  if (httpStatus >= 500) return true;
  // 4 = app-level throttle, 17 = user-level throttle, 613 = calls exceeded.
  return code === 4 || code === 17 || code === 613;
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_user_msg?: string;
  };
}

export interface GraphRequestOptions {
  /** Path after the version, e.g. "/me/adaccounts". */
  path: string;
  accessToken: string;
  /** Query params. `access_token` and `appsecret_proof` are added for you. */
  params?: Record<string, string | number | undefined>;
  method?: "GET" | "POST" | "DELETE";
  timeoutMs?: number;
}

/**
 * Call the Graph API.
 *
 * On failure throws MetaGraphError with a message safe to surface. The raw
 * response body is never logged, because Meta echoes request parameters —
 * including the access token — in some error payloads.
 */
export async function metaGraphRequest<T>(options: GraphRequestOptions): Promise<T> {
  const { path, accessToken, params = {}, method = "GET", timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  const url = new URL(`${GRAPH_BASE}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("appsecret_proof", createAppSecretProof(accessToken));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, { method, signal: controller.signal, cache: "no-store" });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    throw new MetaGraphError({
      message: aborted
        ? "Meta no respondió a tiempo. Inténtalo de nuevo."
        : "No se pudo conectar con Meta.",
      httpStatus: 0,
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();

  if (!response.ok) {
    let body: GraphErrorBody = {};
    try { body = JSON.parse(text) as GraphErrorBody; } catch { /* non-JSON error */ }

    const err = body.error ?? {};
    const code = err.code ?? null;

    // Log only the sanitised triple — never the URL (it carries the token) and
    // never the raw body.
    console.error("[meta:graph] request failed", {
      path,
      httpStatus: response.status,
      code,
      subcode: err.error_subcode ?? null,
      traceId: err.fbtrace_id ?? null,
    });

    throw new MetaGraphError({
      // Prefer Meta's user-facing message; fall back to the developer one.
      message: err.error_user_msg || err.message || `Meta devolvió un error (${response.status}).`,
      code,
      subcode: err.error_subcode ?? null,
      httpStatus: response.status,
      traceId: err.fbtrace_id ?? null,
      retryable: isRetryable(response.status, code),
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MetaGraphError({
      message: "Respuesta de Meta no interpretable.",
      httpStatus: response.status,
    });
  }
}

/** Shape of a paged Graph edge. */
export interface GraphPage<T> {
  data: T[];
  paging?: { cursors?: { after?: string }; next?: string };
}

/**
 * Read a paged edge, capped so a business with hundreds of assets cannot stall
 * the connection screen.
 */
export async function metaGraphList<T>(
  options: GraphRequestOptions & { maxPages?: number }
): Promise<T[]> {
  const { maxPages = 3, ...rest } = options;
  const out: T[] = [];
  let after: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const result = await metaGraphRequest<GraphPage<T>>({
      ...rest,
      params: { limit: 50, ...rest.params, ...(after ? { after } : {}) },
    });
    out.push(...(result.data ?? []));
    after = result.paging?.cursors?.after;
    if (!after || !result.paging?.next) break;
  }

  return out;
}
