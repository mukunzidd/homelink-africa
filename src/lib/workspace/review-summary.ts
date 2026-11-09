import type { Review, ReviewAspect } from "@/lib/domain/types";

const ASPECTS: ReviewAspect[] = ["cleanliness", "accuracy", "checkIn", "communication", "location", "value"];

export type ReviewSummary = { count: number; overall: number; aspects: Record<ReviewAspect, number> };

/**
 * The average of each aspect and of them all. Null under three reviews:
 * one guest's five stars is an anecdote, and a page that shows "5.0 from
 * 1" is claiming more than it knows.
 */
export function reviewSummary(reviews: Review[]): ReviewSummary | null {
  if (reviews.length < 3) return null;
  const avg = (xs: number[]) => Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
  const aspects = Object.fromEntries(ASPECTS.map((a) => [a, avg(reviews.map((r) => r.ratings[a]))])) as Record<ReviewAspect, number>;
  return { count: reviews.length, overall: avg(ASPECTS.map((a) => aspects[a])), aspects };
}
