import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";

describe("partner job offers", () => {
  beforeEach(() => resetStore());

  it("gives the preview driver an open offer with pickup, pay and an expiry", async () => {
    const offers = (await repos.partners.offers("ptn_eric")).filter((j) => j.status === "offered");
    expect(offers.length).toBeGreaterThan(0);
    expect(offers[0]).toMatchObject({ partnerId: "ptn_eric", pickup: expect.any(String), offerExpiresAt: expect.any(String) });
    expect(offers[0].pay.minor).toBeGreaterThan(0);
  });

  it("accepting puts the partner on the booking and tells the desk", async () => {
    const offer = (await repos.partners.offers("ptn_eric")).find((j) => j.status === "offered")!;
    const before = store().notifications.length;
    await repos.partners.respond(offer.id, "ptn_eric", true);
    expect((await repos.partners.offers("ptn_eric")).find((j) => j.id === offer.id)?.status).toBe("accepted");
    expect(store().bookings.find((b) => b.id === offer.bookingId)?.partnerId).toBe("ptn_eric");
    expect(store().notifications.slice(before).map((n) => [n.audience, n.kind])).toContainEqual(["ops", "jobAccepted"]);
  });

  it("declining needs a reason, and an offer cannot be answered twice or by someone else", async () => {
    const offer = (await repos.partners.offers("ptn_eric")).find((j) => j.status === "offered")!;
    await expect(repos.partners.respond(offer.id, "ptn_jeanpaul", true)).rejects.toThrow();
    await expect(repos.partners.respond(offer.id, "ptn_eric", false, "")).rejects.toThrow();
    await repos.partners.respond(offer.id, "ptn_eric", false, "Already driving that evening");
    await expect(repos.partners.respond(offer.id, "ptn_eric", true)).rejects.toThrow();
  });

  it("refuses an offer that has run out", async () => {
    const offer = (await repos.partners.offers("ptn_eric")).find((j) => j.status === "offered")!;
    store().jobOffers.find((j) => j.id === offer.id)!.offerExpiresAt = new Date(Date.now() - 60_000).toISOString();
    await expect(repos.partners.respond(offer.id, "ptn_eric", true)).rejects.toThrow();
  });

  it("replaces a document with a later expiry, and refuses one already past", async () => {
    const doc = (await repos.partners.documents("ptn_eric"))[0];
    const later = new Date(Date.now() + 400 * 86_400_000).toISOString().slice(0, 10);
    await repos.partners.replaceDocument(doc.id, "ptn_eric", { fileName: "licence-2031.pdf", expires: later });
    expect((await repos.partners.documents("ptn_eric")).find((d) => d.id === doc.id)?.expires).toBe(later);
    await expect(repos.partners.replaceDocument(doc.id, "ptn_eric", { fileName: "x.pdf", expires: "2020-01-01" })).rejects.toThrow();
    await expect(repos.partners.replaceDocument(doc.id, "ptn_jeanpaul", { fileName: "x.pdf", expires: later })).rejects.toThrow();
  });
});
