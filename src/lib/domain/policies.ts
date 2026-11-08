import type { ServiceKind } from "./types";
import type { Money } from "./money";
import { money, subtract } from "./money";
import type { Quote } from "./pricing";
import { addDays, nightsBetween, type IsoDate } from "./dates";

/**
 * The rules that turn a date into money: what comes back on a cancellation,
 * when the door code is released, how long dates are held.
 *
 * Every window counts Kigali days; callers pass `today` from `kigaliDay()`.
 * The numbers are the spec's placeholders, editable from admin settings.
 */

export type RefundRule =
  | "full"
  | "half"
  | "none"
  | "carFree"
  | "carOneDay"
  | "dayFree"
  | "dayPermitKept"
  | "dayNone";

export type RefundPreview = { refund: Money; kept: Money; rule: RefundRule; freeUntil: IsoDate | null };

const STAY_FREE_DEFAULT = 7;
const CAR_FREE_DEFAULT = 2;
const DAY_FREE_DEFAULT = 3;

const lineSum = (q: Quote, keys: string[]) =>
  q.lines.filter((l) => keys.includes(l.key)).reduce((s, l) => s + l.amount.minor, 0);

function split(total: Money, refundMinor: number, rule: RefundRule, freeUntil: IsoDate | null): RefundPreview {
  const refund = money(Math.max(0, Math.min(total.minor, refundMinor)), total.currency);
  return { refund, kept: subtract(total, refund), rule, freeUntil };
}

export function refundPreview(
  service: ServiceKind,
  quote: Quote,
  start: IsoDate,
  today: IsoDate,
  opts: { permitShare?: Money; hireDays?: number } = {},
  catalog?: { windows: Record<ServiceKind, number> },
): RefundPreview {
  const daysOut = nightsBetween(today, start);
  const STAY_FREE_DAYS = catalog?.windows.stay ?? STAY_FREE_DEFAULT;
  const CAR_FREE_DAYS = catalog?.windows.car ?? CAR_FREE_DEFAULT;
  const DAY_FREE_DAYS = catalog?.windows.experience ?? DAY_FREE_DEFAULT;
  const total = quote.total;

  if (service === "stay") {
    const freeUntil = addDays(start, -STAY_FREE_DAYS);
    if (daysOut >= STAY_FREE_DAYS) return split(total, total.minor, "full", freeUntil);
    if (daysOut >= 1) {
      // Half of what the nights cost after any discount; cleaning and extras
      // were never delivered, so they come back whole. The service fee stays.
      const nights = lineSum(quote, ["accommodation", "discount"]);
      const unused = lineSum(quote, ["cleaning", "extra"]);
      return split(total, Math.round(nights / 2) + unused, "half", freeUntil);
    }
    return split(total, 0, "none", freeUntil);
  }

  if (service === "car") {
    const freeUntil = addDays(start, -CAR_FREE_DAYS);
    if (daysOut >= CAR_FREE_DAYS) return split(total, total.minor, "carFree", freeUntil);
    const days = Math.max(1, opts.hireDays ?? quote.nights);
    return split(total, total.minor - Math.round(total.minor / days), "carOneDay", freeUntil);
  }

  const freeUntil = addDays(start, -DAY_FREE_DAYS);
  if (daysOut < DAY_FREE_DAYS) return split(total, 0, "dayNone", freeUntil);
  const permit = opts.permitShare?.minor ?? 0;
  // A park permit is bought in the guest's name and cannot be resold.
  if (permit > 0) return split(total, total.minor - permit, "dayPermitKept", freeUntil);
  return split(total, total.minor, "dayFree", freeUntil);
}

/** Check-in is at 14:00 Kigali; the door code and directions arrive 48 hours before. */
export const CHECK_IN_HOUR = 14;
const KIGALI_OFFSET_HOURS = 2;

export function checkInReleasedAt(start: IsoDate): string {
  const day = addDays(start, -2);
  return new Date(`${day}T${String(CHECK_IN_HOUR - KIGALI_OFFSET_HOURS).padStart(2, "0")}:00:00.000Z`).toISOString();
}

export function checkInReleased(start: IsoDate, now: Date): boolean {
  return now.getTime() >= Date.parse(checkInReleasedAt(start));
}

/** Dates are held for this long once someone starts paying. */
export const HOLD_MINUTES = 15;

export function holdSecondsLeft(startedAt: string, now: Date): number {
  const end = Date.parse(startedAt) + HOLD_MINUTES * 60_000;
  return Math.max(0, Math.floor((end - now.getTime()) / 1000));
}

/** What a change costs: positive to pay, negative to refund. */
export function changeDifference(before: Quote, after: Quote): Money {
  return subtract(after.total, before.total);
}
