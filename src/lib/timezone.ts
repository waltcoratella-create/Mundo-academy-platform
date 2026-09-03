/**
 * IANA timezone conversion for `datetime-local` values.
 *
 * No dependency: the DST rules come from the platform's ICU database via
 * `Intl.DateTimeFormat`, which is the same source `date-fns-tz` and `luxon`
 * read. Nothing here hardcodes an offset — the offset is always resolved for
 * the specific instant, so summer/winter time is handled per date.
 */

/** `Intl` throws RangeError on an unknown zone; that's our validity check. */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Offset of `timeZone` at a given instant, in ms (east of UTC is positive).
 *
 * Works by asking Intl for the wall clock in that zone and re-reading it as if
 * it were UTC; the difference is the offset that applied at that moment.
 */
function zoneOffsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));

  const p: Record<string, string> = {};
  for (const { type, value } of parts) p[type] = value;

  // Some ICU versions emit "24" for midnight under hour12:false.
  const hour = p.hour === "24" ? 0 : Number(p.hour);

  const wallClockAsUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    hour,
    Number(p.minute),
    Number(p.second)
  );

  return wallClockAsUtc - instant;
}

/**
 * `"2026-08-24T09:00"` + `"Europe/Madrid"` → `"2026-08-24T07:00:00.000Z"`.
 *
 * Returns null when the input or the zone is unusable, so callers can refuse to
 * save rather than storing a wrong instant.
 *
 * Two passes: the first uses the offset at the naive instant, the second
 * re-resolves it at the corrected instant. That converges for every normal
 * time and for both DST edges.
 *
 * DST edge behaviour, verified against Europe/Madrid 2026 rather than assumed:
 *  · Non-existent local time (spring forward, 02:30 on 2026-03-29) resolves to
 *    01:30Z, i.e. the instant just after the jump.
 *  · Ambiguous local time (fall back, 02:30 on 2026-10-25 happens twice)
 *    resolves to 01:30Z — the SECOND, post-transition occurrence.
 * Both are stable: converting back yields the same wall clock the user typed.
 */
export function zonedLocalToUtc(local: string, timeZone: string): string | null {
  if (!local) return null;
  if (!isValidTimeZone(timeZone)) return null;

  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(local);
  if (!m) return null;

  const [, y, mo, d, h = "00", mi = "00"] = m;
  const naive = Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi));
  if (Number.isNaN(naive)) return null;

  let utc = naive - zoneOffsetMs(naive, timeZone);
  utc = naive - zoneOffsetMs(utc, timeZone);

  const result = new Date(utc);
  return Number.isNaN(result.getTime()) ? null : result.toISOString();
}

/**
 * `"2026-08-24T07:00:00.000Z"` + `"Europe/Madrid"` → `"2026-08-24T09:00"`,
 * the shape a `datetime-local` input expects.
 *
 * An unknown zone falls back to UTC rather than throwing, so an old row with a
 * bad `timezone` still opens for editing.
 */
export function utcToZonedLocal(utc: string | null, timeZone: string): string {
  if (!utc) return "";
  const instant = Date.parse(utc);
  if (Number.isNaN(instant)) return "";

  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const shifted = instant + zoneOffsetMs(instant, zone);
  return new Date(shifted).toISOString().slice(0, 16);
}

/** Now, as `yyyy-MM-ddTHH:mm` in the given zone. */
export function nowInZone(timeZone: string): string {
  return utcToZonedLocal(new Date().toISOString(), timeZone);
}

/**
 * `"2026-09-10T09:00"` + `"Europe/Madrid"` → `"2026-09-10T09:00:00+02:00"`.
 *
 * The shape Meta wants for `start_time`: a wall clock plus the offset that
 * actually applied at that instant. A bare `"2026-09-10"` is read as 00:00
 * local. The offset is never hardcoded — it comes from `zoneOffsetMs` at the
 * resolved instant, so the same date in July and in January yields +02:00 and
 * +01:00 respectively without anything here knowing what DST is.
 *
 * Returns null when the input or the zone is unusable, so a caller can refuse
 * rather than send Meta an ambiguous time.
 */
export function zonedLocalToOffsetIso(local: string, timeZone: string): string | null {
  const utc = zonedLocalToUtc(local, timeZone);
  if (!utc) return null;

  const instant = Date.parse(utc);
  const offsetMs = zoneOffsetMs(instant, timeZone);
  const wallClock = new Date(instant + offsetMs).toISOString().slice(0, 19);

  const sign = offsetMs < 0 ? "-" : "+";
  const abs = Math.abs(offsetMs);
  const hh = String(Math.floor(abs / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((abs % 3_600_000) / 60_000)).padStart(2, "0");

  return `${wallClock}${sign}${hh}:${mm}`;
}
