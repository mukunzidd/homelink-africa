import { describe, expect, it } from "vitest";
import { createLocalEngine } from "./local-engine";
import type { SearchDoc } from "./types";

const doc = (id: string, name: string): SearchDoc => ({
  id, kind: "stay", slug: id, name, summary: "", neighbourhood: "Kiyovu", amenities: [], amenityText: "", keywords: "",
  bedrooms: 1, sleeps: 2, priceUsd: 100, monthlyUsd: null, nightly: true, lease: false, driveModes: [], interests: [], inspectedDay: 1,
});

describe("local engine refresh", () => {
  it("reads the documents again after refresh, so an unpublished home drops out", async () => {
    let docs = [doc("a", "City flat"), doc("b", "Garden flat")];
    const engine = createLocalEngine(async () => docs);
    expect((await engine.search({ text: "flat", filters: { kind: "stay" } })).length).toBe(2);
    docs = [doc("b", "Garden flat")];
    expect((await engine.search({ text: "flat", filters: { kind: "stay" } })).length).toBe(2);
    await engine.refresh();
    expect((await engine.search({ text: "flat", filters: { kind: "stay" } })).map((h) => h.id)).toEqual(["b"]);
  });
});
