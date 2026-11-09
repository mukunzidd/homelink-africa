import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { kigaliDay } from "@/lib/domain/instants";
import { addDays } from "@/lib/domain/dates";

const today = kigaliDay();

describe("work.housekeeping", () => {
  beforeEach(() => resetStore());

  it("turns today's same-day changeover into a turnover with the tight window", async () => {
    const tasks = await repos.work.housekeeping(today);
    const flat = tasks.find((t) => t.listingId === "lst_kicukiro_flat" && t.kind === "turnover");
    expect(flat).toMatchObject({ date: today, window: { from: "11:00", until: "14:00" }, status: "todo" });
  });

  it("puts a booked mid-stay clean on the middle day of the stay", async () => {
    const during = store().bookings.find((b) => b.id === "bkg_phase_during")!;
    const tasks = await repos.work.housekeeping(today);
    expect(tasks.find((t) => t.kind === "midStay" && t.listingId === during.supplyItemId)).toBeTruthy();
    expect((await repos.work.housekeeping(addDays(today, 1))).some((t) => t.kind === "midStay")).toBe(false);
  });

  it("keeps who it is given to and how far it got, and logs it", async () => {
    const [first] = await repos.work.housekeeping(today);
    await repos.work.updateHousekeeping(first.id, "ops", { assignee: "Claudine U.", status: "ready", note: "Towels short by two" });
    const again = (await repos.work.housekeeping(today)).find((t) => t.id === first.id);
    expect(again).toMatchObject({ assignee: "Claudine U.", status: "ready", note: "Towels short by two" });
    expect(store().audit.at(-1)).toMatchObject({ action: "housekeeping.update", target: first.id });
  });

  it("refuses a status that does not exist, or a task that does not", async () => {
    const [first] = await repos.work.housekeeping(today);
    await expect(repos.work.updateHousekeeping(first.id, "ops", { status: "gone" as never })).rejects.toThrow();
    await expect(repos.work.updateHousekeeping("hk_nope", "ops", { status: "ready" })).rejects.toThrow();
  });
});

describe("availability.block", () => {
  beforeEach(() => resetStore());

  it("returns only the nights it added, so a caller never claims someone else's block", async () => {
    const seeded = store().blocks.find((b) => b.supplyId === "lst_kiyovu_apartment")!;
    const fresh = addDays(seeded.date, 10);
    const added = await repos.availability.block("lst_kiyovu_apartment", [seeded.date, fresh], "maintenance");
    expect(added).toEqual([fresh]);
  });
});
