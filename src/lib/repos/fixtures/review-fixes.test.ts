import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { draftReducer, newDraft, type BookingDraft } from "@/lib/booking/draft";
import { quoteBooking } from "@/lib/domain/pricing";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { money } from "@/lib/domain/money";
import type { Experience } from "@/lib/domain/types";

/**
 * Money and contract bugs found by the whole-branch review (2026-11-09),
 * one test each, written to fail on the code as it was.
 */

const today = kigaliDay();
const payment = { rail: "card" as const, outcome: "approved" as const };
const refunds = (bookingId: string) => store().payments.filter((p) => p.bookingId === bookingId && p.kind === "refund");

describe("cancel: only before it starts", () => {
  beforeEach(() => resetStore());

  it("refuses a booking that has ended, and pays nothing back", async () => {
    const done = store().bookings.find((b) => b.status === "completed")!;
    const before = refunds(done.id).length;
    await expect(repos.bookings.cancel(done.reference, "guest", "plansChanged", today)).rejects.toThrow();
    expect(done.status).toBe("completed");
    expect(refunds(done.id).length).toBe(before);
  });

  it("refuses a booking under way, so its nights are not freed mid-stay", async () => {
    const live = store().bookings.find((b) => b.status === "active")!;
    await expect(repos.bookings.cancel(live.reference, "guest", "plansChanged", today)).rejects.toThrow();
    expect(live.status).toBe("active");
  });

  it("still lets staff end one under way as a goodwill gesture", async () => {
    const live = store().bookings.find((b) => b.status === "active" && b.stayMode !== "lease")!;
    const c = await repos.bookings.cancel(live.reference, "admin", "goodwill", today, { goodwill: true });
    expect(c.status).toBe("cancelled");
  });
});

describe("changeDates", () => {
  beforeEach(() => resetStore());

  it("refuses a long-term renting, which is not priced by the night", async () => {
    const lease = store().bookings.find((b) => b.stayMode === "lease")!;
    lease.status = "confirmed";
    lease.startDate = addDays(today, 60);
    lease.endDate = addDays(today, 425);
    const total = lease.total;
    const r = await repos.bookings.changeDates(lease.reference, addDays(today, 70), addDays(today, 72), today, "admin");
    expect(r.ok).toBe(false);
    expect(lease.total).toEqual(total);
    expect(lease.lines?.some((l) => l.key === "deposit")).toBe(true);
  });

  it("keeps the home's minimum stay", async () => {
    const b = store().bookings.find((x) => x.service === "stay" && x.stayMode !== "lease" && x.status === "confirmed" && x.startDate > today)!;
    const home = store().listings.find((l) => l.id === b.supplyItemId)!;
    home.minNights = 3;
    const r = await repos.bookings.changeDates(b.reference, addDays(today, 90), addDays(today, 91), today);
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("a renting deposit goes back once", () => {
  beforeEach(() => resetStore());

  it("does not open a move-out after the deposit was already released", async () => {
    const lease = store().bookings.find((b) => b.stayMode === "lease" && b.status === "active" && !b.moveOut && b.lines?.some((l) => l.key === "deposit"))!;
    await repos.finance.releaseDeposit(lease.id, money(0, lease.total.currency), "", "admin");
    await expect(repos.bookings.startMoveOut(lease.reference, "admin", addDays(today, 10))).rejects.toThrow();
    expect(refunds(lease.id).length).toBe(1);
  });
});

describe("trips.place", () => {
  beforeEach(() => resetStore());

  it("adds only the guest's own bookings to the new trip", async () => {
    const theirs = store().bookings.find((b) => b.id.startsWith("bkg_hist_"))!;
    const before = theirs.tripId;
    const car = store().vehicles.find((v) => v.slug === "toyota-land-cruiser")!;
    let d = newDraft({ flow: "car", slug: car.slug, start: addDays(today, 50), end: addDays(today, 52), party: 1 }, new Date());
    d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
    d = draftReducer(d, { type: "driveMode", value: "withDriver" });
    d = draftReducer(d, { type: "acceptRules", value: true });
    const q = quoteBooking(car, { kind: "car", start: d.start, end: d.end, party: 1, driveMode: "withDriver" }, today)!;
    const { convert } = await import("@/lib/domain/money");
    const { FX_RATES } = await import("./data");
    const r = await repos.trips.place({ drafts: [d], clientTotal: convert(q.total, "RWF", FX_RATES), payment, bookedReferences: [theirs.reference] });
    expect(r.ok).toBe(true);
    expect(theirs.tripId).toBe(before);
    if (r.ok) expect(r.trip.bookingIds).not.toContain(theirs.id);
  });
});

describe("day outs are counted per departure", () => {
  beforeEach(() => resetStore());
  const walk = () => store().experiences.find((e) => (e.slots?.length ?? 0) > 1)!;

  function dayOut(e: Experience, date: string, slot: string, party: number): BookingDraft {
    let d = newDraft({ flow: "experience", slug: e.slug, start: date, end: date, party }, new Date());
    d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
    d = draftReducer(d, { type: "slot", value: slot });
    d = draftReducer(d, { type: "participants", value: Array.from({ length: party }, (_, i) => ({ name: `Person ${i + 1}`, age: 30, nationality: "RW", passport: `PC${1000000 + i}` })) });
    return draftReducer(d, { type: "acceptRules", value: true });
  }
  const book = (e: Experience, d: BookingDraft) =>
    repos.bookings.place({ draft: d, clientTotal: quoteBooking(e, { kind: "experience", start: d.start, end: d.start, party: d.party }, today)!.total, payment });

  it("takes the afternoon departure when the morning one is full", async () => {
    const e = walk();
    const date = addDays(today, 45);
    expect((await book(e, dayOut(e, date, e.slots![0], e.groupMax))).ok).toBe(true);
    const r = await book(e, dayOut(e, date, e.slots![1], 2));
    expect(r.ok).toBe(true);
  });

  it("refuses a departure time the day out does not have", async () => {
    const e = walk();
    const r = await book(e, dayOut(e, addDays(today, 46), "03:00", 2));
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("will not add guests past what is left on that departure", async () => {
    const e = walk();
    const date = addDays(today, 47);
    const first = await book(e, dayOut(e, date, e.slots![0], 2));
    expect((await book(e, dayOut(e, date, e.slots![0], e.groupMax - 2))).ok).toBe(true);
    if (!first.ok) throw new Error("setup");
    await expect(repos.bookings.addGuests(first.booking.reference, 3)).rejects.toThrow();
    expect(first.booking.party).toBe(2);
  });
});
