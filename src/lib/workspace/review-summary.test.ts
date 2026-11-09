import { describe, expect, it } from "vitest";
import type { Review } from "@/lib/domain/types";
import { reviewSummary } from "./review-summary";

const r = (scores: number[]): Review => ({
  id: String(Math.random()), bookingId: "b", supplyId: "s", text: "", createdAt: "2026-10-01T00:00:00Z", guestFirstName: "A",
  ratings: { cleanliness: scores[0], accuracy: scores[1], checkIn: scores[2], communication: scores[3], location: scores[4], value: scores[5] },
});

describe("reviewSummary", () => {
  it("is null under three reviews, so one review never stands for a place", () => {
    expect(reviewSummary([r([5, 5, 5, 5, 5, 5]), r([4, 4, 4, 4, 4, 4])])).toBeNull();
  });
  it("averages each aspect and the whole, to one decimal", () => {
    const s = reviewSummary([r([5, 5, 5, 5, 5, 4]), r([4, 5, 5, 5, 5, 4]), r([5, 4, 5, 5, 5, 5])])!;
    expect(s.count).toBe(3);
    expect(s.aspects.cleanliness).toBeCloseTo(4.7, 1);
    expect(s.overall).toBeCloseTo(4.8, 1);
  });
});
