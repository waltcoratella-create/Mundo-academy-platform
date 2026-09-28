import { describe, it, expect } from "vitest";
import { toMinorUnits, fromMinorUnits, minorUnitExponent } from "@/lib/meta/money";

describe("toMinorUnits", () => {
  it.each([
    [200, "EUR", 20000],
    [50, "EUR", 5000],
    [0.5, "EUR", 50],
    ["200", "EUR", 20000],
    [19.99, "EUR", 1999],
    [0.07, "EUR", 7],
    [8.115, "EUR", 812],
    [200, "JPY", 200],
    [200, "KWD", 200000],
  ] as const)("%s %s → %s", (amount, currency, expected) => {
    expect(toMinorUnits(amount, currency)).toBe(expected);
  });

  it.each([[0], [-5], [""], ["abc"]])("refuses %j", (bad) => {
    expect(() => toMinorUnits(bad as never, "EUR")).toThrow();
  });
});

describe("minorUnitExponent / fromMinorUnits", () => {
  it("knows the exponents", () => {
    expect(minorUnitExponent("EUR")).toBe(2);
    expect(minorUnitExponent("jpy")).toBe(0);
  });
  it("round-trips for display", () => {
    expect(fromMinorUnits(20000, "EUR")).toBe("200 EUR");
    expect(fromMinorUnits(200, "JPY")).toBe("200 JPY");
  });
});
