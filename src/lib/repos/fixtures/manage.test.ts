import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { kigaliDay } from "@/lib/domain/instants";
import { addDays } from "@/lib/domain/dates";

const today = kigaliDay();
const phase = (p: "soon" | "released" | "during" | "ended") =>
  store().bookings.find((b) => b.id === `bkg_phase_${p}`)!;

describe("seeded booking phases", () => {
  beforeEach(() => resetStore());
  it("has a guest booking in every phase, relative to today", () => {
    expect(phase("soon").startDate).toBe(addDays(today, 5));
    expect(phase("released").startDate).toBe(addDays(today, 1));
    expect(phase("during").startDate < today && today < phase("during").endDate).toBe(true);
    expect(phase("ended").endDate).toBe(addDays(today, -3));
  });
});

describe("addGuests", () => {
  beforeEach(() => resetStore());
  it("refuses more people than the home sleeps", async () => {
    const b = phase("soon");
    const sleeps = store().listings.find((l) => l.id === b.supplyItemId)!.sleeps;
    await expect(repos.bookings.addGuests(b.reference, sleeps + 1)).rejects.toThrow();
    expect((await repos.bookings.addGuests(b.reference, sleeps)).party).toBe(sleeps);
  });
});

describe("incidents", () => {
  beforeEach(() => resetStore());
  it("files an incident on the booking and tells the desk", async () => {
    const b = phase("during");
    const i = await repos.incidents.create({ bookingId: b.id, category: "water", urgency: "now", description: "No water since 7am" });
    expect(i.status).toBe("open");
    expect((await repos.incidents.forBooking(b.id)).map((x) => x.id)).toContain(i.id);
    expect((await repos.notifications.forRole("ops")).some((n) => n.kind === "newIncident")).toBe(true);
    expect((await repos.bookings.byId(b.id))!.timeline!.at(-1)!.kind).toBe("issueReported");
  });
});

describe("reviews", () => {
  beforeEach(() => resetStore());
  it("takes one review per booking, after the stay", async () => {
    const ended = phase("ended");
    const r = { cleanliness: 5, accuracy: 5, checkIn: 4, communication: 5, location: 4, value: 4 } as const;
    await repos.reviews.create({ bookingId: ended.id, ratings: r, text: "Quiet and exactly as shown." });
    await expect(repos.reviews.create({ bookingId: ended.id, ratings: r, text: "Again" })).rejects.toThrow();
    await expect(repos.reviews.create({ bookingId: phase("soon").id, ratings: r, text: "Too early" })).rejects.toThrow();
    expect((await repos.reviews.forSupply(ended.supplyItemId)).length).toBeGreaterThan(0);
  });
});

describe("addGuests: priced and only before it starts", () => {
  beforeEach(() => resetStore());
  it("charges for the extra seats on a day out", async () => {
    const walk = store().experiences.find((e) => e.slug === "kigali-city-walk")!;
    const b = store().bookings.find((x) => x.supplyItemId === walk.id && x.status === "confirmed")!;
    b.startDate = b.endDate = addDays(today, 10);
    const before = b.total.minor;
    const after = await repos.bookings.addGuests(b.reference, b.party + 1);
    expect(after.total.minor).toBeGreaterThan(before);
    expect((await repos.bookings.payments(b.id)).some((p) => p.kind === "change")).toBe(true);
  });
  it("refuses once the stay has started or is over", async () => {
    await expect(repos.bookings.addGuests(phase("during").reference, 2)).rejects.toThrow();
    await expect(repos.bookings.addGuests(phase("ended").reference, 2)).rejects.toThrow();
  });
});
