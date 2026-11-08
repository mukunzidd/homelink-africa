import { describe, expect, it } from "vitest";
import { monthsBetween } from "./dates";
import type { ExtraKey } from "./extras";
import { extrasFor, priceExtras } from "./extras";
import { applyPromo } from "./promo";
import { depositPlan } from "./payment-plan";
import { quoteBooking, quoteRent, quoteStay, quoteVehicle } from "./pricing";
import { EXPERIENCES, FX_RATES, LISTINGS, VEHICLES } from "@/lib/repos/fixtures/data";

const listing = LISTINGS[0];
const vehicle = VEHICLES[0];
const on = "2026-11-08";
const sum = (q: { lines: { amount: { minor: number } }[] }) =>
  q.lines.reduce((s, l) => s + l.amount.minor, 0);

describe("priceExtras", () => {
  it("prices a stay's extras per booking and per visit", () => {
    const lines = priceExtras(
      "stay",
      [
        { key: "airportPickup", quantity: 1 },
        { key: "midStayClean", quantity: 2 },
      ],
      7,
    );
    expect(lines.map((l) => [l.extra, l.amount.minor])).toEqual([
      ["airportPickup", 25000],
      ["midStayClean", 30000],
    ]);
  });

  it("prices a car's extras per day", () => {
    expect(priceExtras("car", [{ key: "childSeat", quantity: 1 }], 3)[0].amount.minor).toBe(15000);
  });

  it("drops extras from another lane, unknown keys and zero quantities", () => {
    expect(
      priceExtras(
        "stay",
        [
          { key: "childSeat", quantity: 1 },
          { key: "jacuzzi" as ExtraKey, quantity: 1 },
          { key: "groceries", quantity: 0 },
        ],
        2,
      ),
    ).toEqual([]);
  });

  it("caps a quantity at the most that makes sense", () => {
    expect(priceExtras("stay", [{ key: "airportPickup", quantity: 9 }], 3)[0].amount.minor).toBe(25000);
  });

  it("keeps a free cot on the bill at zero, so the guest sees it was asked for", () => {
    expect(priceExtras("stay", [{ key: "cot", quantity: 1 }], 3)).toEqual([
      { key: "extra", extra: "cot", amount: { minor: 0, currency: "RWF" } },
    ]);
  });

  it("offers no extras on a day out", () => {
    expect(extrasFor("experience")).toEqual([]);
  });
});

describe("applyPromo", () => {
  const quote = (accommodation: number) => ({
    nights: 10,
    lines: [{ key: "accommodation" as const, amount: { minor: accommodation, currency: "RWF" as const } }],
    total: { minor: accommodation, currency: "RWF" as const },
    escrowHeld: false,
  });

  it("takes 10% off the accommodation", () => {
    expect(applyPromo("KARIBU10", quote(300_000), on)).toEqual({
      ok: true,
      code: "KARIBU10",
      discount: { minor: 30_000, currency: "RWF" },
    });
  });

  it("caps KARIBU10 at 50,000 RWF", () => {
    expect(applyPromo("KARIBU10", quote(900_000), on)).toMatchObject({ ok: true, discount: { minor: 50_000 } });
  });

  it("reads codes case-insensitively and trims them", () => {
    expect(applyPromo("  karibu10 ", quote(300_000), on)).toMatchObject({ ok: true, code: "KARIBU10" });
  });

  it("refuses KARIBU10 on a car", () => {
    expect(applyPromo("KARIBU10", quoteVehicle(vehicle, "2026-12-01", "2026-12-03", "selfDrive")!, on)).toMatchObject({
      ok: false,
      reason: "notApplicable",
    });
  });

  it("refuses a stay priced in another currency rather than compare a USD line with an RWF cap", () => {
    const usd = {
      nights: 10,
      lines: [{ key: "accommodation" as const, amount: { minor: 900_000, currency: "USD" as const } }],
      total: { minor: 900_000, currency: "USD" as const },
      escrowHeld: false,
    };
    expect(applyPromo("KARIBU10", usd, on)).toMatchObject({ ok: false, reason: "notApplicable" });
  });

  it("says unknown and expired apart", () => {
    expect(applyPromo("NOPE", quote(300_000), on)).toMatchObject({ ok: false, reason: "unknown" });
    expect(applyPromo("KARIBU10", quote(300_000), "2028-01-01")).toMatchObject({ ok: false, reason: "expired" });
  });
});

describe("depositPlan", () => {
  it("offers a deposit on 28 nights, not on 27", () => {
    const q28 = quoteStay(listing, "2027-01-01", "2027-01-29")!;
    const q27 = quoteStay(listing, "2027-01-01", "2027-01-28")!;
    // Keep the 27-night total under the money threshold so nights decide it.
    expect(q27.total.minor).toBeLessThan(1_000_000 * 10);
    expect(depositPlan(q28, "2027-01-01", on, FX_RATES).offered).toBe(true);
    const small = { ...q27, total: { ...q27.total, minor: 900_000 } };
    expect(depositPlan(small, "2027-01-01", on, FX_RATES).offered).toBe(false);
  });

  it("offers one on a total of 1,000,000 RWF or more", () => {
    const q = { ...quoteStay(listing, "2027-01-01", "2027-01-04")!, total: { minor: 1_000_000, currency: "RWF" as const } };
    expect(depositPlan(q, "2027-01-01", on, FX_RATES).offered).toBe(true);
  });

  it("does not offer a deposit when arrival is 13 days away", () => {
    const q = quoteStay(listing, "2026-11-21", "2026-12-25")!;
    expect(depositPlan(q, "2026-11-21", on, FX_RATES).offered).toBe(false);
    expect(depositPlan(q, "2026-11-22", on, FX_RATES).offered).toBe(true);
  });

  it("splits the deposit so the two parts add up to the total", () => {
    const q = { ...quoteStay(listing, "2027-01-01", "2027-02-01")!, total: { minor: 1_234_567, currency: "RWF" as const } };
    const plan = depositPlan(q, "2027-01-01", on, FX_RATES);
    if (!plan.offered) throw new Error("expected a plan");
    expect(plan.now.minor + plan.balance.minor).toBe(1_234_567);
    expect(plan.now.minor).toBe(370_370);
    expect(plan.balanceDue).toBe("2026-12-18");
  });
});

