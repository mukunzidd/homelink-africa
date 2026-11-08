import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/domain/types";
import { nightsWithGuests } from "./guest-nights";

const b = (id: string, startDate: string, endDate: string, status: Booking["status"] = "confirmed", supplyItemId = "lst_a") =>
  ({ id, supplyItemId, startDate, endDate, status }) as Booking;

describe("nightsWithGuests", () => {
  it("lists every night in the range someone is staying, even with a unit free", () => {
    expect(nightsWithGuests([b("x", "2026-11-06", "2026-11-11", "active")], "lst_a", "2026-11-08", 5)).toEqual(["2026-11-08", "2026-11-09", "2026-11-10"]);
  });

  it("ignores cancelled bookings, other homes, and the checkout morning", () => {
    const list = [b("c", "2026-11-08", "2026-11-10", "cancelled"), b("o", "2026-11-08", "2026-11-10", "confirmed", "lst_b"), b("out", "2026-11-05", "2026-11-08")];
    expect(nightsWithGuests(list, "lst_a", "2026-11-08", 2)).toEqual([]);
  });
});
