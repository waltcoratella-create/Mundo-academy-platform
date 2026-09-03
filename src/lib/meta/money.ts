/**
 * Currency amounts for the Marketing API.
 *
 * Meta expects budgets in the currency's minor unit: 200 EUR is 20000, not 200.
 * Getting this wrong by a factor of 100 is the most expensive mistake this
 * pipeline can make, so the conversion exists exactly once and is tested.
 *
 * Not server-only: pure arithmetic, useful to the mapper and to tests alike.
 */

/**
 * Currencies with no minor unit, where the amount is already the minor unit.
 * From ISO 4217; Meta follows the same convention.
 */
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/** Currencies with three decimals rather than two. */
const THREE_DECIMAL = new Set(["BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND"]);

export function minorUnitExponent(currency: string): number {
  const code = currency.trim().toUpperCase();
  if (ZERO_DECIMAL.has(code)) return 0;
  if (THREE_DECIMAL.has(code)) return 3;
  return 2;
}

export class MoneyConversionError extends Error {}

/**
 * `200` + `"EUR"` → `20000`.
 *
 * Rounds half-up at the currency's precision. The epsilon nudge is not
 * decoration: `1.1 * 100` is `110.00000000000001` in binary floating point, and
 * `Math.trunc` alone would bill 110 instead of 110 — or worse, 109 for values
 * that land just below.
 *
 * Throws rather than guessing on anything that is not a usable positive amount,
 * because a silent 0 would be sent to Meta as a real budget.
 */
export function toMinorUnits(amount: number | string, currency: string): number {
  const value = typeof amount === "string" ? Number(amount.trim()) : amount;

  if (!Number.isFinite(value)) {
    throw new MoneyConversionError(`Importe no numérico: ${String(amount)}`);
  }
  if (value <= 0) {
    throw new MoneyConversionError(`El importe debe ser mayor que 0 (recibido ${value}).`);
  }

  const factor = 10 ** minorUnitExponent(currency);
  const minor = Math.round(value * factor + Number.EPSILON * value * factor);

  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new MoneyConversionError(`Importe fuera de rango: ${value} ${currency}`);
  }
  return minor;
}

/** For messages and logs: `20000` + `"EUR"` → `"200 EUR"`. */
export function fromMinorUnits(minor: number, currency: string): string {
  const factor = 10 ** minorUnitExponent(currency);
  return `${minor / factor} ${currency.toUpperCase()}`;
}
