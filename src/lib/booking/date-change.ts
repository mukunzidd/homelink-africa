import { isIsoDate } from "@/lib/domain/dates";
import type { Booking } from "@/lib/domain/types";

/**
 * Which new dates a booking may take, and which nights then need checking
 * for room. Null when the change is not allowed.
 *
 * A booking still ahead moves to any dates from today on, and the whole new
 * stay is checked. A stay under way can only run longer ("Stay longer"): it
 * keeps the day it began, ends later than it did, and only the nights it
 * adds are checked, since the ones already lived in are its own. Anything
 * ended or cancelled does not move; new dates there would be a new booking.
 *
 * One rule for the preview the guest sees and for the change itself, so the
 * dialog never offers what the booking will then refuse.
 */
export function dateChange(
  b: Pick<Booking, "status" | "startDate" | "endDate">,
  start: string,
  end: string,
  today: string,
): { from: string; to: string } | null {
  // A car hired for one day starts and ends on the same date; a stay of no
  // nights is refused by its minimum stay, not here.
  if (!isIsoDate(start) || !isIsoDate(end) || end < start) return null;
  if (b.status === "confirmed" && b.startDate > today) return start >= today ? { from: start, to: end } : null;
  if (b.status === "active" || (b.status === "confirmed" && b.startDate <= today)) {
    return start === b.startDate && end > b.endDate && end > today ? { from: b.endDate, to: end } : null;
  }
  return null;
}
