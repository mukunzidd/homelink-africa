import { describe, expect, it } from "vitest";
import { ENTRY_KINDS, normaliseCheckIn } from "./check-in";
import { resetStore, store } from "@/lib/repos/fixtures/store";

describe("normaliseCheckIn", () => {
  const base = { directions: "Green gate", wifiName: "HL", wifiPassword: "pw" };

  it("keeps a code only when the way in is a code", () => {
    expect(normaliseCheckIn({ ...base, entry: "code", doorCode: "4573" })).toMatchObject({ entry: "code", doorCode: "4573" });
    expect(normaliseCheckIn({ ...base, entry: "keys", doorCode: "4573" })).not.toHaveProperty("doorCode");
  });

  it("reads details saved before there was a choice: a code means a code", () => {
    expect(normaliseCheckIn({ ...base, doorCode: "4573" })).toMatchObject({ entry: "code", doorCode: "4573" });
    expect(normaliseCheckIn({ ...base, doorCode: "" })).toMatchObject({ entry: "keys" });
  });

  it("falls back to keys for a way in it does not know, and caps every field", () => {
    const n = normaliseCheckIn({ ...base, entry: "drone", entryNote: "x".repeat(900), directions: "y".repeat(2000) });
    expect(n.entry).toBe("keys");
    expect(n.entryNote).toHaveLength(300);
    expect(n.directions).toHaveLength(1000);
  });

  it("lists the four ways in", () => {
    expect(ENTRY_KINDS).toEqual(["keys", "caretaker", "guard", "code"]);
  });
});

describe("seeded homes", () => {
  it("mostly hand over keys or have someone there; a code is the exception", () => {
    resetStore();
    const ways = store().listings.filter((l) => l.checkIn).map((l) => l.checkIn!);
    expect(new Set(ways.map((c) => c.entry)).size).toBe(4);
    expect(ways.filter((c) => c.entry === "code").length).toBeLessThan(ways.length / 3);
    for (const c of ways) expect(Boolean(c.doorCode), c.entry).toBe(c.entry === "code");
    for (const c of ways.filter((x) => x.entry !== "code")) expect(c.entryNote).toBeTruthy();
  });
});
