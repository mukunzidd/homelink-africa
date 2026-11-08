import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { kigaliDay } from "@/lib/domain/instants";
import { addDays } from "@/lib/domain/dates";
import { CHECKLIST } from "@/lib/workspace/inspection";

const today = kigaliDay();

describe("ops.quoteAsk", () => {
  beforeEach(() => resetStore());

  it("prices the ask and tells the guest in the booking's thread", async () => {
    const ask = store().addOnRequests.find((a) => a.status === "open")!;
    const updated = await repos.ops.quoteAsk(ask.id, "ops", { minor: 180_000, currency: "RWF" }, "Driver and car for the week");
    expect(updated).toMatchObject({ status: "quoted", quote: { minor: 180_000, currency: "RWF" } });
    const thread = await repos.messaging.forBooking(ask.bookingId, "guest");
    expect(thread).not.toBeNull();
    // Found by content: fixture messages carry their own (sometimes later) times.
    const quote = (await repos.messaging.messages(thread!.id)).find((m) => m.body.includes("180,000"));
    expect(quote).toMatchObject({ authorRole: "ops" });
    expect(quote!.body).toContain("Driver and car for the week");
    expect(store().audit.at(-1)).toMatchObject({ action: "ask.quote", target: ask.id });
  });

  it("refuses nothing, or a fraction of a franc", async () => {
    const ask = store().addOnRequests.find((a) => a.status === "open")!;
    await expect(repos.ops.quoteAsk(ask.id, "ops", { minor: 0, currency: "RWF" }, "")).rejects.toThrow();
  });
});

describe("ops.updateAsk", () => {
  beforeEach(() => resetStore());
  it("assigns an owner and moves the status, with an audit line", async () => {
    const ask = store().addOnRequests[0];
    const r = await repos.ops.updateAsk(ask.id, "ops", { owner: "Patrick N.", status: "arranged" });
    expect(r).toMatchObject({ owner: "Patrick N.", status: "arranged" });
    expect(store().audit.at(-1)).toMatchObject({ actor: "ops", action: "ask.update", target: ask.id });
  });
  it("only assigns people on the team", async () => {
    const ask = store().addOnRequests[0];
    await expect(repos.ops.updateAsk(ask.id, "ops", { owner: "Someone Else" })).rejects.toThrow();
  });
});

describe("inspections", () => {
  beforeEach(() => resetStore());

  it("schedules a requested candidate on a date not in the past, with an inspector", async () => {
    const t = store().verificationQueue.find((x) => x.status === "requested")!;
    expect(await repos.ops.scheduleInspection(t.id, "ops", addDays(today, -1), "Aline M.", today)).toEqual({ ok: false, reason: "invalid" });
    expect(await repos.ops.scheduleInspection(t.id, "ops", addDays(today, 3), "", today)).toEqual({ ok: false, reason: "invalid" });
    expect(await repos.ops.scheduleInspection(t.id, "ops", addDays(today, 3), "Aline M.", today)).toEqual({ ok: true });
    expect(store().verificationQueue.find((x) => x.id === t.id)).toMatchObject({ status: "scheduled", scheduledFor: addDays(today, 3), inspectorName: "Aline M." });
  });

  it("records the checklist against the lane's own points, ignoring keys it does not have", async () => {
    const t = store().verificationQueue.find((x) => x.status === "scheduled" && x.service === "stay")!;
    const points = Object.fromEntries(CHECKLIST.stay.map((k, i) => [k, i % 2 === 0]));
    await repos.ops.recordInspection(t.id, "ops", { ...points, madeUp: true }, "Generator switch-over is slow");
    const after = store().verificationQueue.find((x) => x.id === t.id)!;
    expect(after.status).toBe("inspected");
    expect(Object.keys(after.checklist!)).toEqual(CHECKLIST.stay);
    expect(after.inspectionNotes).toBe("Generator switch-over is slow");
  });

  it("will not record an inspection that was never scheduled", async () => {
    const t = store().verificationQueue.find((x) => x.status === "requested")!;
    await expect(repos.ops.recordInspection(t.id, "ops", {}, "")).rejects.toThrow();
  });

  it("publishes only what was inspected, and a new candidate leaves a draft for admin", async () => {
    const requested = store().verificationQueue.find((x) => x.status === "requested")!;
    expect(await repos.ops.publishInspection(requested.id, "admin")).toEqual({ ok: false, reason: "notInspected" });
    const inspected = store().verificationQueue.find((x) => x.status === "inspected" && x.kind === "new")!;
    const r = await repos.ops.publishInspection(inspected.id, "admin");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draftId).toBeDefined();
      expect(store().drafts.find((d) => d.id === r.draftId)).toMatchObject({ taskId: inspected.id, name: inspected.name, service: inspected.service });
    }
  });
});

describe("incidents.toTicket", () => {
  beforeEach(() => resetStore());

  it("opens a maintenance ticket on the stay's home, once", async () => {
    const stay = store().bookings.find((b) => b.service === "stay" && b.status === "active")!;
    const inc = await repos.incidents.create({ bookingId: stay.id, category: "water", urgency: "today", description: "Shower drains slowly" });
    const ticket = await repos.incidents.toTicket(inc.id, "ops");
    expect(ticket).toMatchObject({ listingId: stay.supplyItemId, bookingId: stay.id, source: "guest", priority: "normal", title: "Shower drains slowly" });
    expect(store().incidents.find((i) => i.id === inc.id)).toMatchObject({ ticketId: ticket!.id, status: "inProgress" });
    const again = await repos.incidents.toTicket(inc.id, "ops");
    expect(again!.id).toBe(ticket!.id);
    expect(store().tickets.filter((t) => t.bookingId === stay.id)).toHaveLength(1);
  });

  it("makes an urgent ticket from an incident that needs someone now", async () => {
    const stay = store().bookings.find((b) => b.service === "stay" && b.status === "active")!;
    const inc = await repos.incidents.create({ bookingId: stay.id, category: "power", urgency: "now", description: "No power" });
    expect((await repos.incidents.toTicket(inc.id, "ops"))!.priority).toBe("urgent");
  });

  it("has no home to send a car's incident to", async () => {
    const car = store().bookings.find((b) => b.service === "car")!;
    const inc = await repos.incidents.create({ bookingId: car.id, category: "other", urgency: "whenever", description: "Scratch" });
    expect(await repos.incidents.toTicket(inc.id, "ops")).toBeNull();
  });
});
