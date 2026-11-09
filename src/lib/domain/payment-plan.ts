import type { FxTable, Money } from "./money";
import { convert, money, subtract } from "./money";
import type { Quote } from "./pricing";
import { addDays, nightsBetween, type IsoDate } from "./dates";

export type DepositPlan =
  | { offered: false }
  | { offered: true; now: Money; balance: Money; balanceDue: IsoDate };

const MIN_NIGHTS = 28;
const MIN_TOTAL_RWF = 1_000_000;
const DEPOSIT_SHARE = 0.3;
const BALANCE_DAYS_BEFORE = 14;

/**
 * Pay 30% now and the rest 14 days before arrival, on long or large stays.
 *
 * Only offered when arrival is at least 14 days away: the balance date
 * would otherwise be in the past, and a plan whose second payment is due
 * yesterday is a full payment with extra steps.
 */
/** When the rest of a deposit-plan booking is due: the one rule, for the plan and for every page that shows it. */
export function balanceDueOn(start: IsoDate): IsoDate {
  return addDays(start, -BALANCE_DAYS_BEFORE);
}

export function depositPlan(quote: Quote, start: IsoDate, on: IsoDate, fx: FxTable): DepositPlan {
  if (!quote.lines.some((l) => l.key === "accommodation")) return { offered: false };
  const big = convert(quote.total, "RWF", fx).minor >= MIN_TOTAL_RWF;
  if (quote.nights < MIN_NIGHTS && !big) return { offered: false };
  if (nightsBetween(on, start) < BALANCE_DAYS_BEFORE) return { offered: false };
  const now = money(Math.round(quote.total.minor * DEPOSIT_SHARE), quote.total.currency);
  return {
    offered: true,
    now,
    balance: subtract(quote.total, now),
    balanceDue: balanceDueOn(start),
  };
}
