import type { Listing } from "./types";
import type { CurrencyCode, FxTable, Money } from "./money";
import { add, convert, money, multiply } from "./money";
import { nightsBetween, type IsoDate } from "./dates";

/**
 * Quote arithmetic, in the supplier's own currency.
 *
 * Everything here stays in the listing's currency; conversion happens once, at
 * the display boundary, through `toDisplayQuote`.
 */

/** Flat cleaning fee per stay, in RWF. Fixture-level until suppliers set it. */
const CLEANING_FEE_RWF = 32_000;

/** HomeLink's commission, as a fraction of the accommodation subtotal. */
const SERVICE_FEE_RATE = 0.1076;

/**
 * Stays at or above this hold funds until check-in is confirmed.
 * Product & UX §7 scopes escrow to high-value stays; this is where that line
 * currently sits.
 */
const ESCROW_THRESHOLD_RWF = 300_000;

export type QuoteLine = {
  key: "accommodation" | "cleaning" | "serviceFee";
  amount: Money;
};

export type Quote = {
  nights: number;
  lines: QuoteLine[];
  total: Money;
  /** True when funds are held until check-in is confirmed. */
  escrowHeld: boolean;
};

export function quoteStay(
  listing: Listing,
  from: IsoDate,
  to: IsoDate,
): Quote | null {
  const nights = nightsBetween(from, to);
  if (nights < 1) return null;

  const currency = listing.nightlyRate.currency;

  const accommodation = multiply(listing.nightlyRate, nights);
  const cleaning = money(CLEANING_FEE_RWF, currency);
  const serviceFee = money(
    Math.round(accommodation.minor * SERVICE_FEE_RATE),
    currency,
  );

  const lines: QuoteLine[] = [
    { key: "accommodation", amount: accommodation },
    { key: "cleaning", amount: cleaning },
    { key: "serviceFee", amount: serviceFee },
  ];

  const total = lines.reduce<Money>(
    (acc, line) => add(acc, line.amount),
    money(0, currency),
  );

  return {
    nights,
    lines,
    total,
    escrowHeld: total.minor >= ESCROW_THRESHOLD_RWF,
  };
}

/**
 * Restate a quote in the viewer's currency.
 *
 * The displayed total is the SUM OF THE DISPLAYED LINES, not a separately
 * converted total. Those two differ: rounding each line to the cent and
 * rounding the total independently disagree on roughly a third of real
 * date-and-currency combinations, which puts a checkout on screen whose
 * numbers do not add up. Deriving the total from the lines costs at most one
 * cent against the settled amount and is always internally consistent — and
 * the settled amount is stated separately anyway, because the charge happens
 * in the supplier's currency.
 */
export function toDisplayQuote(
  quote: Quote,
  currency: CurrencyCode,
  fx: FxTable,
): Quote & { settledTotal: Money; converted: boolean } {
  if (currency === quote.total.currency) {
    return { ...quote, settledTotal: quote.total, converted: false };
  }

  const lines = quote.lines.map((line) => ({
    key: line.key,
    amount: convert(line.amount, currency, fx),
  }));

  const total = lines.reduce<Money>(
    (acc, line) => add(acc, line.amount),
    money(0, currency),
  );

  return {
    ...quote,
    lines,
    total,
    settledTotal: quote.total,
    converted: true,
  };
}

/**
 * A booking reference a person can read aloud over a bad phone line.
 * Deterministic from its inputs so the shell shows a stable value on reload.
 */
export function bookingReference(seed: string): string {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[hash % ALPHABET.length];
    hash = Math.floor(hash / ALPHABET.length) + i * 7919;
  }
  return `HL-${out.slice(0, 4)}-${out.slice(4)}`;
}
