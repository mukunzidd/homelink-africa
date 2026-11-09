import { describe, expect, it } from "vitest";
import { formatMoney, numberLocale } from "./money";

/**
 * Rwanda writes money with comma grouping. CLDR's Kinyarwanda data groups
 * with a period, which a Rwandan reads as a decimal point, so a caller that
 * hands formatMoney the date locale must still get commas.
 */
describe("formatMoney in Kinyarwanda", () => {
  const rwf = { minor: 157_096, currency: "RWF" } as const;

  it("groups with commas whichever rw tag it is given", () => {
    expect(formatMoney(rwf, "rw-RW")).toBe(formatMoney(rwf, "en-RW"));
    expect(formatMoney(rwf, "rw")).toBe(formatMoney(rwf, "en-RW"));
    expect(formatMoney(rwf, "rw-RW")).not.toMatch(/\d\.\d{3}/);
  });

  it("leaves French and Swahili alone", () => {
    expect(formatMoney(rwf, "fr-FR")).toMatch(/157\s096/);
    expect(formatMoney(rwf, "sw-RW")).toContain("157,096");
  });
});

describe("numberLocale", () => {
  it("sends every rw tag to en-RW and leaves the rest", () => {
    expect(numberLocale("rw-RW")).toBe("en-RW");
    expect(numberLocale("rw")).toBe("en-RW");
    expect(numberLocale("fr-FR")).toBe("fr-FR");
    expect(numberLocale("sw-RW")).toBe("sw-RW");
  });
});
