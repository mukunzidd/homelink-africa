import { describe, expect, it } from "vitest";
import { formatAgo } from "./instants";

const now = new Date("2026-11-08T12:00:00Z");

describe("formatAgo", () => {
  it("says just now under a minute", () => {
    expect(formatAgo("2026-11-08T11:59:30Z", now, "en-US")).toBe("now");
  });
  it("counts minutes, then hours", () => {
    expect(formatAgo("2026-11-08T11:48:00Z", now, "en-US")).toBe("12 minutes ago");
    expect(formatAgo("2026-11-08T07:00:00Z", now, "en-US")).toBe("5 hours ago");
  });
  it("says yesterday by the Kigali day, not by 24 hours", () => {
    // 21:30 UTC on the 7th is 23:30 in Kigali: yesterday, though only 14.5h ago.
    expect(formatAgo("2026-11-07T21:30:00Z", now, "en-US")).toBe("yesterday");
  });
  it("gives a date after a week", () => {
    expect(formatAgo("2026-10-20T10:00:00Z", now, "en-US")).toMatch(/Oct 20/);
  });
});
