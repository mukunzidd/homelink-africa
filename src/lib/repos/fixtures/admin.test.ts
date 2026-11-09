import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { money } from "@/lib/domain/money";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { draftReducer, newDraft } from "@/lib/booking/draft";
import { quoteBooking } from "@/lib/domain/pricing";
import { DEFAULT_CATALOG } from "@/lib/domain/catalog";

const today = kigaliDay();

describe("admin: people", () => {
  beforeEach(() => resetStore());

  it("lists the team and the partners with their roles", async () => {
    const staff = await repos.admin.staff();
    expect(staff.some((s) => s.role === "admin" && s.status === "active")).toBe(true);
    expect(staff.some((s) => s.role === "ops")).toBe(true);
    expect(staff.some((s) => s.role === "driver")).toBe(true);
  });

  it("invites by email with a workspace role, once per address", async () => {
    const made = await repos.admin.invite("new.ops@homelink.rw", "ops", "admin");
    expect(made).toMatchObject({ email: "new.ops@homelink.rw", role: "ops", status: "invited" });
    await expect(repos.admin.invite("new.ops@homelink.rw", "ops", "admin")).rejects.toThrow();
    await expect(repos.admin.invite("not-an-email", "ops", "admin")).rejects.toThrow();
    await expect(repos.admin.invite("x@homelink.rw", "guest" as never, "admin")).rejects.toThrow();
  });

  it("refuses to demote or deactivate the last admin, and allows it once there is another", async () => {
    const admin = (await repos.admin.staff()).find((s) => s.role === "admin" && s.status === "active")!;
    await expect(repos.admin.setRole(admin.id, "ops", "admin")).rejects.toThrow();
    await expect(repos.admin.deactivate(admin.id, "admin")).rejects.toThrow();
    const ops = (await repos.admin.staff()).find((s) => s.role === "ops")!;
    await repos.admin.setRole(ops.id, "admin", "admin");
    await repos.admin.setRole(admin.id, "ops", "admin");
    expect((await repos.admin.staff()).find((s) => s.id === admin.id)?.role).toBe("ops");
  });
});

describe("admin: settings reach the price", () => {
  beforeEach(() => resetStore());

  it("charges an extra at the price set in settings, and refuses the old price", async () => {
    const catalog = structuredClone((await repos.admin.settings()).catalog);
    catalog.extras.airportPickup = { price: money(30_000, "RWF"), enabled: true };
    await repos.admin.updateSettings({ catalog }, "admin");
    const l = store().listings.find((x) => x.unitsAvailable === 1 && x.modes.includes("nightly"))!;
    let d = newDraft({ flow: "stay", slug: l.slug, start: addDays(today, 40), end: addDays(today, 43), party: 1 }, new Date());
    d = draftReducer(d, { type: "guest", value: { name: "Ange Uwase", email: "ange@example.rw", phone: "0788123456" } });
    d = draftReducer(d, { type: "extras", value: [{ key: "airportPickup", quantity: 1 }] });
    d = draftReducer(d, { type: "acceptRules", value: true });
    const input = { kind: "stay" as const, start: d.start, end: d.end, party: 1, extras: d.extras };
    const oldTotal = quoteBooking(l, input, today, DEFAULT_CATALOG)!.total;
    const newTotal = quoteBooking(l, input, today, catalog)!.total;
    expect(newTotal.minor - oldTotal.minor).toBe(5_000);
    expect(await repos.bookings.place({ draft: d, clientTotal: oldTotal, payment: { rail: "card", outcome: "approved" } })).toMatchObject({ ok: false, reason: "priceChanged" });
    expect(await repos.bookings.place({ draft: d, clientTotal: newTotal, payment: { rail: "card", outcome: "approved" } })).toMatchObject({ ok: true });
  });

  it("refuses a negative price, a promo over 90%, or a window over 60 days", async () => {
    const base = (await repos.admin.settings()).catalog;
    await expect(repos.admin.updateSettings({ catalog: { ...base, extras: { ...base.extras, cot: { price: money(-1, "RWF"), enabled: true } } } }, "admin")).rejects.toThrow();
    await expect(repos.admin.updateSettings({ catalog: { ...base, promos: { BIG: { percent: 95, capRwf: 1, validUntil: "2099-01-01" } } } }, "admin")).rejects.toThrow();
    await expect(repos.admin.updateSettings({ catalog: { ...base, windows: { stay: 61, car: 2, experience: 3 } } }, "admin")).rejects.toThrow();
  });

  it("shows display rates from settings", async () => {
    const fx = await repos.fx.rates();
    await repos.admin.updateSettings({ fxDisplay: { ...fx, USD: fx.USD * 1.01 } }, "admin");
    expect((await repos.fx.rates()).USD).toBeCloseTo(fx.USD * 1.01);
  });
});

describe("admin: content", () => {
  beforeEach(() => resetStore());

  it("shows an announcement only between its dates", async () => {
    await repos.admin.updateContent({ announcements: [{ id: "a1", text: "Office closed on the 1st", start: addDays(today, 1), end: addDays(today, 3) }] }, "admin");
    expect(await repos.admin.activeAnnouncements(today)).toEqual([]);
    expect((await repos.admin.activeAnnouncements(addDays(today, 2))).map((a) => a.id)).toEqual(["a1"]);
  });

  it("puts the chosen homes first on the landing page, in the chosen order", async () => {
    const [a, b] = (await repos.stays.list()).slice(-2);
    await repos.admin.updateContent({ featured: [b.id, a.id] }, "admin");
    expect((await repos.stays.featured(2)).map((x) => x.id)).toEqual([b.id, a.id]);
  });
});
