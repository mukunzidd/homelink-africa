import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/domain/types";
import { money } from "@/lib/domain/money";
import { occupancy, placedOn, revenue, weeklySeries } from "./metrics";

const FX = { RWF: 1, USD: 0.00077, EUR: 0.0007, GBP: 0.0006 } as const;
const stay = (id: string, startDate: string, endDate: string, o: Partial<Booking> = {}) =>
  ({
    id, supplyItemId: "lst_a", service: "stay", startDate, endDate, status: "confirmed", total: money(100_000, "RWF"),
    timeline: [{ at: `${startDate}T08:00:00.000Z`, kind: "placed", actor: "guest" }], ...o,
  }) as Booking;

describe("occupancy", () => {
  it("counts only the nights of a stay inside the range", () => {
    // 10 nights in range (1st to 11th); the stay covers the 9th and 10th only.
    expect(occupancy([stay("a", "2026-11-09", "2026-11-14")], "lst_a", "2026-11-01", "2026-11-11")).toBeCloseTo(0.2);
  });
  it("gives a cancelled stay nothing", () => {
    expect(occupancy([stay("a", "2026-11-01", "2026-11-11", { status: "cancelled" })], "lst_a", "2026-11-01", "2026-11-11")).toBe(0);
  });
  it("is 1 when every night is booked, and never more", () => {
    const both = [stay("a", "2026-11-01", "2026-11-06"), stay("b", "2026-10-20", "2026-11-11")];
    expect(occupancy(both, "lst_a", "2026-11-01", "2026-11-11")).toBe(1);
  });
});

describe("revenue", () => {
  it("adds bookings placed in the range, less what was refunded, in the currency asked", () => {
    const list = [
      stay("a", "2026-11-03", "2026-11-05"),
      stay("b", "2026-11-04", "2026-11-06", { refund: money(40_000, "RWF") }),
      stay("c", "2026-10-03", "2026-10-05"),
    ];
    expect(revenue(list, "2026-11-01", "2026-12-01", "RWF", FX)).toEqual(money(160_000, "RWF"));
  });
});

describe("weeklySeries", () => {
  it("counts bookings placed in each of the last weeks, oldest first, ending with this week", () => {
    const list = [stay("a", "2026-11-08", "2026-11-09"), stay("b", "2026-11-03", "2026-11-04"), stay("c", "2026-10-30", "2026-10-31")];
    expect(weeklySeries(list, 3, "2026-11-08")).toEqual([0, 1, 2]);
  });
  it("uses the placed event when there is one", () => {
    expect(placedOn(stay("a", "2026-12-01", "2026-12-02", { timeline: [{ at: "2026-11-02T10:00:00.000Z", kind: "placed", actor: "guest" }] }))).toBe("2026-11-02");
  });
});
