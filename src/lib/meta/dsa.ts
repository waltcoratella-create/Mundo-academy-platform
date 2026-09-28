/**
 * EU Digital Services Act — who is promoted and who pays.
 *
 * Meta refuses an ad set that targets a regulated country without both
 * (code 100, subcode 3858081, proven by the smoke run). The two strings are
 * published in the EU ad library, so they are legal declarations: they come
 * from the business, confirmed by a person, never inferred.
 *
 * The list holds ONLY countries where the requirement is confirmed. It is a
 * list and not a boolean on purpose — extending it later is one line. Until a
 * country is confirmed we neither demand the data nor send a declaration for
 * it "just in case".
 *
 * Pure: no network, no database.
 */

/** EU-27, ISO 3166-1 alpha-2 as Meta uses them (Greece is GR). */
export const DSA_REQUIRED_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
]);

export function dsaRequiredFor(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return DSA_REQUIRED_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export interface DsaDeclaration {
  beneficiary: string;
  payor: string;
}

export const DSA_MAX_LENGTH = 200;

/**
 * Normalise and validate what a person typed.
 *
 * Returns the trimmed pair or the reasons it cannot be stored. Beneficiary and
 * payor may be equal — often they are — but each is asked for separately so
 * neither is filled in by copying the other.
 */
export function validateDsaInput(input: {
  beneficiary: string | null | undefined;
  payor: string | null | undefined;
}): { ok: true; value: DsaDeclaration } | { ok: false; reasons: string[] } {
  const beneficiary = (input.beneficiary ?? "").trim();
  const payor = (input.payor ?? "").trim();
  const reasons: string[] = [];

  if (!beneficiary) reasons.push("Indica el anunciante (beneficiario).");
  if (!payor) reasons.push("Indica quién paga los anuncios (pagador).");
  if (beneficiary.length > DSA_MAX_LENGTH) reasons.push(`El anunciante no puede superar ${DSA_MAX_LENGTH} caracteres.`);
  if (payor.length > DSA_MAX_LENGTH) reasons.push(`El pagador no puede superar ${DSA_MAX_LENGTH} caracteres.`);

  return reasons.length ? { ok: false, reasons } : { ok: true, value: { beneficiary, payor } };
}
