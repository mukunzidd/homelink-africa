import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { money } from "@/lib/domain/money";

describe("rates", () => {
  beforeEach(() => resetStore());
  const home = () => store().listings.find((l) => l.nightlyRate.currency === "RWF")!;

  it("gives every night in the range, at the base rate until one is set", async () => {
    const l = home();
    const nights = await repos.rates.forRange(l.id, "2027-02-01", "2027-02-04");
    expect(nights).toEqual(["2027-02-01", "2027-02-02", "2027-02-03"].map((date) => ({ date, rate: l.nightlyRate, own: false })));
  });

  it("sets a rate on a range, which the stay quote then charges", async () => {
    const l = home();
    await repos.rates.setRange(l.id, "2027-02-05", "2027-02-07", money(300_000, "RWF"));
    const nights = await repos.rates.forRange(l.id, "2027-02-04", "2027-02-08");
    expect(nights.map((n) => n.own)).toEqual([false, true, true, false]);
    expect(nights[1].rate).toEqual(money(300_000, "RWF"));
    expect((await repos.stays.byId(l.id))!.nightlyRates?.["2027-02-05"]).toEqual(money(300_000, "RWF"));
  });

  it("clears a range back to the base rate", async () => {
    const l = home();
    await repos.rates.setRange(l.id, "2027-02-05", "2027-02-07", money(300_000, "RWF"));
    await repos.rates.setRange(l.id, "2027-02-05", "2027-02-07", null);
    expect((await repos.rates.forRange(l.id, "2027-02-05", "2027-02-07")).every((n) => !n.own)).toBe(true);
  });

  it("refuses nothing, a negative, another currency, or a range longer than a year", async () => {
    const l = home();
    await expect(repos.rates.setRange(l.id, "2027-02-05", "2027-02-07", money(0, "RWF"))).rejects.toThrow();
    await expect(repos.rates.setRange(l.id, "2027-02-05", "2027-02-07", money(100, "USD"))).rejects.toThrow();
    await expect(repos.rates.setRange(l.id, "2027-02-07", "2027-02-05", money(100_000, "RWF"))).rejects.toThrow();
    await expect(repos.rates.setRange(l.id, "2027-01-01", "2028-02-01", money(100_000, "RWF"))).rejects.toThrow();
  });
});
