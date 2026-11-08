import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { draftReducer, newDraft, type BookingDraft } from "@/lib/booking/draft";
import { quoteBooking } from "@/lib/domain/pricing";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import type { ExtraKey } from "@/lib/domain/types";

const payment = { rail: "card" as const, outcome: "approved" as const };
const today = kigaliDay();
const start = addDays(today, 30);
const end = addDays(today, 34);

/** A one-unit flat, so a second overlapping booking has nowhere to go. */
function oneUnitSlug(): string {
  const l = store().listings.find((x) => x.unitsAvailable === 1 && x.modes.includes("nightly"))!;
  return l.slug;
}

function readyDraft(slug: string, from = start, to = end, extras: { key: ExtraKey; quantity: number }[] = []): BookingDraft {
  let d = newDraft({ flow: "stay", slug, start: from, end: to, party: 2 }, new Date());
  d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
  d = draftReducer(d, { type: "extras", value: extras });
  d = draftReducer(d, { type: "acceptRules", value: true });
  return d;
}

function serverTotal(d: BookingDraft) {
  const l = store().listings.find((x) => x.slug === d.slug)!;
  return quoteBooking(l, { kind: "stay", start: d.start, end: d.end, party: d.party, extras: d.extras, promoCode: d.promoCode }, today)!.total;
}

describe("bookings.place", () => {
  beforeEach(() => resetStore());

  it("stores the server's price, not the client's", async () => {
    const d = readyDraft(oneUnitSlug());
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.booking.total).toEqual(serverTotal(d));
      expect(r.booking.status).toBe("confirmed");
      expect(r.booking.reference).toMatch(/^HL-[A-Z0-9]{4}-[A-Z0-9]{2}$/);
    }
  });

  it("refuses a total the server does not agree with, and stores nothing", async () => {
    const before = (await repos.bookings.listAll()).length;
    const d = readyDraft(oneUnitSlug());
    const r = await repos.bookings.place({ draft: d, clientTotal: { ...serverTotal(d), minor: 1 }, payment });
    expect(r).toMatchObject({ ok: false, reason: "priceChanged" });
    expect((await repos.bookings.listAll()).length).toBe(before);
  });

  it("drops extras that are not on the menu before pricing", async () => {
    const d = readyDraft(oneUnitSlug(), start, end, [{ key: "jacuzzi" as ExtraKey, quantity: 1 }, { key: "groceries", quantity: 1 }]);
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    expect(r.ok && r.booking.lines?.map((l) => l.extra).filter(Boolean)).toEqual(["groceries"]);
  });

  it("refuses the second of two overlapping bookings on a one-unit flat", async () => {
    const slug = oneUnitSlug();
    const a = readyDraft(slug);
    expect((await repos.bookings.place({ draft: a, clientTotal: serverTotal(a), payment })).ok).toBe(true);
    const b = readyDraft(slug, addDays(start, 2), addDays(end, 2));
    expect(await repos.bookings.place({ draft: b, clientTotal: serverTotal(b), payment })).toMatchObject({
      ok: false,
      reason: "unavailable",
    });
  });

  it("lets two bookings share a changeover day", async () => {
    const slug = oneUnitSlug();
    const a = readyDraft(slug);
    const b = readyDraft(slug, end, addDays(end, 3));
    expect((await repos.bookings.place({ draft: a, clientTotal: serverTotal(a), payment })).ok).toBe(true);
    expect((await repos.bookings.place({ draft: b, clientTotal: serverTotal(b), payment })).ok).toBe(true);
  });

  it("refuses a draft with a step left undone", async () => {
    const d = { ...readyDraft(oneUnitSlug()), acceptedRules: false };
    expect(await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment })).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("refuses dates in the past", async () => {
    const d = readyDraft(oneUnitSlug(), addDays(today, -3), addDays(today, -1));
    expect(await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment })).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("refuses blocked maintenance nights", async () => {
    const block = store().blocks[0];
    const l = store().listings.find((x) => x.id === block.supplyId)!;
    const d = readyDraft(l.slug, block.date, addDays(block.date, 1));
    expect(await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment })).toMatchObject({ ok: false, reason: "unavailable" });
  });

  it("tells the guest and the desk", async () => {
    const d = readyDraft(oneUnitSlug());
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    if (!r.ok) throw new Error("expected ok");
    const guest = await repos.notifications.forRole("guest");
    const ops = await repos.notifications.forRole("ops");
    expect(guest.some((n) => n.kind === "bookingConfirmed" && n.params.ref === r.booking.reference)).toBe(true);
    expect(ops.some((n) => n.kind === "newBooking" && n.params.ref === r.booking.reference)).toBe(true);
  });

  it("records the payment and a timeline", async () => {
    const d = readyDraft(oneUnitSlug());
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    if (!r.ok) throw new Error("expected ok");
    const pays = await repos.bookings.payments(r.booking.id);
    expect(pays).toHaveLength(1);
    expect(pays[0]).toMatchObject({ kind: "full", status: "succeeded", amount: r.booking.total });
    expect(r.booking.timeline?.map((e) => e.kind)).toEqual(["placed", "paid"]);
  });
});

