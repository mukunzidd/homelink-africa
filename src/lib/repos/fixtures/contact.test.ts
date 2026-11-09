import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";

describe("contact", () => {
  beforeEach(() => resetStore());

  it("puts a message about one of the guest's bookings in that booking's thread with the desk", async () => {
    const r = await repos.messaging.contact({ topic: "change", reference: "HL-4KQ2-8M", body: "Can we arrive a day later?" });
    expect(r).toMatchObject({ ok: true });
    const thread = store().conversations.find((c) => c.id === (r.ok && r.conversationId))!;
    expect(thread.participantRoles).toEqual(expect.arrayContaining(["guest", "ops"]));
    expect(thread.participantRoles.every((x) => x === "guest" || x === "ops" || x === "admin")).toBe(true);
  });

  it("refuses a reference that is not one of the guest's bookings", async () => {
    const someoneElse = store().bookings.find((b) => b.id.startsWith("bkg_hist_"))!;
    expect(await repos.messaging.contact({ topic: "change", reference: someoneElse.reference, body: "hi" })).toMatchObject({ ok: false, reason: "reference" });
    expect(await repos.messaging.contact({ topic: "change", reference: "HL-NOPE-00", body: "hi" })).toMatchObject({ ok: false, reason: "reference" });
  });

  it("without a booking, tells the desk and keeps it", async () => {
    const before = store().notifications.length;
    expect(await repos.messaging.contact({ topic: "other", body: "Do you have homes in Musanze?" })).toMatchObject({ ok: true });
    expect(store().notifications.slice(before).some((n) => n.audience === "ops")).toBe(true);
  });

  it("refuses an empty message", async () => {
    expect(await repos.messaging.contact({ topic: "other", body: "  " })).toMatchObject({ ok: false, reason: "empty" });
  });
});
