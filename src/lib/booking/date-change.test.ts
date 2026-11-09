import { describe, expect, it } from "vitest";
import { dateChange } from "./date-change";

const today = "2026-11-09";
const ahead = { status: "confirmed" as const, startDate: "2026-11-20", endDate: "2026-11-24" };
const during = { status: "active" as const, startDate: "2026-11-07", endDate: "2026-11-12" };

describe("dateChange", () => {
  it("moves a booking that is still ahead to any dates from today, checking the whole new stay", () => {
    expect(dateChange(ahead, "2026-11-10", "2026-11-13", today)).toEqual({ from: "2026-11-10", to: "2026-11-13" });
    expect(dateChange(ahead, "2026-11-08", "2026-11-13", today)).toBeNull();
  });

  it("lets a stay under way run longer, checking only the nights it adds", () => {
    expect(dateChange(during, "2026-11-07", "2026-11-16", today)).toEqual({ from: "2026-11-12", to: "2026-11-16" });
  });

  it("will not move the start of a stay under way, shorten it, or leave it unchanged", () => {
    expect(dateChange(during, "2026-11-09", "2026-11-16", today)).toBeNull();
    expect(dateChange(during, "2026-11-07", "2026-11-11", today)).toBeNull();
    expect(dateChange(during, "2026-11-07", "2026-11-12", today)).toBeNull();
  });

  it("refuses anything ended, cancelled, or not a date", () => {
    expect(dateChange({ ...during, status: "completed" }, "2026-11-07", "2026-11-16", today)).toBeNull();
    expect(dateChange({ ...ahead, status: "cancelled" }, "2026-11-20", "2026-11-25", today)).toBeNull();
    expect(dateChange(ahead, "soon", "2026-11-25", today)).toBeNull();
    expect(dateChange(ahead, "2026-11-25", "2026-11-20", today)).toBeNull();
  });
});
