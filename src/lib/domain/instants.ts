import { dateTimeFormat, relativeTimeFormat } from "./date-format";
/**
 * Timestamps, as opposed to dates.
 *
 * `dates.ts` argues that a check-in date is a calendar date with no timezone,
 * and that dragging `Date` into it is how a booking shows the wrong day to the
 * diaspora users this product exists for. A message is the opposite kind of
 * value: it was sent at an instant, and the instant is the whole point of
 * showing it. Mixing the two in one module is how the first rule gets broken
 * by someone who only read the second, so they live apart.
 *
 * Everything renders in Kigali time. Not the viewer's zone: the concierge desk
 * that answers these threads is in Kigali, "I'll call you at nine" means nine
 * there, and a guest in Brussels reading 08:00 for a message the team sent at
 * 09:00 is worse than a guest who knows the clock is the office's. Fixing it
 * to one zone also keeps a server render and a client render from disagreeing.
 *
 * And on one clock: 24 hours, in every locale. `en` is tagged `en-US` for
 * formatting, which renders 16:31 as "04:31 PM" — next to a message body that
 * says "your flight lands at 19:40" that reads as two different products.
 * Rwanda writes and says the time in 24 hours, and this is a Rwandan clock.
 */
const CLOCK = { hourCycle: "h23" } as const;
export const OPERATING_TIMEZONE = "Africa/Kigali";

export function formatTimeOfDay(iso: string, locale: string): string {
  return dateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OPERATING_TIMEZONE,
    ...CLOCK,
  }).format(new Date(iso));
}

/** Day and time together, for a thread list where threads are months apart. */
export function formatStamp(iso: string, locale: string): string {
  return dateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: OPERATING_TIMEZONE,
    ...CLOCK,
  }).format(new Date(iso));
}

/** The calendar day an instant fell on in Kigali, for grouping a transcript. */
export function dayOf(iso: string): string {
  return dateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: OPERATING_TIMEZONE,
  }).format(new Date(iso));
}

/**
 * Today, or the day of any instant, in Kigali. What every "today" in the
 * product means: the arrivals board, refund windows, check-in release, the
 * Today and Yesterday groups in notifications. At 22:30 UTC it is already
 * tomorrow in Kigali, and a server in another zone must not decide otherwise.
 */
export function kigaliDay(instant: Date | string = new Date()): string {
  return dayOf(typeof instant === "string" ? instant : instant.toISOString());
}

/**
 * "12 minutes ago", "5 hours ago", "yesterday", "3 days ago", then a date.
 *
 * Yesterday means the Kigali calendar day before today, not 24 hours: a
 * message at 23:30 last night is yesterday's even at 08:00 this morning,
 * and that is how the notification panel's groups read too.
 */
export function formatAgo(iso: string, now: Date, locale: string): string {
  const rtf = relativeTimeFormat(locale);
  const seconds = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return rtf.format(0, "second");
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  const today = kigaliDay(now);
  const day = kigaliDay(iso);
  if (day === today) return rtf.format(-Math.floor(seconds / 3600), "hour");
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86_400_000,
  );
  if (days <= 6) return rtf.format(-days, "day");
  return dateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: OPERATING_TIMEZONE,
  }).format(new Date(iso));
}
