import { describe, expect, it } from "vitest";
import { cardOutcome, momoOutcome, momoProvider } from "./payment-sim";

describe("cardOutcome", () => {
  it("follows the provider test numbers, with or without spaces", () => {
    expect(cardOutcome("4242 4242 4242 4242")).toBe("approved");
    expect(cardOutcome("4000000000000002")).toBe("declined");
    expect(cardOutcome("4000 0027 6000 3184")).toBe("challenge");
  });
  it("approves any other card", () => {
    expect(cardOutcome("5555 5555 5555 4444")).toBe("approved");
  });
});

describe("momoOutcome", () => {
  it("times out on a number ending 0000 and declines on 1111", () => {
    expect(momoOutcome("0788120000")).toBe("timeout");
    expect(momoOutcome("+250 788 121 111")).toBe("declined");
    expect(momoOutcome("0788123456")).toBe("approved");
  });
});

describe("momoProvider", () => {
  it("reads the network from the prefix, written any of three ways", () => {
    for (const n of ["0788123456", "788123456", "+250 788 123 456", "0791234567"]) expect(momoProvider(n)).toBe("mtn");
    for (const n of ["0721234567", "0731234567", "250731234567"]) expect(momoProvider(n)).toBe("airtel");
  });
  it("knows no network for a number that is not mobile money", () => {
    expect(momoProvider("0751234567")).toBeNull();
    expect(momoProvider("12")).toBeNull();
  });
});
