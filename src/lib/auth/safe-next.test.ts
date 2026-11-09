import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/en/trips", "en")).toBe("/en/trips");
    expect(safeNext("/en/bookings/HL-4KQ2-8M?step=pay", "en")).toBe("/en/bookings/HL-4KQ2-8M?step=pay");
  });
  it("refuses other sites", () => {
    for (const bad of ["//evil.example", "https://evil.example", "/\\evil.example", "javascript:alert(1)", "/fr/trips", "/en/../\\evil", "/en//evil.example", "/en/%2F%2Fevil.example", "\t/en/trips", "/en\\trips"])
      expect(safeNext(bad, "en")).toBe("/en/account");
  });
  it("falls back when there is none", () => {
    expect(safeNext(undefined, "rw")).toBe("/rw/account");
    expect(safeNext("/en", "en")).toBe("/en");
  });
});
