import { describe, expect, it } from "vitest";
import { money } from "./money";
import type { Quote } from "./pricing";
import {
  changeDifference,
  checkInReleased,
  checkInReleasedAt,
  holdSecondsLeft,
  refundPreview,
} from "./policies";

const rwf = (n: number) => money(n, "RWF");
const stayQuote: Quote = {
  nights: 4,
  lines: [
    { key: "accommodation", amount: rwf(400_000) },
    { key: "cleaning", amount: rwf(32_000) },
    { key: "serviceFee", amount: rwf(43_040) },
  ],
  total: rwf(475_040),
  escrowHeld: true,
};
const carQuote: Quote = {
  nights: 4,
  lines: [{ key: "hire", amount: rwf(200_000) }, { key: "serviceFee", amount: rwf(21_520) }],
  total: rwf(221_520),
  escrowHeld: false,
};
const dayQuote: Quote = {
  nights: 0,
  lines: [{ key: "seats", amount: rwf(300_000) }, { key: "serviceFee", amount: rwf(32_280) }],
  total: rwf(332_280),
  escrowHeld: false,
};

describe("refundPreview: stays", () => {
  it("refunds in full exactly 7 days out", () => {
    const p = refundPreview("stay", stayQuote, "2026-11-16", "2026-11-09");
    expect(p.rule).toBe("full");
    expect(p.refund).toEqual(stayQuote.total);
    expect(p.freeUntil).toBe("2026-11-09");
  });

  it("refunds half the accommodation and all the cleaning 6 days out", () => {
    const p = refundPreview("stay", stayQuote, "2026-11-15", "2026-11-09");
    expect(p.rule).toBe("half");
    expect(p.refund.minor).toBe(200_000 + 32_000);
  });

  it("still refunds half the day before arrival", () => {
    expect(refundPreview("stay", stayQuote, "2026-11-10", "2026-11-09").rule).toBe("half");
  });

  it("refunds nothing on the arrival day", () => {
    const p = refundPreview("stay", stayQuote, "2026-11-09", "2026-11-09");
    expect(p.rule).toBe("none");
    expect(p.refund.minor).toBe(0);
  });

  it("refunds unused extras with the cleaning, and the discount comes off the half", () => {
    const q: Quote = {
      ...stayQuote,
      lines: [
        ...stayQuote.lines,
        { key: "extra", extra: "groceries", amount: rwf(40_000) },
        { key: "discount", amount: rwf(-40_000) },
      ],
      total: rwf(475_040),
    };
    const p = refundPreview("stay", q, "2026-11-12", "2026-11-09");
    expect(p.refund.minor).toBe((400_000 - 40_000) / 2 + 32_000 + 40_000);
  });
});

describe("refundPreview: cars and days out", () => {
  it("refunds a hire in full 2 days out", () => {
    expect(refundPreview("car", carQuote, "2026-11-11", "2026-11-09", { hireDays: 4 }).rule).toBe("carFree");
  });

  it("keeps one day of a hire inside 48 hours", () => {
    const p = refundPreview("car", carQuote, "2026-11-10", "2026-11-09", { hireDays: 4 });
    expect(p.rule).toBe("carOneDay");
    expect(p.kept.minor).toBe(Math.round(221_520 / 4));
  });

  it("refunds a day out in full 3 days out, and nothing after", () => {
    expect(refundPreview("experience", dayQuote, "2026-11-12", "2026-11-09").rule).toBe("dayFree");
    expect(refundPreview("experience", dayQuote, "2026-11-11", "2026-11-09").refund.minor).toBe(0);
  });

  it("never refunds a permit", () => {
    const p = refundPreview("experience", dayQuote, "2026-11-19", "2026-11-09", { permitShare: rwf(250_000) });
    expect(p.rule).toBe("dayPermitKept");
    expect(p.kept.minor).toBe(250_000);
  });

  it("keeps refund and kept adding up to the total, under every rule", () => {
    const cases = [
      refundPreview("stay", stayQuote, "2026-11-20", "2026-11-09"),
      refundPreview("stay", stayQuote, "2026-11-12", "2026-11-09"),
      refundPreview("stay", stayQuote, "2026-11-09", "2026-11-09"),
      refundPreview("car", carQuote, "2026-11-10", "2026-11-09", { hireDays: 4 }),
      refundPreview("experience", dayQuote, "2026-11-19", "2026-11-09", { permitShare: rwf(250_000) }),
    ];
    for (const [i, p] of cases.entries()) {
      const total = [stayQuote, stayQuote, stayQuote, carQuote, dayQuote][i].total.minor;
      expect(p.refund.minor + p.kept.minor).toBe(total);
    }
  });
});

describe("check-in release", () => {
  it("releases details at 14:00 Kigali two days before", () => {
    expect(checkInReleasedAt("2026-11-12")).toBe("2026-11-10T12:00:00.000Z");
    expect(checkInReleased("2026-11-12", new Date("2026-11-10T11:59:59Z"))).toBe(false);
    expect(checkInReleased("2026-11-12", new Date("2026-11-10T12:00:00Z"))).toBe(true);
  });
});

describe("hold", () => {
  it("counts a hold down to zero and stops", () => {
    expect(holdSecondsLeft("2026-11-08T10:00:00Z", new Date("2026-11-08T10:14:00Z"))).toBe(60);
    expect(holdSecondsLeft("2026-11-08T10:00:00Z", new Date("2026-11-08T11:00:00Z"))).toBe(0);
  });
});

describe("changeDifference", () => {
  it("is positive to pay more and negative for a refund", () => {
    expect(changeDifference(stayQuote, { ...stayQuote, total: rwf(500_000) }).minor).toBe(24_960);
    expect(changeDifference(stayQuote, { ...stayQuote, total: rwf(400_000) }).minor).toBe(-75_040);
  });
});
