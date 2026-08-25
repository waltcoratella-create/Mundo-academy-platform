import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptToken, decryptToken, CURRENT_KEY_VERSION } from "./crypto";
import type {
  MetaConnection, MetaConnectionResult, MetaConnectionStatus,
  SaveMetaConnectionInput, SelectMetaAssetsInput,
} from "./connection-types";
import { canTransition, isTokenExpired } from "./connection-types";

/**
 * Server-only access to Meta connections.
 *
 * Every read goes through the service-role client because `meta_connections`
 * has RLS enabled with no policies at all — anon and authenticated see nothing,
 * by design. Importing this module from a client component fails at build time
 * (`server-only`) and would fail at runtime anyway, since the service-role key
 * is not a NEXT_PUBLIC variable.
 *
 * Callers never receive the token. `getMetaAccessToken` is the single exception
 * and is meant to be consumed inside lib/meta, not returned from a server
 * action.
 */

const TABLE = "meta_connections";
const MIGRATION_HINT =
  "La tabla meta_connections no existe todavía. Ejecuta scripts/meta-connections-schema.sql en Supabase → SQL Editor.";

/** Columns safe to select for application use — never the token columns. */
const PUBLIC_COLUMNS =
  "id, business_id, status, meta_user_id, meta_business_id, meta_business_name, " +
  "ad_account_id, ad_account_name, ad_account_currency, ad_account_timezone, " +
  "page_id, page_name, pixel_id, pixel_name, scopes, token_expires_at, " +
  "last_error, connected_at, disconnected_at, created_at, updated_at";

interface ConnectionRow {
  id: string;
  business_id: string;
  status: string;
  meta_user_id: string | null;
  meta_business_id: string | null;
  meta_business_name: string | null;
  ad_account_id: string | null;
  ad_account_name: string | null;
  ad_account_currency: string | null;
  ad_account_timezone: string | null;
  page_id: string | null;
  page_name: string | null;
  pixel_id: string | null;
  pixel_name: string | null;
  scopes: string[] | null;
  token_expires_at: string | null;
  last_error: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
}

function toConnection(row: ConnectionRow): MetaConnection {
  return {
    id: row.id,
    businessId: row.business_id,
    status: (row.status as MetaConnectionStatus) ?? "error",
    metaUserId: row.meta_user_id,
    metaBusinessId: row.meta_business_id,
    metaBusinessName: row.meta_business_name,
    adAccountId: row.ad_account_id,
    adAccountName: row.ad_account_name,
    adAccountCurrency: row.ad_account_currency,
    adAccountTimezone: row.ad_account_timezone,
    pageId: row.page_id,
    pageName: row.page_name,
    pixelId: row.pixel_id,
    pixelName: row.pixel_name,
    scopes: row.scopes ?? [],
    tokenExpiresAt: row.token_expires_at,
    lastError: row.last_error,
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingTable(error: { code?: string }): boolean {
  return error.code === "42P01";
}

/**
 * The live connection for a business, or null.
 *
 * "Live" means not disconnected — disconnected rows stay for history but are
 * never returned. If the stored expiry has passed, the row is flipped to
 * `expired` so the UI and any publish check agree without a background job.
 */
export async function getMetaConnectionForBusiness(
  businessId: string
): Promise<MetaConnection | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(PUBLIC_COLUMNS)
    .eq("business_id", businessId)
    .is("disconnected_at", null)
    .maybeSingle();

  if (error) {
    if (!isMissingTable(error)) {
      console.error("[meta_connections] read error:", error.code, error.message);
    }
    return null;
  }
  if (!data) return null;

  const connection = toConnection(data as unknown as ConnectionRow);

  if (connection.status === "connected" && isTokenExpired(connection)) {
    const expired = await setConnectionStatus(businessId, "expired");
    return expired.ok ? expired.connection : { ...connection, status: "expired" };
  }

  return connection;
}

/**
 * Create or replace the connection for a business, encrypting the token.
 *
 * Phase B calls this at the end of OAuth. Reconnecting overwrites the live row
 * rather than creating a second one: a partial unique index enforces one live
 * connection per business, and history lives in the disconnected rows.
 */
export async function saveMetaConnection(
  input: SaveMetaConnectionInput
): Promise<MetaConnectionResult> {
  const { businessId, accessToken, expiresInSeconds, scopes } = input;

  if (!businessId) return { ok: false, error: "Falta el negocio." };
  if (!accessToken) return { ok: false, error: "Falta el token de acceso." };

  let encrypted;
  try {
    encrypted = encryptToken(accessToken);
  } catch (e) {
    // Surfaces a missing/!32-byte key without ever echoing the token.
    return { ok: false, error: e instanceof Error ? e.message : "No se pudo cifrar el token." };
  }

  const expiresAt =
    typeof expiresInSeconds === "number" && Number.isFinite(expiresInSeconds)
      ? new Date(Date.now() + expiresInSeconds * 1000).toISOString()
      : null;

  const supabase = createAdminClient();
  const existing = await getMetaConnectionForBusiness(businessId);

  const payload = {
    business_id: businessId,
    status: "connected" as const,
    meta_user_id: input.metaUserId ?? null,
    meta_business_id: input.metaBusinessId ?? null,
    meta_business_name: input.metaBusinessName ?? null,
    token_ciphertext: encrypted.ciphertext,
    token_key_version: encrypted.keyVersion,
    token_expires_at: expiresAt,
    scopes,
    last_error: null,
    connected_at: new Date().toISOString(),
    disconnected_at: null,
  };

  const query = existing
    ? supabase.from(TABLE).update(payload).eq("id", existing.id)
    : supabase.from(TABLE).insert(payload);

  const { data, error } = await query.select(PUBLIC_COLUMNS).single();

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_HINT };
    console.error("[meta_connections] save error:", error.code, error.message);
    return { ok: false, error: "No se pudo guardar la conexión." };
  }

  return { ok: true, connection: toConnection(data as unknown as ConnectionRow) };
}

