import type { Booking } from "@/lib/domain/types";

/**
 * The desk's day: who arrives, who leaves, who is in, and which homes turn
 * over (one guest out and another in on the same day, the tightest job the
 * cleaners have). Stays only; cancelled bookings are on no list.
 */
export function dayBoard(bookings: Booking[], date: string) {
  const live = bookings.filter((b) => b.service === "stay" && b.status !== "cancelled" && b.stayMode !== "lease");
  const arrivals = live.filter((b) => b.startDate === date);
  const departures = live.filter((b) => b.endDate === date);
  const inHouse = live.filter((b) => b.startDate < date && date < b.endDate);
  const turnovers = departures.flatMap((out) => {
    const next = arrivals.find((a) => a.supplyItemId === out.supplyItemId);
    return next ? [{ listingId: out.supplyItemId, out, in: next }] : [];
  });
  return { arrivals, departures, inHouse, turnovers };
}

export type TurnoverTask = {
  listingId: string;
  date: string;
  from: "11:00";
  until: "14:00" | "end of day";
  outBookingId: string;
  nextBookingId?: string;
};

/** A cleaning window for every departure: checkout to the next check-in, if any. */
export function turnoverTasks(bookings: Booking[], date: string): TurnoverTask[] {
  const { departures, arrivals } = dayBoard(bookings, date);
  return departures.map((out) => {
    const next = arrivals.find((a) => a.supplyItemId === out.supplyItemId);
    return {
      listingId: out.supplyItemId,
      date,
      from: "11:00",
      until: next ? "14:00" : "end of day",
      outBookingId: out.id,
      ...(next ? { nextBookingId: next.id } : {}),
    };
  });
}
