import type { DriveMode, Experience, Listing, ServiceKind, Vehicle } from "@/lib/domain/types";
import type { CurrencyCode, FxTable, Money } from "@/lib/domain/money";
import { add, money } from "@/lib/domain/money";
import type { Quote } from "@/lib/domain/pricing";
import { toDisplayQuote } from "@/lib/domain/pricing";

/**
 * A trip being put together: a stay, a car, days out, paid once.
 *
 * Pure, so the rules are tested here and the cart's storage (lib/cart.ts)
 * only stores. The cart is off unless the guest turns it on; most bookings
 * are one thing, and a basket in front of them would add a step to every
 * one of them.
 */
export type CartItem = {
  id: string;
  kind: ServiceKind;
  slug: string;
  supplyId: string;
  title: string;
  start: string;
  end: string;
  party: number;
  driveMode?: DriveMode;
  image?: string;
  imageSeed?: string;
  /** Already paid (a stay booked before the cart was turned on): shown, never charged. */
  bookedReference?: string;
  quote: Quote;
  /** A snapshot of what is being booked, so checkout can ask the right questions without a fetch. */
  supply?: Listing | Vehicle | Experience;
};

export function cartItemId(kind: ServiceKind, slug: string, start: string, end: string, party: number): string {
  return `${kind}:${slug}:${start}:${end}:${party}`;
}

export type CartIssue = {
  code: "staysOverlap" | "carOutsideStay" | "dayOutsideStay" | "inPast";
  itemIds: string[];
  /** Blocking issues stop checkout; the rest are said and left to the guest. */
  blocking: boolean;
};

export function cartIssues(items: CartItem[], today: string): CartIssue[] {
  const open = items.filter((i) => !i.bookedReference);
  const stays = items.filter((i) => i.kind === "stay");
  const issues: CartIssue[] = [];

  for (const i of open) if (i.start < today) issues.push({ code: "inPast", itemIds: [i.id], blocking: true });

  // Two stays overlap when one starts before the other ends; meeting on a
  // changeover day is fine.
  const openStays = open.filter((i) => i.kind === "stay");
  for (const a of openStays) {
    for (const b of stays) {
      if (a.id >= b.id && !b.bookedReference) continue;
      if (a.id === b.id) continue;
      if (a.start < b.end && b.start < a.end) issues.push({ code: "staysOverlap", itemIds: [a.id, b.id], blocking: true });
    }
  }

  if (stays.length) {
    const inside = (from: string, to: string) => stays.some((s) => s.start <= from && to <= s.end);
    for (const i of open) {
      if (i.kind === "car" && !inside(i.start, i.end)) issues.push({ code: "carOutsideStay", itemIds: [i.id], blocking: false });
      if (i.kind === "experience" && !stays.some((s) => s.start <= i.start && i.start < s.end)) {
        issues.push({ code: "dayOutsideStay", itemIds: [i.id], blocking: false });
      }
    }
  }
  return issues;
}

export function cartBlocked(items: CartItem[], today: string): boolean {
  return cartIssues(items, today).some((i) => i.blocking) || !items.some((i) => !i.bookedReference);
}

/** The sum of each unpaid item's displayed total, so the cart adds up to what each card shows. */
export function cartTotal(items: CartItem[], currency: CurrencyCode, fx: FxTable): Money {
  return items
    .filter((i) => !i.bookedReference)
    .reduce((acc, i) => add(acc, toDisplayQuote(i.quote, currency, fx).total), money(0, currency));
}

const ORDER: Record<ServiceKind, number> = { stay: 0, car: 1, experience: 2 };

export function cartTimeline(items: CartItem[]): { date: string; items: CartItem[] }[] {
  const sorted = [...items].sort((a, b) => a.start.localeCompare(b.start) || ORDER[a.kind] - ORDER[b.kind]);
  const out: { date: string; items: CartItem[] }[] = [];
  for (const i of sorted) {
    const last = out.at(-1);
    if (last && last.date === i.start) last.items.push(i);
    else out.push({ date: i.start, items: [i] });
  }
  return out;
}
