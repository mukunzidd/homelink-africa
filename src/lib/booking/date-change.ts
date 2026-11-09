import { isIsoDate } from "@/lib/domain/dates";
import type { Booking, Listing } from "@/lib/domain/types";
import { quoteStay, type QuoteLine } from "@/lib/domain/pricing";
import { money, type Money } from "@/lib/domain/money";

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

/**
 * What staying longer adds: the added nights and the service fee on them,
 * at today's rates. The nights already lived in keep the price they were
 * paid at, and there is no second cleaning fee, so a stay that runs longer
 * only ever costs more. Re-pricing the whole stay instead would refund a
 * guest when the home got cheaper since, or charge them again for a rate
 * that went up after they arrived.
 */
export function extensionPrice(
  listing: Listing,
  b: Pick<Booking, "total" | "lines">,
  from: string,
  to: string,
): { extra: Money; total: Money; lines: QuoteLine[] } | null {
  const q = quoteStay(listing, from, to);
  if (!q || q.total.currency !== b.total.currency) return null;
  const added = q.lines.filter((l) => l.key !== "cleaning");
  const extra = money(added.reduce((n, l) => n + l.amount.minor, 0), b.total.currency);
  const lines = [...(b.lines ?? [])];
  for (const l of added) {
    const i = lines.findIndex((x) => x.key === l.key);
    if (i >= 0) lines[i] = { ...lines[i], amount: money(lines[i].amount.minor + l.amount.minor, l.amount.currency) };
    else lines.push(l);
  }
  return { extra, total: money(b.total.minor + extra.minor, b.total.currency), lines };
}
