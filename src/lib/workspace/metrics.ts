import type { Booking } from "@/lib/domain/types";
import { addDays, nightsBetween } from "@/lib/domain/dates";
import { convert, money, type CurrencyCode, type FxTable, type Money } from "@/lib/domain/money";
import { kigaliDay } from "@/lib/domain/instants";

/** The Kigali day a booking was placed: its placed event, or its start when the record has none. */
export function placedOn(b: Booking): string {
  const at = b.timeline?.find((e) => e.kind === "placed")?.at;
  return at ? kigaliDay(new Date(at)) : b.startDate;
}

/**
 * Share of nights in [from, to) with someone staying, 0 to 1. A night
 * counts once however many bookings cover it, so two overlapping stays in
 * a two-unit home do not make 200%. Cancelled stays count nothing.
 */
export function occupancy(bookings: Booking[], listingId: string, from: string, to: string): number {
  const total = nightsBetween(from, to);
  if (total <= 0) return 0;
  const live = bookings.filter((b) => b.supplyItemId === listingId && b.status !== "cancelled");
  let booked = 0;
  for (let d = from; d < to; d = addDays(d, 1)) if (live.some((b) => b.startDate <= d && d < b.endDate)) booked++;
  return booked / total;
}

/** What bookings placed in [from, to) brought in, less what has been given back, in one currency. */
export function revenue(bookings: Booking[], from: string, to: string, currency: CurrencyCode, fx: FxTable): Money {
  const minor = bookings
    .filter((b) => {
      const p = placedOn(b);
      return p >= from && p < to;
    })
    .reduce((n, b) => {
      const gross = convert(b.total, currency, fx).minor;
      const back = b.refund ? convert(b.refund, currency, fx).minor : 0;
      return n + gross - back;
    }, 0);
  return money(minor, currency);
}

/** Bookings placed in each of the last `weeks` seven-day spans, oldest first, the last ending today. */
export function weeklySeries(bookings: Booking[], weeks: number, today: string): number[] {
  const days = bookings.map(placedOn);
  return Array.from({ length: weeks }, (_, i) => {
    const end = addDays(today, -7 * (weeks - 1 - i));
    const start = addDays(end, -6);
    return days.filter((d) => d >= start && d <= end).length;
  });
}