/** Store the assets the business picked (phase C). Never touches the token. */
export async function selectMetaAssets(
  input: SelectMetaAssetsInput
): Promise<MetaConnectionResult> {
  const existing = await getMetaConnectionForBusiness(input.businessId);
  if (!existing) return { ok: false, error: "No hay una conexión de Meta activa." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      ad_account_id: input.adAccountId ?? null,
      ad_account_name: input.adAccountName ?? null,
      ad_account_currency: input.adAccountCurrency ?? null,
      ad_account_timezone: input.adAccountTimezone ?? null,
      page_id: input.pageId ?? null,
      page_name: input.pageName ?? null,
      pixel_id: input.pixelId ?? null,
      pixel_name: input.pixelName ?? null,
    })
    .eq("id", existing.id)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_HINT };
    console.error("[meta_connections] assets error:", error.code, error.message);
    return { ok: false, error: "No se pudieron guardar los activos seleccionados." };
  }

  return { ok: true, connection: toConnection(data as unknown as ConnectionRow) };
}

/**
 * Disconnect: clear the token and mark the row.
 *
 * The row is kept as an audit trail but the ciphertext is wiped, so a disconnect
 * genuinely destroys our copy of the credential.
 *
 * Phase B must ALSO call Meta's permission-revocation endpoint. Deleting our row
 * alone leaves the grant alive on Meta's side.
 */
export async function disconnectMetaConnection(
  businessId: string
): Promise<MetaConnectionResult> {
  const existing = await getMetaConnectionForBusiness(businessId);
  if (!existing) return { ok: false, error: "No hay una conexión de Meta activa." };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      status: "disconnected" as const,
      token_ciphertext: null,
      token_key_version: null,
      token_expires_at: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq("id", existing.id)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    if (isMissingTable(error)) return { ok: false, error: MIGRATION_HINT };
    console.error("[meta_connections] disconnect error:", error.code, error.message);
    return { ok: false, error: "No se pudo desconectar la cuenta." };
  }

  return { ok: true, connection: toConnection(data as unknown as ConnectionRow) };
}

/** Move a connection to a new status, refusing transitions the machine forbids. */
export async function setConnectionStatus(
  businessId: string,
  status: MetaConnectionStatus,
  lastError?: string
): Promise<MetaConnectionResult> {
  const supabase = createAdminClient();
  const { data: current, error: readError } = await supabase
    .from(TABLE)
    .select("id, status")
    .eq("business_id", businessId)
    .is("disconnected_at", null)
    .maybeSingle();

  if (readError) {
    if (isMissingTable(readError)) return { ok: false, error: MIGRATION_HINT };
    return { ok: false, error: "No se pudo leer la conexión." };
  }
  if (!current) return { ok: false, error: "No hay una conexión de Meta activa." };

  const from = (current as { status: MetaConnectionStatus }).status;
  if (from !== status && !canTransition(from, status)) {
    return { ok: false, error: `Transición no permitida: ${from} → ${status}.` };
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status, last_error: lastError ?? null })
    .eq("id", (current as { id: string }).id)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) return { ok: false, error: "No se pudo actualizar el estado." };
  return { ok: true, connection: toConnection(data as unknown as ConnectionRow) };
}

/**
 * Decrypt and return the access token.
 *
 * INTERNAL. Use only inside lib/meta when building a Graph request. Never
 * return this from a server action, never log it, never place it in a payload
 * that reaches the browser.
 */
export async function getMetaAccessToken(businessId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("token_ciphertext, token_key_version, token_expires_at, status")
    .eq("business_id", businessId)
    .is("disconnected_at", null)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    token_ciphertext: string | null;
    token_key_version: number | null;
    token_expires_at: string | null;
    status: string;
  };

  if (!row.token_ciphertext) return null;
  if (isTokenExpired({ tokenExpiresAt: row.token_expires_at })) return null;

  try {
    return decryptToken(row.token_ciphertext, row.token_key_version ?? CURRENT_KEY_VERSION);
  } catch (e) {
    // Log the failure, never the ciphertext.
    console.error("[meta_connections] decrypt failed:", e instanceof Error ? e.message : "unknown");
    return null;
  }
}
