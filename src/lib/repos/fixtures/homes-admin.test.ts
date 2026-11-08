import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { money } from "@/lib/domain/money";
import { addDays, monthsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { rentSchedule } from "@/lib/workspace/schedules";

const today = kigaliDay();
const lease = () => store().bookings.find((b) => b.id === "bkg_phase_leaseActive")!;
const rentOf = () => lease().lines!.find((l) => l.key === "rent")!.amount;
const schedule = async () => rentSchedule(lease().startDate, monthsBetween(lease().startDate, lease().endDate), rentOf(), await repos.bookings.payments(lease().id), today);

describe("tenants", () => {
  beforeEach(() => resetStore());

  it("records rent received by bank transfer, which pays the overdue month", async () => {
    expect((await schedule()).some((i) => i.status === "overdue")).toBe(true);
    const p = await repos.bookings.recordRentPayment(lease().reference, "admin", rentOf());
    expect(p).toMatchObject({ kind: "rent", rail: "bankTransfer", status: "succeeded", amount: rentOf() });
    expect((await schedule()).some((i) => i.status === "overdue")).toBe(false);
    expect(store().audit.at(-1)).toMatchObject({ action: "rent.received", target: lease().id });
  });

  it("refuses rent on a booking that is not a renting, or an amount that is not rent", async () => {
    const nightly = store().bookings.find((b) => b.stayMode !== "lease" && b.status === "confirmed")!;
    await expect(repos.bookings.recordRentPayment(nightly.reference, "admin", rentOf())).rejects.toThrow();
    await expect(repos.bookings.recordRentPayment(lease().reference, "admin", money(0, rentOf().currency))).rejects.toThrow();
    await expect(repos.bookings.recordRentPayment(lease().reference, "admin", money(rentOf().minor, "USD"))).rejects.toThrow();
  });

  it("starts a move-out: books the inspection and holds the deposit to return", async () => {
    const date = addDays(today, 10);
    const b = await repos.bookings.startMoveOut(lease().reference, "admin", date);
    expect(b.moveOut).toMatchObject({ date, status: "scheduled" });
    const task = store().verificationQueue.find((v) => v.id === b.moveOut!.taskId)!;
    expect(task).toMatchObject({ kind: "reinspection", scheduledFor: date, status: "scheduled" });
    await expect(repos.bookings.startMoveOut(lease().reference, "admin", date)).rejects.toThrow();
  });

  it("returns the deposit once, after the move-out is booked", async () => {
    await expect(repos.bookings.returnDeposit(lease().reference, "admin")).rejects.toThrow();
    await repos.bookings.startMoveOut(lease().reference, "admin", addDays(today, 10));
    const b = await repos.bookings.returnDeposit(lease().reference, "admin");
    expect(b.moveOut!.status).toBe("returned");
    const refund = (await repos.bookings.payments(b.id)).find((p) => p.kind === "refund")!;
    expect(refund.amount).toEqual(b.moveOut!.deposit);
    await expect(repos.bookings.returnDeposit(lease().reference, "admin")).rejects.toThrow();
  });
});

describe("homes for sale", () => {
  beforeEach(() => resetStore());

  it("updates the price and the status, and a sold home leaves the public list", async () => {
    const id = "sale_gacuriro_house";
    await repos.sales.update(id, { price: money(400_000_000, "RWF"), saleStatus: "underOffer" });
    expect((await repos.sales.byId(id))).toMatchObject({ saleStatus: "underOffer", price: money(400_000_000, "RWF") });
    expect((await repos.sales.list()).some((h) => h.id === id)).toBe(true);
    await repos.sales.update(id, { saleStatus: "sold" });
    expect((await repos.sales.list()).some((h) => h.id === id)).toBe(false);
  });

  it("refuses a price of nothing or a status that does not exist", async () => {
    await expect(repos.sales.update("sale_gacuriro_house", { price: money(0, "RWF") })).rejects.toThrow();
    await expect(repos.sales.update("sale_gacuriro_house", { saleStatus: "gone" as never })).rejects.toThrow();
  });
});

describe("partners", () => {
  beforeEach(() => resetStore());

  it("lists the drivers and guides, each with what they drive or lead", async () => {
    const all = await repos.partners.list();
    expect(all.filter((p) => p.role === "driver").length).toBeGreaterThanOrEqual(2);
    expect(all.filter((p) => p.role === "guide").length).toBeGreaterThanOrEqual(2);
    const eric = all.find((p) => p.name.startsWith("Eric"))!;
    expect(eric.supplyIds).toContain("veh_rav4");
    expect((await repos.partners.byId(eric.id))?.name).toBe(eric.name);
  });

  it("gives documents soonest to expire first", async () => {
    const eric = (await repos.partners.list()).find((p) => p.name.startsWith("Eric"))!;
    const docs = await repos.partners.documents(eric.id);
    expect(docs.map((d) => d.expires)).toEqual([...docs.map((d) => d.expires)].sort());
  });

  it("assigns an upcoming job in the partner's lane, and refuses one outside it", async () => {
    const all = await repos.partners.list();
    const driver = all.find((p) => p.role === "driver")!;
    const guide = all.find((p) => p.role === "guide")!;
    const open = await repos.partners.jobs({ unassigned: true, role: "driver" });
    expect(open.length).toBeGreaterThan(0);
    const job = open[0];
    await repos.partners.assign(job.bookingId, driver.id, "admin");
    expect((await repos.partners.jobs({ partnerId: driver.id })).some((j) => j.bookingId === job.bookingId)).toBe(true);
    const another = (await repos.partners.jobs({ unassigned: true, role: "driver" }))[0];
    if (another) await expect(repos.partners.assign(another.bookingId, guide.id, "admin")).rejects.toThrow();
  });
});

describe("the preview guest's own viewings", () => {
  beforeEach(() => resetStore());
  it("leaves out viewings seeded for other people, but keeps hers", async () => {
    const mine = await repos.viewings.forCurrentUser();
    expect(mine.map((v) => v.contact.name)).not.toContain("Jonas Becker");
    expect(mine.some((v) => v.id === "vwg_001")).toBe(true);
    expect((await repos.viewings.all()).length).toBe(3);
  });
});
