import { addDays, weekdayOf, type IsoDate } from "./dates";

const STARTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

/**
 * Viewing times for a home for sale: Monday to Saturday, an hour each,
 * starting 09:00 to 16:00 Kigali, minus the ones already taken. Sunday is
 * the team's day off, so it is not offered rather than offered and then
 * declined. A day with nothing left is left out.
 */
export function viewingSlots(
  from: IsoDate,
  days: number,
  taken: { date: IsoDate; time: string }[],
): { date: IsoDate; times: string[] }[] {
  const out: { date: IsoDate; times: string[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    if (weekdayOf(date) === 0) continue;
    const times = STARTS.filter((t) => !taken.some((x) => x.date === date && x.time === t));
    if (times.length) out.push({ date, times });
  }
  return out;
}
