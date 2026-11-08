import { describe, expect, it } from "vitest";
import type { Booking, PaymentRecord } from "@/lib/domain/types";
import { paidState, refundableOf } from "./paid-state";

const b = { id: "b1", total: { minor: 1000, currency: "RWF" } } as Booking;
const pay = (kind: PaymentRecord["kind"], minor: number, status: PaymentRecord["status"] = "succeeded", bookingId = "b1"): PaymentRecord => ({
  id: `p${minor}${kind}`,
  bookingId,
  rail: "card",
  kind,
  amount: { minor, currency: "RWF" },
  status,
  at: "2026-11-01T00:00:00Z",
});

describe("paidState", () => {
  it("is paid when what came in covers the total", () => expect(paidState(b, [pay("full", 1000)])).toBe("paid"));
  it("is part paid on a deposit alone", () => expect(paidState(b, [pay("deposit", 300)])).toBe("part"));
  it("is not paid with nothing, a failure, or someone else's payment", () =>
    expect(paidState(b, [pay("full", 1000, "failed"), pay("full", 1000, "succeeded", "b2")])).toBe("none"));
  it("says refunded once any money went back", () => expect(paidState(b, [pay("full", 1000), pay("refund", 100)])).toBe("refunded"));
});

describe("refundableOf", () => {
  it("is what came in, less what went back, in the booking's currency", () => {
    const usd: PaymentRecord = { ...pay("full", 50), amount: { minor: 50, currency: "USD" } };
    expect(refundableOf(b, [pay("deposit", 300), pay("balance", 700), pay("refund", 250), pay("full", 999, "failed"), usd])).toEqual({ minor: 750, currency: "RWF" });
  });
  it("never goes below nothing", () => expect(refundableOf(b, [pay("refund", 10)])).toEqual({ minor: 0, currency: "RWF" }));
});

describe("paidState: a payment marked refunded", () => {
  it("counts as money given back, not as paid", () => expect(paidState(b, [pay("full", 1000, "refunded")])).toBe("refunded"));
});
