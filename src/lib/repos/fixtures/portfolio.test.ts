import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { money } from "@/lib/domain/money";
import { listingPatchErrors } from "@/lib/workspace/listing-patch";

describe("listingPatchErrors", () => {
  const base = { bedrooms: 2, sleeps: 4, modes: ["nightly" as const] };
  it("passes a sound patch", () => {
    expect(listingPatchErrors({ name: "Garden flat", nightlyRate: money(50_000, "RWF") }, base)).toEqual([]);
  });
  it("names each rule a patch breaks", () => {
    expect(listingPatchErrors({ name: "  " }, base)).toContain("name");
    expect(listingPatchErrors({ nightlyRate: money(0, "RWF") }, base)).toContain("nightlyRate");
    expect(listingPatchErrors({ monthlyRate: money(-5, "RWF") }, base)).toContain("monthlyRate");
    expect(listingPatchErrors({ sleeps: 1 }, base)).toContain("sleeps");
    expect(listingPatchErrors({ bedrooms: 5 }, base)).toContain("sleeps");
    expect(listingPatchErrors({ modes: [] }, base)).toContain("modes");
    expect(listingPatchErrors({ minNights: 0 }, base)).toContain("minNights");
  });
  it("needs a monthly rate before a home can be offered for renting", () => {
    expect(listingPatchErrors({ modes: ["lease"] }, { ...base, monthlyRate: undefined })).toContain("monthlyRate");
  });
});

describe("stays: editing and publishing", () => {
  beforeEach(() => resetStore());

  it("saves a patch, and the public page reads the new rate", async () => {
    const l = store().listings[0];
    await repos.stays.update(l.id, { nightlyRate: money(99_000, "RWF") });
    expect((await repos.stays.bySlug(l.slug))!.nightlyRate).toEqual(money(99_000, "RWF"));
  });

  it("refuses a patch that breaks a rule, and changes nothing", async () => {
    const l = store().listings[0];
    await expect(repos.stays.update(l.id, { name: "" })).rejects.toThrow();
    expect(store().listings[0].name).toBe(l.name);
  });

  it("hides an unpublished home from every public read, but not from the workspace", async () => {
    const l = (await repos.stays.list())[0];
    await repos.stays.setPublished(l.id, false);
    expect((await repos.stays.list()).some((x) => x.id === l.id)).toBe(false);
    expect(await repos.stays.bySlug(l.slug)).toBeNull();
    expect((await repos.stays.featured(99)).some((x) => x.id === l.id)).toBe(false);
    expect((await repos.stays.all()).some((x) => x.id === l.id)).toBe(true);
    expect(await repos.stays.byId(l.id)).not.toBeNull();
  });

  it("creates a new home as an unpublished draft with a unique address", async () => {
    const a = await repos.stays.create({ name: "Garden flat", neighbourhood: "Kacyiru" });
    const b = await repos.stays.create({ name: "Garden flat", neighbourhood: "Kacyiru" });
    expect(a.published).toBe(false);
    expect(a.slug).not.toBe(b.slug);
    expect((await repos.stays.list()).some((x) => x.id === a.id)).toBe(false);
  });

  it("will not put a home live that nobody has inspected", async () => {
    const a = await repos.stays.create({ name: "Garden flat", neighbourhood: "Kacyiru" });
    await expect(repos.stays.setPublished(a.id, true)).rejects.toThrow();
    const inspected = store().listings[0];
    await repos.stays.setPublished(inspected.id, false);
    await expect(repos.stays.setPublished(inspected.id, true)).resolves.toMatchObject({ published: true });
  });
});