describe("bookings.cancel and changeDates", () => {
  beforeEach(() => resetStore());

  it("cancels with the policy's refund and frees the nights", async () => {
    const slug = oneUnitSlug();
    const d = readyDraft(slug);
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    if (!r.ok) throw new Error("expected ok");
    const cancelled = await repos.bookings.cancel(r.booking.reference, "guest", "plansChanged", today);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.refund).toEqual(r.booking.total); // 30 days out: full
    const again = readyDraft(slug);
    expect((await repos.bookings.place({ draft: again, clientTotal: serverTotal(again), payment })).ok).toBe(true);
  });

  it("moves a stay and says what it costs", async () => {
    const d = readyDraft(oneUnitSlug());
    const r = await repos.bookings.place({ draft: d, clientTotal: serverTotal(d), payment });
    if (!r.ok) throw new Error("expected ok");
    const moved = await repos.bookings.changeDates(r.booking.reference, start, addDays(end, 1), today);
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.difference.minor).toBeGreaterThan(0);
      expect(moved.booking.endDate).toBe(addDays(end, 1));
    }
  });
});

describe("bookings.cancel: permits", () => {
  beforeEach(() => resetStore());

  it("keeps every person's permit on a cancelled gorilla trek", async () => {
    const trek = store().experiences.find((e) => e.requiresPermit)!;
    let d = newDraft({ flow: "experience", slug: trek.slug, start: addDays(today, 20), end: addDays(today, 20), party: 2 }, new Date());
    d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
    d = draftReducer(d, { type: "slot", value: trek.slots![0] });
    d = draftReducer(d, {
      type: "participants",
      value: [
        { name: "Ange Uwase", age: 30, nationality: "RW", passport: "PC1234567" },
        { name: "Jean Mugabo", age: 32, nationality: "RW", passport: "PC7654321" },
      ],
    });
    d = draftReducer(d, { type: "acceptRules", value: true });
    const total = quoteBooking(trek, { kind: "experience", start: d.start, end: d.start, party: 2 }, today)!.total;
    const r = await repos.bookings.place({ draft: d, clientTotal: total, payment });
    if (!r.ok) throw new Error(`expected ok, got ${r.reason}`);
    const c = await repos.bookings.cancel(r.booking.reference, "guest", "plansChanged", today);
    expect(c.refund!.minor).toBe(total.minor - trek.permitShare!.minor * 2);
  });
});

describe("bookings.place: renting terms are the server's to decide", () => {
  beforeEach(() => resetStore());
  const home = () => store().listings.find((l) => l.monthlyRate && l.leaseTerms)!;
  const firstFree = () => {
    const from = home().leaseTerms!.availableFrom;
    const first = `${from.slice(0, 7)}-01`;
    const next = addDays(first, 32).slice(0, 7) + "-01";
    return from === first ? first : next;
  };
  function rentDraft(start: string, end: string, months = 12) {
    let d = newDraft({ flow: "rent", slug: home().slug, start, end, party: 1 }, new Date());
    d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
    d = draftReducer(d, { type: "application", value: { occupants: 1, employer: "UR", incomeBand: "1mTo2m", moveIn: start, months } });
    d = draftReducer(d, { type: "acceptRules", value: true });
    d = draftReducer(d, { type: "sign", signedName: "Ange Uwase", at: new Date().toISOString() });
    return d;
  }
  const total = (months: number) => ({ ...home().monthlyRate!, minor: home().monthlyRate!.minor * (1 + home().leaseTerms!.depositMonths) });
  const addMonthsIso = (d: string, m: number) => {
    const [y, mo] = d.split("-").map(Number);
    const n = y * 12 + (mo - 1) + m;
    return `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, "0")}-01`;
  };

  it("takes a 12-month term starting on the 1st of a free month", async () => {
    const s = firstFree();
    expect((await repos.bookings.place({ draft: rentDraft(s, addMonthsIso(s, 12)), clientTotal: total(12), payment })).ok).toBe(true);
  });

  it("refuses a term that is not 12 or 24 months", async () => {
    const s = firstFree();
    const r = await repos.bookings.place({ draft: rentDraft(s, addMonthsIso(s, 3), 3), clientTotal: total(3), payment });
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("refuses a move-in that is not the 1st, or before the home is free", async () => {
    const s = firstFree();
    const mid = addDays(s, 9);
    expect(await repos.bookings.place({ draft: rentDraft(mid, addDays(mid, 365)), clientTotal: total(12), payment })).toMatchObject({ ok: false, reason: "invalid" });
    const early = addMonthsIso(s, -1) < kigaliDay() ? null : addMonthsIso(s, -1);
    if (early && early < home().leaseTerms!.availableFrom) {
      expect(await repos.bookings.place({ draft: rentDraft(early, addMonthsIso(early, 12)), clientTotal: total(12), payment })).toMatchObject({ ok: false, reason: "invalid" });
    }
  });

  it("refuses an application that disagrees with the dates", async () => {
    const s = firstFree();
    const d = rentDraft(s, addMonthsIso(s, 12), 24);
    expect(await repos.bookings.place({ draft: d, clientTotal: total(12), payment })).toMatchObject({ ok: false, reason: "invalid" });
  });
});
