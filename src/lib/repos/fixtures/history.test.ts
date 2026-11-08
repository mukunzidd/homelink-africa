import { beforeEach, describe, expect, it } from "vitest";
import { resetStore, store } from "./store";
import { kigaliDay } from "@/lib/domain/instants";
import { weeklySeries } from "@/lib/workspace/metrics";

const today = kigaliDay();

describe("seeded booking history", () => {
  beforeEach(() => resetStore());

  it("gives every one of the last twelve weeks some bookings, so the overview has a shape", () => {
    const weeks = weeklySeries(store().bookings, 12, today);
    expect(weeks.every((n) => n > 0)).toBe(true);
  });

  it("never puts more guests in a home on a night than it has units", () => {
    const s = store();
    for (const l of s.listings) {
      const mine = s.bookings.filter((b) => b.supplyItemId === l.id && b.status !== "cancelled" && b.service === "stay");
      for (const b of mine) {
        for (let d = b.startDate; d < b.endDate; d = new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10)) {
          const n = mine.filter((x) => x.startDate <= d && d < x.endDate).length;
          expect(n, `${l.id} on ${d}`).toBeLessThanOrEqual(l.unitsAvailable);
        }
      }
    }
  });

  it("gives every booking a unique reference", () => {
    const refs = store().bookings.map((b) => b.reference);
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe("the preview guest's own bookings", () => {
  beforeEach(() => resetStore());

  it("leaves out bookings seeded for other guests", async () => {
    const { fixtureRepositories: repos } = await import("@/lib/repos/fixtures");
    const mine = await repos.bookings.listForCurrentUser();
    expect(mine.some((b) => b.id.startsWith("bkg_hist_"))).toBe(false);
    expect(mine.map((b) => b.guest?.name)).not.toContain("Tomás Herrera");
    expect(mine.some((b) => b.id === "bkg_phase_during")).toBe(true);
  });
});