describe("quoteBooking", () => {
  it("totals a booking as the sum of its lines, discount included", () => {
    const q = quoteBooking(
      listing,
      {
        kind: "stay",
        start: "2026-12-01",
        end: "2026-12-11",
        party: 2,
        extras: [{ key: "groceries", quantity: 1 }],
        promoCode: "KARIBU10",
      },
      on,
    )!;
    expect(q.lines.some((l) => l.key === "discount" && l.amount.minor < 0)).toBe(true);
    expect(q.lines.some((l) => l.extra === "groceries")).toBe(true);
    expect(q.total.minor).toBe(sum(q));
  });

  it("matches the plain quote when nothing is added", () => {
    const plain = quoteStay(listing, "2026-12-01", "2026-12-05")!;
    const q = quoteBooking(listing, { kind: "stay", start: "2026-12-01", end: "2026-12-05", party: 2 }, on)!;
    expect(q.total).toEqual(plain.total);
  });

  it("reports a refused promo without changing the price", () => {
    const q = quoteBooking(vehicle, { kind: "car", start: "2026-12-01", end: "2026-12-03", party: 2, driveMode: "selfDrive", promoCode: "KARIBU10" }, on)!;
    expect(q.promo).toMatchObject({ ok: false, reason: "notApplicable" });
    expect(q.total.minor).toBe(sum(q));
  });

  it("prices a day out per person", () => {
    const e = EXPERIENCES.find((x) => x.pricePerPerson.currency === "RWF")!;
    const q = quoteBooking(e, { kind: "experience", start: "2026-12-01", end: "2026-12-01", party: 3 }, on)!;
    expect(q.lines.find((l) => l.key === "seats")!.amount.minor).toBe(e.pricePerPerson.minor * 3);
  });

  it("sets escrow on the final total, after extras", () => {
    const q = quoteBooking(listing, { kind: "stay", start: "2026-12-01", end: "2026-12-02", party: 2, extras: [{ key: "groceries", quantity: 1 }, { key: "airportPickup", quantity: 1 }, { key: "earlyCheckIn", quantity: 1 }, { key: "lateCheckout", quantity: 1 }] }, on)!;
    expect(q.escrowHeld).toBe(q.total.minor >= 300_000);
  });
});

describe("quoteRent", () => {
  const home = LISTINGS.find((l) => l.monthlyRate && l.leaseTerms)!;

  it("asks for the first month and the deposit, nothing else", () => {
    const q = quoteRent(home, 12)!;
    const m = home.monthlyRate!.minor;
    expect(q.lines.map((l) => [l.key, l.amount.minor])).toEqual([
      ["rent", m],
      ["deposit", m * home.leaseTerms!.depositMonths],
    ]);
    expect(q.total.minor).toBe(m * (1 + home.leaseTerms!.depositMonths));
  });

  it("refuses a home that is not offered by the month", () => {
    const nightly = LISTINGS.find((l) => !l.monthlyRate)!;
    expect(quoteRent(nightly, 12)).toBeNull();
  });

  it("is what quoteBooking returns for a long-term stay", () => {
    const q = quoteBooking(home, { kind: "stay", start: "2027-01-01", end: "2028-01-01", party: 1, rentMonths: 12 }, on)!;
    expect(q.total).toEqual(quoteRent(home, 12)!.total);
  });
});

describe("monthsBetween", () => {
  it("counts calendar months from a move-in to an end", () => {
    expect(monthsBetween("2027-01-01", "2028-01-01")).toBe(12);
    expect(monthsBetween("2027-01-15", "2029-01-15")).toBe(24);
  });
});

describe("quoteStay with nightly rates set for some dates", () => {
  it("sums each night at its own rate across a rate change", () => {
    const base = listing.nightlyRate.minor;
    const priced = { ...listing, nightlyRates: { "2027-03-05": { minor: base * 2, currency: listing.nightlyRate.currency }, "2027-03-06": { minor: base * 2, currency: listing.nightlyRate.currency } } };
    // Four nights: the 3rd and 4th at the base rate, the 5th and 6th at double.
    const q = quoteStay(priced, "2027-03-03", "2027-03-07")!;
    expect(q.lines.find((l) => l.key === "accommodation")!.amount.minor).toBe(base * 2 + base * 2 * 2);
  });

  it("is unchanged where no night has its own rate", () => {
    const q = quoteStay({ ...listing, nightlyRates: {} }, "2027-03-03", "2027-03-07")!;
    expect(q.lines.find((l) => l.key === "accommodation")!.amount.minor).toBe(listing.nightlyRate.minor * 4);
  });
});
