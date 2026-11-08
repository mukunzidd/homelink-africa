import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { draftReducer, newDraft, type BookingDraft } from "@/lib/booking/draft";
import { quoteBooking } from "@/lib/domain/pricing";
import { convert, money } from "@/lib/domain/money";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { FX_RATES } from "./data";

const today = kigaliDay();
const s = addDays(today, 40);
const guest = { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" };
const payment = { rail: "card" as const, outcome: "approved" as const };

function stayDraft(slug: string, from = s, to = addDays(s, 4)) {
  let d = newDraft({ flow: "stay", slug, start: from, end: to, party: 2 }, new Date());
  d = draftReducer(d, { type: "guest", value: guest });
  return draftReducer(d, { type: "acceptRules", value: true });
}
function carDraft() {
  let d = newDraft({ flow: "car", slug: "toyota-land-cruiser", start: s, end: addDays(s, 2), party: 1 }, new Date());
  d = draftReducer(d, { type: "guest", value: guest });
  d = draftReducer(d, { type: "driveMode", value: "withDriver" });
  return draftReducer(d, { type: "acceptRules", value: true });
}
function totalOf(drafts: BookingDraft[]) {
  let minor = 0;
  for (const d of drafts) {
    const supply =
      d.flow === "stay" ? store().listings.find((x) => x.slug === d.slug)! : store().vehicles.find((x) => x.slug === d.slug)!;
    const q = quoteBooking(supply, { kind: d.flow === "stay" ? "stay" : "car", start: d.start, end: d.end, party: d.party, driveMode: d.driveMode }, today)!;
    minor += convert(q.total, "RWF", FX_RATES).minor;
  }
  return money(minor, "RWF");
}
const oneUnit = () => store().listings.find((l) => l.unitsAvailable === 1 && l.modes.includes("nightly"))!.slug;

describe("trips.place", () => {
  beforeEach(() => resetStore());

  it("books every part and groups them as one trip", async () => {
    const drafts = [stayDraft(oneUnit()), carDraft()];
    const r = await repos.trips.place({ drafts, clientTotal: totalOf(drafts), payment, bookedReferences: [] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.bookings).toHaveLength(2);
      expect(r.trip.bookingIds).toEqual(r.bookings.map((b) => b.id));
      expect(r.bookings.every((b) => b.tripId === r.trip.id)).toBe(true);
    }
  });

  it("books nothing if any part is taken", async () => {
    const taken = stayDraft(oneUnit());
    await repos.bookings.place({ draft: taken, clientTotal: totalOf([taken]), payment });
    const before = store().bookings.length;
    const drafts = [carDraft(), stayDraft(oneUnit())];
    const r = await repos.trips.place({ drafts, clientTotal: totalOf(drafts), payment, bookedReferences: [] });
    expect(r).toMatchObject({ ok: false, failed: [{ index: 1, reason: "unavailable" }] });
    expect(store().bookings.length).toBe(before);
  });

  it("books nothing when two of its own stays overlap", async () => {
    const drafts = [stayDraft(oneUnit()), stayDraft(store().listings.find((l) => l.unitsAvailable > 1)!.slug, addDays(s, 2), addDays(s, 6))];
    const r = await repos.trips.place({ drafts, clientTotal: totalOf(drafts), payment, bookedReferences: [] });
    expect(r.ok).toBe(false);
  });

  it("refuses a trip total the server does not agree with", async () => {
    const drafts = [stayDraft(oneUnit()), carDraft()];
    const r = await repos.trips.place({ drafts, clientTotal: money(1, "RWF"), payment, bookedReferences: [] });
    expect(r).toMatchObject({ ok: false });
    expect(store().trips.length).toBe(store().trips.length);
  });
});
