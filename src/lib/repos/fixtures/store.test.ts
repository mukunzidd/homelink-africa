import { beforeEach, describe, expect, it } from "vitest";
import { LISTINGS } from "./data";
import { nextId, recordAudit, resetStore, store } from "./store";

describe("fixture store", () => {
  beforeEach(() => resetStore());

  it("is one object for the life of the process", () => {
    expect(store()).toBe(store());
  });

  it("keeps a write", () => {
    store().listings[0].name = "Changed";
    expect(store().listings[0].name).toBe("Changed");
  });

  it("never writes through to the module constants", () => {
    store().listings[0].name = "Changed";
    expect(LISTINGS[0].name).not.toBe("Changed");
  });

  it("goes back to the seed on reset", () => {
    const seeded = store().listings[0].name;
    store().listings[0].name = "Changed";
    resetStore();
    expect(store().listings[0].name).toBe(seeded);
  });

  it("stamps and appends an audit entry", () => {
    const e = recordAudit({ actor: "admin", action: "listing.update", target: "lst_001" });
    expect(e.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(store().audit.at(-1)).toEqual(e);
  });

  it("hands out ids that never repeat", () => {
    const a = nextId("bk");
    const b = nextId("bk");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^bk_/);
  });
});
