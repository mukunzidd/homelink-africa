import type { JobOffer, Role } from "@/lib/domain/types";

/**
 * The partner a preview role stands for. There are no accounts yet, so the
 * driver role is Eric H. and the guide role is Solange K., the names the
 * seeded threads, jobs and payouts already use. Phase 2 reads this from
 * the signed-in user instead.
 */
export function partnerFor(role: Role): string | null {
  if (role === "driver") return "ptn_eric";
  if (role === "guide") return "ptn_solange";
  return null;
}

/**
 * Offers a partner can still answer: offered, and either open-ended or not
 * yet past their deadline. The time is passed in so the page that calls it
 * stays a pure render and the rule can be tested at the exact edge.
 */
export function openOffers(jobs: JobOffer[], now: Date): JobOffer[] {
  return jobs.filter((j) => j.status === "offered" && (!j.offerExpiresAt || Date.parse(j.offerExpiresAt) > now.getTime()));
}
