import type { Money } from "@/lib/domain/money";
import type { PaymentRecord } from "@/lib/domain/types";
import { addDays, type IsoDate } from "@/lib/domain/dates";

export type RentInstalment = {
  due: IsoDate;
  amount: Money;
  status: "paid" | "due" | "overdue" | "upcoming";
  paymentId?: string;
};

/** The same day of month as the start, or the month's last day if it is shorter. */
function monthly(start: IsoDate, i: number): IsoDate {
  const [y, m, d] = start.split("-").map(Number);
  const n = y * 12 + (m - 1) + i;
  const yy = Math.floor(n / 12);
  const mm = (n % 12) + 1;
  const last = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  return `${yy}-${String(mm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/**
 * A renting tenant's year, month by month. Rent payments are matched to
 * instalments in order, so a payment made a day late still pays the month
 * it was for. "Due" is the five days up to and including the due day;
 * after that it is overdue.
 */
export function rentSchedule(
  start: IsoDate,
  months: number,
  amount: Money,
  payments: PaymentRecord[],
  today: IsoDate,
): RentInstalment[] {
  const paidRent = payments
    .filter((p) => (p.kind === "rent" || p.kind === "full" || p.kind === "deposit") && p.status === "succeeded")
    .sort((a, b) => a.at.localeCompare(b.at));
  return Array.from({ length: months }, (_, i) => {
    const due = monthly(start, i);
    const p = paidRent[i];
    if (p) return { due, amount, status: "paid" as const, paymentId: p.id };
    const status = due < today ? "overdue" : addDays(due, -5) <= today ? "due" : "upcoming";
    return { due, amount, status };
  });
}
