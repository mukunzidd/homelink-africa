import type { DriveMode, Experience, Listing, ServiceKind, Vehicle } from "./types";
import type { CurrencyCode, FxTable, Money } from "./money";
import { add, convert, money, multiply, subtract } from "./money";
import { nightsBetween, type IsoDate } from "./dates";
import { priceExtras, type ExtraKey, type ExtraSelection } from "./extras";
import { applyPromo, type PromoResult } from "./promo";

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

export type QuoteLineKey =
  | "accommodation"
  | "cleaning"
  | "serviceFee"
  | "hire"
  | "driver"
  | "seats"
  /** One chosen extra; `QuoteLine.extra` says which. */
  | "extra"
  /** A promo code. Always negative. */
  | "discount";

export type QuoteLine = {
  key: QuoteLineKey;
  amount: Money;
  extra?: ExtraKey;
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
 * Hire quote. Priced per day, so the pickup day counts — unlike a stay, where
 * the check-out day is not a night.
 */
export function quoteVehicle(
  vehicle: Vehicle,
  from: IsoDate,
  to: IsoDate,
  driveMode: DriveMode,
): Quote | null {
  const days = nightsBetween(from, to) + 1;
  if (days < 1) return null;

  const currency = vehicle.dailyRate.currency;
  const hire = multiply(vehicle.dailyRate, days);

  const lines: QuoteLine[] = [{ key: "hire", amount: hire }];

  if (driveMode === "withDriver" && vehicle.withDriverSupplement?.minor) {
    lines.push({
      key: "driver",
      amount: multiply(vehicle.withDriverSupplement, days),
    });
  }

  const subtotal = lines.reduce<Money>(
    (acc, line) => add(acc, line.amount),
    money(0, currency),
  );
  const serviceFee = money(
    Math.round(subtotal.minor * SERVICE_FEE_RATE),
    currency,
  );
  lines.push({ key: "serviceFee", amount: serviceFee });

  const total = add(subtotal, serviceFee);

  return {
    nights: days,
    lines,
    total,
    // A car is handed over in person and can be refused on the spot, so escrow
    // is not the mechanism that protects it. Deposits are a Phase 2 concern.
    escrowHeld: false,
  };
}

/**
 * Experience quote. Priced per person, on one date.
 */
export function quoteExperience(
  experience: Experience,
  party: number,
): Quote | null {
  if (party < 1) return null;

  const currency = experience.pricePerPerson.currency;
  const seats = multiply(experience.pricePerPerson, party);
  const serviceFee = money(Math.round(seats.minor * SERVICE_FEE_RATE), currency);

  const lines: QuoteLine[] = [
    { key: "seats", amount: seats },
    { key: "serviceFee", amount: serviceFee },
  ];

  return {
    nights: 0,
    lines,
    total: add(seats, serviceFee),
    // Permits and guides are paid forward before the day, so funds are not
    // held. The refund policy carries the guarantee instead.
    escrowHeld: false,
  };
}

/**
 * A guest's total, split into what HomeLink keeps and what reaches the supplier.
 *
 * The service fee is added on top of the supplier's price, so the supplier's
 * share is everything except the fee: the rate times the units, plus the
 * cleaning fee on a stay. A booking only stores its total, so the fee is
 * recovered by inverting the quote arithmetic rather than by multiplying the
 * total by the rate, which would charge commission on the commission and on
 * the cleaning.
 *
 * The inversion is exact for any total a quote produced: the fee is rounded
 * to a whole minor unit, so the error it puts into the base is under half a
 * unit after dividing by (1 + rate), and rounding the base recovers it. A
 * total typed into a fixture by hand comes out as the nearest quote would.
 */
export function supplierShare(
  total: Money,
  kind: ServiceKind,
): { gross: Money; fee: Money; net: Money } {
  const extras = kind === "stay" ? Math.min(CLEANING_FEE_RWF, total.minor) : 0;
  const feeBase = Math.round((total.minor - extras) / (1 + SERVICE_FEE_RATE));
  const fee = money(total.minor - extras - feeBase, total.currency);
  return { gross: total, fee, net: subtract(total, fee) };
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
    ...line,
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

export type QuoteInput = {
  kind: ServiceKind;
  start: IsoDate;
  end: IsoDate;
  party: number;
  driveMode?: DriveMode;
  extras?: ExtraSelection[];
  promoCode?: string;
};

/**
 * The whole price of a booking: the lane's base quote, then the extras,
 * then a promo code, then escrow decided on the final total.
 *
 * This is what the server runs when a booking is placed. The browser shows
 * the same function's answer, but the server never takes the browser's
 * number for it.
 */
export function quoteBooking(
  supply: Listing | Vehicle | Experience,
  input: QuoteInput,
  on: IsoDate,
): (Quote & { promo?: PromoResult }) | null {
  const base =
    input.kind === "stay"
      ? quoteStay(supply as Listing, input.start, input.end)
      : input.kind === "car"
        ? quoteVehicle(supply as Vehicle, input.start, input.end, input.driveMode ?? "selfDrive")
        : quoteExperience(supply as Experience, input.party);
  if (!base) return null;

  const currency = base.total.currency;
  const extras = priceExtras(input.kind, input.extras ?? [], base.nights).filter(
    // Extras are priced in RWF; a lane priced in another currency has none.
    (l) => l.amount.currency === currency,
  );
  const lines: QuoteLine[] = [...base.lines, ...extras];

  let promo: PromoResult | undefined;
  if (input.promoCode?.trim()) {
    promo = applyPromo(input.promoCode, base, on);
    if (promo.ok && promo.discount.minor > 0) {
      lines.push({ key: "discount", amount: money(-promo.discount.minor, currency) });
    }
  }

  const total = lines.reduce<Money>((acc, l) => add(acc, l.amount), money(0, currency));
  return {
    nights: base.nights,
    lines,
    total,
    escrowHeld: input.kind === "stay" && total.minor >= ESCROW_THRESHOLD_RWF,
    ...(promo ? { promo } : {}),
  };
}
