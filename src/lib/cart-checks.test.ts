import { describe, expect, it } from "vitest";
import type { CartItem } from "./cart-checks";
import { cartBlocked, cartIssues, cartTimeline, cartTotal } from "./cart-checks";
import { FX_RATES } from "@/lib/repos/fixtures/data";

const today = "2026-11-08";
const q = (minor: number, currency: "RWF" | "USD" = "RWF") => ({
  nights: 1,
  lines: [{ key: "accommodation" as const, amount: { minor, currency } }],
  total: { minor, currency },
  escrowHeld: false,
});
let n = 0;
const item = (kind: CartItem["kind"], start: string, end: string, extra: Partial<CartItem> = {}): CartItem => ({
  id: `i${++n}`,
  kind,
  slug: "x",
  supplyId: "s",
  title: kind,
  start: `2026-${start}`,
  end: `2026-${end}`,
  party: 2,
  quote: q(100_000),
  ...extra,
});
const stay = (a: string, b: string) => item("stay", a, b);
const car = (a: string, b: string) => item("car", a, b);
const day = (a: string) => item("experience", a, a);

describe("cartIssues", () => {
  it("blocks two stays that overlap by a night", () => {
    expect(cartIssues([stay("12-01", "12-05"), stay("12-04", "12-08")], today)[0]).toMatchObject({ code: "staysOverlap", blocking: true });
  });
  it("lets two stays meet on a changeover day", () => {
    expect(cartIssues([stay("12-01", "12-05"), stay("12-05", "12-08")], today)).toEqual([]);
  });
  it("warns, without blocking, about a car outside the stay", () => {
    expect(cartIssues([stay("12-01", "12-05"), car("11-28", "12-02")], today)[0]).toMatchObject({ code: "carOutsideStay", blocking: false });
  });
  it("is content with a car inside the stay", () => {
    expect(cartIssues([stay("12-01", "12-05"), car("12-01", "12-04")], today)).toEqual([]);
  });
  it("warns about a day out on a day with no stay", () => {
    expect(cartIssues([stay("12-01", "12-05"), day("12-09")], today)[0]).toMatchObject({ code: "dayOutsideStay", blocking: false });
  });
  it("blocks anything in the past", () => {
    expect(cartIssues([car("11-01", "11-03")], today)[0]).toMatchObject({ code: "inPast", blocking: true });
    expect(cartBlocked([car("11-01", "11-03")], today)).toBe(true);
  });
  it("does not hold a paid booking's own dates against it", () => {
    expect(cartIssues([{ ...stay("11-01", "11-05"), bookedReference: "HL-AAAA-BB" }, car("12-01", "12-03")], today).map((i) => i.code)).not.toContain("inPast");
  });
  it("still blocks a new stay that overlaps one already paid", () => {
    expect(cartIssues([stay("12-01", "12-05"), { ...stay("12-04", "12-08"), bookedReference: "HL-AAAA-BB" }], today)[0]).toMatchObject({ code: "staysOverlap", blocking: true });
  });
});

describe("cartTotal", () => {
  it("never charges a booked item again", () => {
    const c = car("12-01", "12-03");
    expect(cartTotal([{ ...stay("12-01", "12-05"), bookedReference: "HL-AAAA-BB" }, c], "RWF", FX_RATES)).toEqual(c.quote.total);
  });
  it("adds totals in the display currency from each item's displayed total", () => {
    const usd = { ...day("12-03"), quote: q(15_000, "USD") };
    const total = cartTotal([stay("12-01", "12-05"), usd], "USD", FX_RATES);
    expect(total.currency).toBe("USD");
    expect(total.minor).toBe(Math.round(100_000 * FX_RATES.USD * 100) + 15_000);
  });
});

describe("cartTimeline", () => {
  it("orders by start date, then stay, car, day out", () => {
    const items = [day("12-02"), car("12-01", "12-03"), stay("12-01", "12-05")];
    expect(cartTimeline(items).flatMap((d) => d.items.map((i) => i.kind))).toEqual(["stay", "car", "experience"]);
  });
});
