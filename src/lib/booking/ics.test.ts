import { describe, expect, it } from "vitest";
import { toIcs } from "./ics";

const e = {
  uid: "HL-4KQ2-8M@homelink.africa",
  title: "Garden apartment with hill view",
  start: "2026-12-01",
  end: "2026-12-05",
  location: "Kimihurura, Kigali",
  description: "Booking HL-4KQ2-8M; check-in from 14:00. A long line that goes on and on so that it must be folded, because the calendar format says lines stop at seventy-five octets.",
};

describe("toIcs", () => {
  const ics = toIcs(e);
  it("is a calendar with one all-day event", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261201");
    expect(ics).toContain("DTEND;VALUE=DATE:20261205");
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("escapes commas and semicolons", () => {
    expect(ics).toContain("LOCATION:Kimihurura\\, Kigali");
    expect(ics).toContain("HL-4KQ2-8M\; check-in");
  });
  it("uses CRLF and folds every line at 75 octets", () => {
    expect(ics.includes("\n") && !/[^\r]\n/.test(ics)).toBe(true);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
