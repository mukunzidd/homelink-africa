import { afterEach, describe, expect, it, vi } from "vitest";
import { dateTimeFormat, relativeTimeFormat } from "./date-format";
import { formatDate, formatDateRange, formatMonthTitle, weekdayLabels } from "./dates";

const nov16 = new Date(Date.UTC(2026, 10, 16, 10, 32));
const utc = { timeZone: "UTC" } as const;

describe("dateTimeFormat in Kinyarwanda", () => {
  afterEach(() => vi.restoreAllMocks());

  it("puts the day first and spells the month out", () => {
    expect(dateTimeFormat("rw-RW", { day: "numeric", month: "long", year: "numeric", ...utc }).format(nov16)).toBe("16 Ugushyingo 2026");
    expect(dateTimeFormat("rw-RW", { day: "numeric", month: "short", year: "numeric", ...utc }).format(nov16)).toBe("16 ugu. 2026");
    expect(dateTimeFormat("rw-RW", { month: "long", year: "numeric", ...utc }).format(nov16)).toBe("Ugushyingo 2026");
  });

  it("names weekdays, including in the narrow form a calendar header asks for", () => {
    expect(dateTimeFormat("rw-RW", { weekday: "short", day: "numeric", month: "short", ...utc }).format(nov16)).toBe("mbe. 16 ugu.");
    expect(dateTimeFormat("rw-RW", { weekday: "long", ...utc }).format(nov16)).toBe("Kuwa mbere");
    expect(dateTimeFormat("rw-RW", { weekday: "narrow", ...utc }).format(nov16)).toBe("mbe.");
  });

  it("keeps times and drops English joining words", () => {
    expect(dateTimeFormat("rw-RW", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...utc }).format(nov16)).toBe("16 ugu., 10:32");
    expect(
      dateTimeFormat("rw-RW", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", ...utc }).format(nov16),
    ).not.toMatch(/\bat\b/);
  });

  it("formats ranges with the month named once when it is shared", () => {
    const f = dateTimeFormat("rw-RW", { day: "numeric", month: "short", year: "numeric", ...utc });
    expect(f.formatRange(nov16, new Date(Date.UTC(2026, 10, 19)))).toBe("16–19 ugu. 2026");
    expect(f.formatRange(nov16, new Date(Date.UTC(2026, 11, 2)))).toBe("16 ugu. – 2 uku. 2026");
  });

  it("never asks the runtime for Kinyarwanda data, which browsers do not ship", () => {
    const spy = vi.spyOn(Intl, "DateTimeFormat");
    formatDate("2026-11-16", "rw-RW");
    formatDateRange("2026-11-16", "2026-11-19", "rw-RW");
    formatMonthTitle("2026-11-01", "rw-RW");
    weekdayLabels("rw-RW");
    expect(spy.mock.calls.length).toBeGreaterThan(0);
    for (const [locale] of spy.mock.calls) expect(String(locale)).not.toMatch(/^rw/);
  });
});

describe("dateTimeFormat elsewhere", () => {
  it("is the runtime's own formatter for languages browsers carry", () => {
    for (const locale of ["en-US", "fr-FR", "sw-RW"]) {
      const o = { day: "numeric", month: "long", year: "numeric", ...utc } as const;
      expect(dateTimeFormat(locale, o).format(nov16)).toBe(new Intl.DateTimeFormat(locale, o).format(nov16));
    }
  });
});

describe("relativeTimeFormat in Kinyarwanda", () => {
  afterEach(() => vi.restoreAllMocks());

  it("says how long ago in Kinyarwanda, with the right noun for one and for many", () => {
    const f = relativeTimeFormat("rw-RW");
    expect(f.format(0, "second")).toBe("nonaha");
    expect(f.format(-1, "minute")).toBe("hashize umunota 1");
    expect(f.format(-5, "minute")).toBe("hashize iminota 5");
    expect(f.format(-1, "hour")).toBe("hashize isaha 1");
    expect(f.format(-3, "hour")).toBe("hashize amasaha 3");
    expect(f.format(-1, "day")).toBe("ejo hashize");
    expect(f.format(-4, "day")).toBe("hashize iminsi 4");
  });

  it("never asks the runtime for Kinyarwanda relative times", () => {
    const spy = vi.spyOn(Intl, "RelativeTimeFormat");
    relativeTimeFormat("rw-RW").format(-5, "minute");
    for (const [locale] of spy.mock.calls) expect(String(locale)).not.toMatch(/^rw/);
  });

  it("is the runtime's own formatter elsewhere", () => {
    expect(relativeTimeFormat("fr-FR").format(-1, "day")).toBe(new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" }).format(-1, "day"));
  });
});

describe("weekday headers in Swahili", () => {
  // CLDR's short Swahili weekday is the full name and its narrow form is the
  // English letters, so neither fits or reads in a calendar header.
  const monday = new Date(Date.UTC(2026, 10, 2));
  it("abbreviates a weekday that stands alone, in either form", () => {
    expect(dateTimeFormat("sw-RW", { weekday: "short", timeZone: "UTC" }).format(monday)).toBe("Jtt");
    expect(dateTimeFormat("sw-RW", { weekday: "narrow", timeZone: "UTC" }).format(monday)).toBe("Jtt");
    expect(weekdayLabels("sw-RW")).toEqual(["Jtt", "Jnn", "Jtn", "Alh", "Iju", "Jmo", "Jpi"]);
  });
  it("keeps the full name inside a date", () => {
    expect(dateTimeFormat("sw-RW", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(monday)).toContain("Jumatatu");
  });
});
