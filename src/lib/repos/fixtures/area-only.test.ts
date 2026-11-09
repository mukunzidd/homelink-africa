import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { areaCentre } from "@/lib/places/area";
import { buildProfiles } from "@/lib/domain/neighbourhood-profile";

/**
 * A guest sees which neighbourhood a home is in, never where in it. Every
 * read the public site makes returns the neighbourhood's centre; only the
 * workspace's all() keeps the real point.
 */
describe("homes are placed by neighbourhood on the public side", () => {
  beforeEach(() => resetStore());

  const same = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => a.lat === b.lat && a.lng === b.lng;

  it("gives every stay read the neighbourhood centre, not the home's point", async () => {
    const r = repos;
    const all = store().listings.filter((l) => l.published !== false);
    const reads = [
      ...(await r.stays.list()),
      ...(await r.stays.list({ band: "long" })),
      ...(await r.stays.featured(12)),
      ...(await Promise.all(all.map((l) => r.stays.bySlug(l.slug)))),
      ...(await Promise.all(all.map((l) => r.stays.byId(l.id)))),
    ].filter((l) => l !== null);
    expect(reads.length).toBeGreaterThan(all.length);
    for (const l of reads) {
      expect(l.location).toEqual(areaCentre(l.neighbourhood));
      const real = store().listings.find((x) => x.id === l.id)!.location;
      expect(same(l.location, real)).toBe(false);
    }
  });

  it("does the same for homes for sale", async () => {
    const r = repos;
    const reads = [
      ...(await r.sales.list()),
      ...(await Promise.all(store().sales.map((h) => r.sales.bySlug(h.slug)))),
      ...(await Promise.all(store().sales.map((h) => r.sales.byId(h.id)))),
    ].filter((h) => h !== null);
    for (const h of reads) expect(h.location).toEqual(areaCentre(h.neighbourhood));
  });

  it("leaves the store itself alone, so the workspace still has the real point", async () => {
    const before = structuredClone(store().listings.map((l) => l.location));
    await repos.stays.list();
    expect(store().listings.map((l) => l.location)).toEqual(before);
    expect((await repos.stays.all()).map((l) => l.location)).toEqual(before);
  });

  it("puts a neighbourhood's centre where the neighbourhood is, whatever is listed in it", async () => {
    const r = repos;
    const nightly = await r.stays.list();
    const profiles = buildProfiles(nightly, [], await r.sales.list());
    const nyamirambo = profiles.find((p) => p.name === "Nyamirambo");
    if (nyamirambo) expect(nyamirambo.centre).toEqual(areaCentre("Nyamirambo"));
    for (const p of profiles) expect(p.centre).toEqual(areaCentre(p.name));
  });
});

describe("areaCentre", () => {
  it("knows every neighbourhood a home is listed in", () => {
    for (const x of [...store().listings, ...store().sales]) {
      expect(areaCentre(x.neighbourhood), x.neighbourhood).not.toEqual(areaCentre("Nowhere in particular"));
    }
  });
});
