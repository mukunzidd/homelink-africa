import type { Block, Booking, PaymentRecord } from "@/lib/domain/types";
import { addDays } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";

/** One payment per fixture booking, so the payments screens have rows. */
export function seedPayments(bookings: Booking[]): PaymentRecord[] {
  return bookings.map((b, i) => ({
    id: `pmt_${String(i + 1).padStart(3, "0")}`,
    bookingId: b.id,
    rail: i % 2 ? "mobileMoney" : "card",
    kind: "full",
    amount: b.total,
    status: b.status === "cancelled" ? "refunded" : "succeeded",
    at: `${addDays(b.startDate, -21)}T09:30:00.000Z`,
  }));
}

/**
 * Maintenance on two homes, a week and a fortnight out, so the calendar and
 * the "dates taken" state both have something real to show.
 */
export function seedBlocks(now: Date): Block[] {
  const today = kigaliDay(now);
  const out: Block[] = [];
  for (let i = 0; i < 3; i++) out.push({ supplyId: "lst_kiyovu_apartment", date: addDays(today, 7 + i), reason: "maintenance" });
  for (let i = 0; i < 2; i++) out.push({ supplyId: "lst_rebero_hilltop", date: addDays(today, 14 + i), reason: "maintenance" });
  return out;
}
