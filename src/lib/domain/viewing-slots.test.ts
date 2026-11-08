import { describe, expect, it } from "vitest";
import { viewingSlots } from "./viewing-slots";

// 2026-11-09 is a Monday; 2026-11-15 a Sunday.
describe("viewingSlots", () => {
  it("offers eight hourly starts on a weekday, 09:00 to 16:00", () => {
    const days = viewingSlots("2026-11-09", 1, []);
    expect(days[0].times).toEqual(["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"]);
  });

  it("offers nothing on a Sunday", () => {
    const days = viewingSlots("2026-11-09", 7, []);
    expect(days.map((d) => d.date)).not.toContain("2026-11-15");
    expect(days).toHaveLength(6);
  });

  it("takes out a slot someone already has", () => {
    const days = viewingSlots("2026-11-09", 1, [{ date: "2026-11-09", time: "10:00" }]);
    expect(days[0].times).not.toContain("10:00");
    expect(days[0].times).toHaveLength(7);
  });

  it("leaves out a day with nothing left", () => {
    const all = ["09", "10", "11", "12", "13", "14", "15", "16"].map((h) => ({ date: "2026-11-09", time: `${h}:00` }));
    expect(viewingSlots("2026-11-09", 2, all).map((d) => d.date)).toEqual(["2026-11-10"]);
  });
});
