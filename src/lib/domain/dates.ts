/**
 * Dates as plain `YYYY-MM-DD` strings.
 *
 * A stay's check-in date is a calendar date, not an instant: 14 November is
 * 14 November whether the guest is in Kigali or Brussels. Using `Date` here
 * would drag a timezone into a value that has none, and the classic symptom is
 * a booking that shows the wrong day for exactly the diaspora users we care
 * most about.
 */
export type IsoDate = string;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const next = toUtc(date);
  next.setUTCDate(next.getUTCDate() + days);
  return fromUtc(next);
}

/** Nights between two dates. Check-out day is not a night. */
export function nightsBetween(from: IsoDate, to: IsoDate): number {
  const ms = toUtc(to).getTime() - toUtc(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function isBefore(a: IsoDate, b: IsoDate): boolean {
  return a < b; // ISO dates sort lexicographically
}

export function today(): IsoDate {
  return fromUtc(new Date());
}

/** Render for the active locale. Never pre-format a date in fixtures. */
export function formatDate(
  date: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    toUtc(date),
  );
}

export function formatDateRange(
  from: IsoDate,
  to: IsoDate,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(toUtc(from), toUtc(to));
}
