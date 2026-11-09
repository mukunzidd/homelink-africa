import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";

describe("account", () => {
  beforeEach(() => resetStore());

  it("saves a profile and refuses a bad email or phone", async () => {
    const p = await repos.account.updateProfile({ name: "Ange Uwase", email: "ange.u@example.rw", phone: "+250 788 999 000", emergency: { name: "Jean Uwase", phone: "+250 788 111 222" } });
    expect(p).toMatchObject({ email: "ange.u@example.rw", emergency: { name: "Jean Uwase" } });
    await expect(repos.account.updateProfile({ email: "not-an-email" })).rejects.toThrow();
    await expect(repos.account.updateProfile({ phone: "12" })).rejects.toThrow();
  });

  it("keeps a card as brand, last four and expiry only, and refuses a bad number or a past expiry", async () => {
    const m = await repos.account.addMethod({ kind: "card", number: "4242 4242 4242 4242", expiry: "12/30", name: "Ange Uwase" });
    expect(m).toMatchObject({ kind: "card", brand: "visa", last4: "4242", expiry: "12/30" });
    expect(JSON.stringify(store().account.methods)).not.toContain("424242424242");
    await expect(repos.account.addMethod({ kind: "card", number: "4242 4242 4242 4241", expiry: "12/30", name: "A" })).rejects.toThrow();
    await expect(repos.account.addMethod({ kind: "card", number: "4242 4242 4242 4242", expiry: "01/20", name: "A" })).rejects.toThrow();
  });

  it("adds a Mobile Money number with its provider, masked", async () => {
    const m = await repos.account.addMethod({ kind: "mobileMoney", number: "0788123456" });
    expect(m).toMatchObject({ kind: "mobileMoney", provider: "mtn", last4: "3456" });
  });

  it("promotes another method when the default is removed", async () => {
    const before = await repos.account.methods();
    const def = before.find((x) => x.isDefault)!;
    await repos.account.removeMethod(def.id);
    const after = await repos.account.methods();
    expect(after.some((x) => x.id === def.id)).toBe(false);
    if (after.length) expect(after.filter((x) => x.isDefault)).toHaveLength(1);
  });

  it("signs out other sessions but never this one", async () => {
    const s = await repos.account.sessions();
    const here = s.find((x) => x.current)!;
    await expect(repos.account.signOutSession(here.id)).rejects.toThrow();
    await repos.account.signOutOthers();
    expect((await repos.account.sessions()).map((x) => x.id)).toEqual([here.id]);
  });

  it("takes an ID check with front and selfie (and back unless a passport), then cycles in the preview", async () => {
    await expect(repos.account.submitIdCheck({ docType: "nationalId", front: "f.jpg", selfie: "s.jpg" })).rejects.toThrow();
    const c = await repos.account.submitIdCheck({ docType: "passport", front: "f.jpg", selfie: "s.jpg" });
    expect(c.status).toBe("pending");
    expect((await repos.account.cycleIdCheck()).status).toBe("verified");
  });

  it("will not delete an account with a booking still to come, and says which", async () => {
    const r = await repos.account.deleteAccount();
    expect(r).toMatchObject({ ok: false, reason: "upcoming" });
    expect(r.ok === false && r.reference).toMatch(/^HL-/);
  });
});
