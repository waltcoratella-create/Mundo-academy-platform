import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DsaDeclaration } from "./dsa";

/**
 * Per-business advertising settings. Today: the DSA declaration.
 *
 * The table denies every browser-side key (RLS on, no policies); only the
 * service role reaches it, and only through actions that re-check ownership.
 */

const TABLE = "business_ad_settings";

export interface DsaSettings extends DsaDeclaration {
  confirmedAt: string;
}

export class AdSettingsError extends Error {}

const MIGRATION_HINT =
  "Falta la tabla business_ad_settings. Ejecuta scripts/meta-publish-lifecycle.sql en Supabase.";

/** The confirmed declaration, or null when the business has not given one. */
export async function getDsaSettings(businessId: string): Promise<DsaSettings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("dsa_beneficiary, dsa_payor, dsa_confirmed_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01") throw new AdSettingsError(MIGRATION_HINT);
    throw new AdSettingsError("No se pudo leer la configuración de anuncios.");
  }
  const row = data as {
    dsa_beneficiary: string | null; dsa_payor: string | null; dsa_confirmed_at: string | null;
  } | null;
  if (!row?.dsa_beneficiary || !row.dsa_payor || !row.dsa_confirmed_at) return null;

  return { beneficiary: row.dsa_beneficiary, payor: row.dsa_payor, confirmedAt: row.dsa_confirmed_at };
}

/** Store a declaration a person just confirmed, recording who and when. */
export async function saveDsaSettings(
  businessId: string,
  confirmedBy: string,
  value: DsaDeclaration
): Promise<DsaSettings> {
  const supabase = createAdminClient();
  const confirmedAt = new Date().toISOString();
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      {
        business_id: businessId,
        dsa_beneficiary: value.beneficiary,
        dsa_payor: value.payor,
        dsa_confirmed_at: confirmedAt,
        dsa_confirmed_by: confirmedBy,
      },
      { onConflict: "business_id" }
    );

  if (error) {
    if (error.code === "42P01") throw new AdSettingsError(MIGRATION_HINT);
    throw new AdSettingsError("No se pudo guardar la configuración de anuncios.");
  }
  return { ...value, confirmedAt };
}
