import { dateTimeFormat } from "./date-format";
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
  return dateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
    toUtc(date),
  );
}

export function formatDateRange(
  from: IsoDate,
  to: IsoDate,
  locale: string,
): string {
  return dateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).formatRange(toUtc(from), toUtc(to));
}

/* ------------------------------------------------------- calendar helpers */

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`;
}

/**
 * Which weekday a locale's week starts on. Monday across most of the world
 * including Rwanda and France, Sunday in the US — getting this wrong shifts
 * every column of the grid, which is the kind of error people notice
 * immediately and cannot explain.
 *
 * `weekInfo` is not in every runtime yet, so Monday is the fallback.
 */
export function firstDayOfWeek(locale: string): number {
  try {
    const info = (
      new Intl.Locale(locale) as Intl.Locale & {
        getWeekInfo?: () => { firstDay: number };
        weekInfo?: { firstDay: number };
      }
    );
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay;
    return first === 7 ? 0 : (first ?? 1);
  } catch {
    return 1;
  }
}

/** Weekday initials in the locale's own order, for the grid header. */
export function weekdayLabels(locale: string, format: "narrow" | "short" = "narrow"): string[] {
  const first = firstDayOfWeek(locale);
  const fmt = dateTimeFormat(locale, { weekday: format, timeZone: "UTC" });
  // 2024-01-07 is a Sunday, so offsetting from it lands on each weekday.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(new Date(Date.UTC(2024, 0, 7 + ((first + i) % 7)))),
  );
}

export function formatMonthTitle(month: IsoDate, locale: string): string {
  return dateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(toUtc(month));
}

export type CalendarCell = {
  date: IsoDate;
  /** False for the leading and trailing days that pad the grid. */
  inMonth: boolean;
};

/**
 * Six weeks of cells for a month, padded from the locale's first weekday.
 * Always six rows so the popover does not change height between months —
 * a grid that resizes as you page through it is genuinely unpleasant to use.
 */
export function monthGrid(month: IsoDate, locale: string): CalendarCell[] {
  const first = startOfMonth(month);
  const firstWeekday = toUtc(first).getUTCDay();
  const offset = (firstWeekday - firstDayOfWeek(locale) + 7) % 7;
  const gridStart = addDays(first, -offset);
  const monthPrefix = first.slice(0, 7);

  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inMonth: date.startsWith(monthPrefix) };
  });
}

export function isSameMonth(a: IsoDate, b: IsoDate): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function clampToRange(
  date: IsoDate,
  min?: IsoDate,
  max?: IsoDate,
): IsoDate {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

/* --------------------------------------------------------- quick ranges */

/** 0 = Sunday. */
export function weekdayOf(date: IsoDate): number {
  return toUtc(date).getUTCDay();
}

export type QuickRange = { key: string; from: IsoDate; to: IsoDate };

/**
 * The handful of ranges people actually pick, resolved to real dates.
 *
 * Most stays are one of these, and reaching them through a month grid is three
 * interactions for something that should be one. Resolving them here rather
 * than in the component keeps "what counts as this weekend" testable and out
 * of the UI.
 */
export function quickRanges(from: IsoDate = today()): QuickRange[] {
  const day = weekdayOf(from);

  // The coming Friday. Already Friday or Saturday means this weekend, not next.
  const toFriday = (5 - day + 7) % 7;
  const friday = addDays(from, day === 6 ? -1 : toFriday);

  // Monday of next week.
  const nextMonday = addDays(from, ((8 - day) % 7) || 7);

  return [
    { key: "tonight", from, to: addDays(from, 1) },
    { key: "tomorrow", from: addDays(from, 1), to: addDays(from, 2) },
    { key: "weekend", from: friday, to: addDays(friday, 2) },
    { key: "nextWeek", from: nextMonday, to: addDays(nextMonday, 7) },
  ];
}

/** Whole calendar months from one date to another, by month number. */
export function monthsBetween(from: IsoDate, to: IsoDate): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
