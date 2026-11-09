import { describe, expect, it } from "vitest";
import type { JobOffer } from "@/lib/domain/types";
import { openOffers } from "./partner";

const job = (id: string, status: JobOffer["status"], offerExpiresAt?: string): JobOffer => ({
  id, partnerId: "ptn_eric", bookingId: "b", kind: "transfer", start: "2026-11-14", end: "2026-11-14",
  time: "23:40", pickup: "KGL", party: 2, status, offerExpiresAt, pay: { minor: 25_000, currency: "RWF" },
});

describe("openOffers", () => {
  const now = new Date("2026-11-09T10:00:00Z");

  it("keeps offers still waiting for an answer and drops the rest", () => {
    const jobs = [
      job("open", "offered", "2026-11-09T12:00:00Z"),
      job("no-deadline", "offered"),
      job("lapsed", "offered", "2026-11-09T09:59:59Z"),
      job("taken", "accepted", "2026-11-09T12:00:00Z"),
    ];
    expect(openOffers(jobs, now).map((j) => j.id)).toEqual(["open", "no-deadline"]);
  });

  it("treats an offer that expires this very moment as gone", () => {
    expect(openOffers([job("edge", "offered", now.toISOString())], now)).toEqual([]);
  });
});
