import type { ServiceKind } from "./types";
import type { Money } from "./money";
import { money } from "./money";
import type { QuoteLine } from "./pricing";

/**
 * What can be added to a booking, and what each costs.
 *
 * Prices are placeholders, in RWF, from the spec; admin settings will edit
 * them. The unit decides the arithmetic: a pickup is once, a mid-stay clean
 * is per visit, a child seat is per day of hire.
 */
export type ExtraKey =
  | "airportPickup"
  | "earlyCheckIn"
  | "lateCheckout"
  | "groceries"
  | "cot"
  | "midStayClean"
  | "childSeat"
  | "fullInsurance";

export type ExtraUnit = "perBooking" | "perVisit" | "perDay";
export type ExtraSelection = { key: ExtraKey; quantity: number };

export const EXTRAS: Record<ExtraKey, { lane: ServiceKind; price: Money; unit: ExtraUnit; maxQuantity: number }> = {
  airportPickup: { lane: "stay", price: money(25_000, "RWF"), unit: "perBooking", maxQuantity: 1 },
  earlyCheckIn: { lane: "stay", price: money(20_000, "RWF"), unit: "perBooking", maxQuantity: 1 },
  lateCheckout: { lane: "stay", price: money(20_000, "RWF"), unit: "perBooking", maxQuantity: 1 },
  groceries: { lane: "stay", price: money(40_000, "RWF"), unit: "perBooking", maxQuantity: 1 },
  cot: { lane: "stay", price: money(0, "RWF"), unit: "perBooking", maxQuantity: 2 },
  midStayClean: { lane: "stay", price: money(15_000, "RWF"), unit: "perVisit", maxQuantity: 8 },
  childSeat: { lane: "car", price: money(5_000, "RWF"), unit: "perDay", maxQuantity: 3 },
  fullInsurance: { lane: "car", price: money(15_000, "RWF"), unit: "perDay", maxQuantity: 1 },
};

export function extrasFor(lane: ServiceKind): ExtraKey[] {
  return (Object.keys(EXTRAS) as ExtraKey[]).filter((k) => EXTRAS[k].lane === lane);
}

/**
 * One quote line per chosen extra. Anything not on this lane's menu, any
 * key the menu does not know, and any quantity of zero or less is dropped,
 * not priced: a doctored request cannot add a line the guest never saw.
 * A free extra (the cot) stays on the bill at zero, so the guest can see it
 * was asked for.
 */
export function priceExtras(lane: ServiceKind, selected: ExtraSelection[], days: number): QuoteLine[] {
  const lines: QuoteLine[] = [];
  for (const { key, quantity } of selected) {
    const extra = EXTRAS[key];
    if (!extra || extra.lane !== lane || !(quantity > 0)) continue;
    const qty = Math.min(Math.floor(quantity), extra.maxQuantity);
    const times = extra.unit === "perDay" ? qty * Math.max(1, days) : qty;
    lines.push({ key: "extra", extra: key, amount: money(extra.price.minor * times, extra.price.currency) });
  }
  return lines;
}
