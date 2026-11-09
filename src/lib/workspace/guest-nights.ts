import type { Booking } from "@/lib/domain/types";
import { addDays } from "@/lib/domain/dates";

/**
 * Nights in [from, from + nights) when anyone is staying in the home.
 *
 * Not the same question as "is it fully booked": a home with two units and
 * one guest still has room to sell, but a repair there happens around
 * that guest. Maintenance asks this one.
 */
export function nightsWithGuests(bookings: Booking[], listingId: string, from: string, nights: number): string[] {
  const live = bookings.filter((b) => b.supplyItemId === listingId && (b.status === "confirmed" || b.status === "active"));
  return Array.from({ length: nights }, (_, i) => addDays(from, i)).filter((d) => live.some((b) => b.startDate <= d && d < b.endDate));
}
