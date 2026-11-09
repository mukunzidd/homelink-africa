import { describe, expect, it } from "vitest";
import type { Booking } from "@/lib/domain/types";
import { money } from "@/lib/domain/money";
import { kigaliDay } from "@/lib/domain/instants";
import { dayBoard, turnoverTasks } from "./day-board";

const b = (id: string, supply: string, start: string, end: string, status: Booking["status"] = "confirmed"): Booking => ({
  id, reference: id, service: "stay", supplyItemId: supply, title: id, startDate: start, endDate: end, party: 2,
  total: money(1, "RWF"), status, escrowHeld: false,
});

describe("dayBoard", () => {
  const list = [
    b("out", "flat", "2026-11-05", "2026-11-09"),
    b("in", "flat", "2026-11-09", "2026-11-12"),
    b("arrive", "house", "2026-11-09", "2026-11-10"),
    b("stay", "villa", "2026-11-07", "2026-11-11", "active"),
    b("gone", "studio", "2026-11-09", "2026-11-12", "cancelled"),
  ];
  const board = dayBoard(list, "2026-11-09");

  it("sorts the day into arrivals, departures and who is in", () => {
    expect(board.arrivals.map((x) => x.id).sort()).toEqual(["arrive", "in"]);
    expect(board.departures.map((x) => x.id)).toEqual(["out"]);
    expect(board.inHouse.map((x) => x.id)).toEqual(["stay"]);
  });
  it("pairs a departure and an arrival on one home as a turnover", () => {
    expect(board.turnovers).toEqual([{ listingId: "flat", out: list[0], in: list[1] }]);
  });
  it("leaves cancelled bookings off every list", () => {
    expect([...board.arrivals, ...board.departures, ...board.inHouse].some((x) => x.id === "gone")).toBe(false);
  });
  it("uses the Kigali day, so 22:30 UTC is already tomorrow's board", () => {
    expect(kigaliDay("2026-11-08T22:30:00Z")).toBe("2026-11-09");
  });
});

describe("turnoverTasks", () => {
  it("gives a cleaning window until the next check-in, or the end of the day", () => {
    const list = [b("out", "flat", "2026-11-05", "2026-11-09"), b("in", "flat", "2026-11-09", "2026-11-12"), b("solo", "house", "2026-11-01", "2026-11-09")];
    const tasks = turnoverTasks(list, "2026-11-09");
    expect(tasks.find((x) => x.listingId === "flat")).toMatchObject({ from: "11:00", until: "14:00", nextBookingId: "in" });
    expect(tasks.find((x) => x.listingId === "house")).toMatchObject({ until: "end of day" });
  });
});
