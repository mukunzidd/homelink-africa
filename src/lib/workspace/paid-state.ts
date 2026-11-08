import type { Booking, PaymentRecord } from "@/lib/domain/types";
import { money, type Money } from "@/lib/domain/money";

export const STATUS_TONE = { draft: "idle", confirmed: "ok", active: "ok", completed: "idle", cancelled: "crit" } as const;

/**
 * Paid in full, part paid (a deposit), refunded, or nothing yet: worked
 * out from the payments, not trusted from the booking. A one-unit
 * tolerance covers the rounding checkout already allows.
 */
export function paidState(b: Booking, payments: PaymentRecord[]): "paid" | "part" | "refunded" | "none" {
  let paid = 0;
  let back = 0;
  for (const p of payments) {
    if (p.bookingId !== b.id || p.amount.currency !== b.total.currency) continue;
    if (p.kind === "refund") {
      if (p.status === "succeeded") back += p.amount.minor;
    } else if (p.status === "succeeded") paid += p.amount.minor;
    // Older records mark the original payment itself as refunded.
    else if (p.status === "refunded") back += p.amount.minor;
  }
  if (back > 0) return "refunded";
  if (paid === 0) return "none";
  return paid + 1 >= b.total.minor ? "paid" : "part";
}

/** What was paid for a booking and has not been given back, in the booking's currency. */
export function refundableOf(b: Booking, payments: PaymentRecord[]): Money {
  let left = 0;
  for (const p of payments) {
    if (p.bookingId !== b.id || p.status !== "succeeded" || p.amount.currency !== b.total.currency) continue;
    left += p.kind === "refund" ? -p.amount.minor : p.amount.minor;
  }
  return money(Math.max(0, left), b.total.currency);
}
