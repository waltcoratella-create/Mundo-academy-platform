import { describe, it, expect } from "vitest";
import { zonedLocalToOffsetIso } from "@/lib/timezone";

describe("zonedLocalToOffsetIso — explicit, DST-aware offsets", () => {
  it.each([
    ["2026-07-15T09:00", "Europe/Madrid", "2026-07-15T09:00:00+02:00"],
    ["2026-01-15T09:00", "Europe/Madrid", "2026-01-15T09:00:00+01:00"],
    ["2026-03-29T01:00", "Europe/Madrid", "2026-03-29T01:00:00+01:00"],
    ["2026-03-29T04:00", "Europe/Madrid", "2026-03-29T04:00:00+02:00"],
    ["2026-10-25T04:00", "Europe/Madrid", "2026-10-25T04:00:00+01:00"],
    ["2026-07-15T09:00", "America/Mexico_City", "2026-07-15T09:00:00-06:00"],
    ["2026-01-15T09:00", "America/Mexico_City", "2026-01-15T09:00:00-06:00"],
    ["2026-07-15T09:00", "America/Bogota", "2026-07-15T09:00:00-05:00"],
    ["2026-07-15T09:00", "Asia/Kolkata", "2026-07-15T09:00:00+05:30"],
    ["2026-07-15T09:00", "UTC", "2026-07-15T09:00:00+00:00"],
    ["2026-09-10", "Europe/Madrid", "2026-09-10T00:00:00+02:00"],
  ])("%s in %s → %s", (local, zone, expected) => {
    expect(zonedLocalToOffsetIso(local, zone)).toBe(expected);
  });

  it("refuses unusable input rather than guessing", () => {
    expect(zonedLocalToOffsetIso("2026-09-10T09:00", "Marte/Olympus")).toBeNull();
    expect(zonedLocalToOffsetIso("", "Europe/Madrid")).toBeNull();
  });
});
