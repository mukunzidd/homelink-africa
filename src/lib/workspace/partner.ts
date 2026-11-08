import type { Role } from "@/lib/domain/types";

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
