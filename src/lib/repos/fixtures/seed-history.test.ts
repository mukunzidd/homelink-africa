import { beforeEach, describe, expect, it } from "vitest";
import { resetStore, store } from "./store";
import { revenue } from "@/lib/workspace/metrics";
import { addMonths } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { FX_RATES } from "./data";
import type { ServiceKind } from "@/lib/domain/types";

/**
 * The staff screens read the seed as a business with a past: the finance
 * revenue table shows six months per lane, and the audit log shows who did
 * what. Both opened on zeros and an empty page before.
 */

const today = kigaliDay();
const first = `${today.slice(0, 7)}-01`;
const months = Array.from({ length: 6 }, (_, i) => addMonths(first, i - 5));

describe("seeded history", () => {
  beforeEach(() => resetStore());

  for (const lane of ["stay", "car", "experience"] as ServiceKind[]) {
    it(`gives the ${lane} lane revenue in each of the last six months`, () => {
      const lanes = store().bookings.filter((b) => b.service === lane);
      for (const m of months) expect(revenue(lanes, m, addMonths(m, 1), "RWF", FX_RATES).minor, `${lane} ${m}`).toBeGreaterThan(0);
    });
  }

  it("keeps past cars and day outs in the past, so they never take a date someone could book", () => {
    const seeded = store().bookings.filter((b) => b.id.startsWith("bkg_hist_") && b.service !== "stay");
    expect(seeded.length).toBeGreaterThan(0);
    for (const b of seeded) expect(b.endDate < today, b.id).toBe(true);
  });

  it("books a day out on a departure the day out has, within its group size", () => {
    const seeded = store().bookings.filter((b) => b.id.startsWith("bkg_hist_") && b.service === "experience");
    for (const b of seeded) {
      const e = store().experiences.find((x) => x.id === b.supplyItemId)!;
      if (e.slots?.length) expect(e.slots).toContain(b.slot);
      expect(b.party).toBeLessThanOrEqual(e.groupMax);
      expect(b.participants?.length).toBe(b.party);
    }
  });
});

describe("seeded payments", () => {
  beforeEach(() => resetStore());

  it("are dated when the booking was paid, never in the future", () => {
    const now = Date.now();
    for (const p of store().payments) expect(Date.parse(p.at) <= now, `${p.id} ${p.at}`).toBe(true);
    for (const p of store().payments.filter((x) => x.kind === "full")) {
      const b = store().bookings.find((x) => x.id === p.bookingId)!;
      const paid = b.timeline?.find((e) => e.kind === "paid")?.at;
      if (paid && Date.parse(paid) <= now) expect(p.at, b.id).toBe(paid);
    }
  });
});

describe("seeded audit log", () => {
  beforeEach(() => resetStore());

  it("opens with weeks of entries from several people, all in the past", () => {
    const audit = store().audit;
    expect(audit.length).toBeGreaterThanOrEqual(20);
    expect(new Set(audit.map((e) => e.actor)).size).toBeGreaterThanOrEqual(3);
    const now = Date.now();
    for (const e of audit) expect(Date.parse(e.at)).toBeLessThanOrEqual(now);
    const days = new Set(audit.map((e) => e.at.slice(0, 10)));
    expect(days.size).toBeGreaterThanOrEqual(7);
  });

  it("points every booking entry at a booking that exists", () => {
    const refs = new Set(store().bookings.map((b) => b.reference));
    for (const e of store().audit.filter((x) => x.action.startsWith("booking."))) expect(refs.has(e.target), e.target).toBe(true);
  });

  it("gives seeded entries ids that new ones never reuse", async () => {
    const { recordAudit } = await import("./store");
    const fresh = recordAudit({ actor: "admin", action: "settings.update", target: "settings" });
    expect(store().audit.filter((e) => e.id === fresh.id)).toHaveLength(1);
  });
});
