/**
 * Money is never a float. Technical Plan §4.
 *
 * Every monetary value is an integer count of minor units plus an ISO 4217
 * code. Nothing in the app divides by 100 — the exponent varies by currency,
 * and RWF is the one that bites: it has ZERO decimal places, so a naive
 * `minor / 100` renders RWF 165,000 as RWF 1,650.
 */

export const CURRENCIES = ["RWF", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export type Money = {
  /** Integer count of the currency's minor unit. Never fractional. */
  readonly minor: number;
  readonly currency: CurrencyCode;
};

/**
 * ISO 4217 minor-unit exponents. RWF is a zero-decimal currency: its minor
 * unit IS the franc. JPY, KRW and several others behave the same way, so this
 * table is the single place that knowledge lives.
 */
const EXPONENT: Record<CurrencyCode, number> = {
  RWF: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export function exponentOf(currency: CurrencyCode): number {
  return EXPONENT[currency];
}

export function money(minor: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(minor)) {
    throw new Error(
      `Money.minor must be an integer number of minor units, got ${minor} (${currency}). ` +
        `Build it from a major amount with fromMajor() instead.`,
    );
  }
  return { minor, currency };
}

/** Build Money from a human-facing amount, e.g. fromMajor(128.5, "USD"). */
export function fromMajor(major: number, currency: CurrencyCode): Money {
  const factor = 10 ** EXPONENT[currency];
  return { minor: Math.round(major * factor), currency };
}

/** The major-unit value, for Intl formatting only. Never for arithmetic. */
export function toMajor(m: Money): number {
  return m.minor / 10 ** EXPONENT[m.currency];
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot combine ${a.currency} with ${b.currency}. Convert through the FX rate first.`,
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor + b.minor, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { minor: a.minor - b.minor, currency: a.currency };
}

/** Multiply by a whole count, e.g. a nightly rate by 3 nights. */
export function multiply(m: Money, factor: number): Money {
  return { minor: Math.round(m.minor * factor), currency: m.currency };
}

export function sum(items: readonly Money[], currency: CurrencyCode): Money {
  return items.reduce<Money>(
    (acc, item) => add(acc, item),
    { minor: 0, currency },
  );
}

export function isZero(m: Money): boolean {
  return m.minor === 0;
}

/**
 * Render for display. Intl already knows each currency's fraction digits, so
 * passing the correct major value is the only thing we have to get right.
 */
/**
 * The tag to format numbers with, given any locale tag. Kinyarwanda's CLDR
 * data groups thousands with a period, which reads as a decimal point in
 * Rwanda, and browsers do not carry Kinyarwanda at all, so the server and
 * the client would also disagree. rw becomes en-RW, as NUMBER_LOCALES says;
 * doing it here means a caller who passes the date locale still gets
 * "RWF 157,096". Several workspace pages did, and showed "RWF 157.096".
 */
export function numberLocale(locale: string): string {
  return /^rw(-|$)/i.test(locale) ? "en-RW" : locale;
}

export function formatMoney(
  m: Money,
  locale: string,
  options: { showDecimals?: boolean } = {},
): string {
  const exponent = EXPONENT[m.currency];
  const digits = options.showDecimals === false ? 0 : exponent;

  return new Intl.NumberFormat(numberLocale(locale), {
    style: "currency",
    currency: m.currency,
    /**
     * RWF prints as the ISO code, not as a symbol.
     *
     * CLDR's symbol for the Rwandan franc is "RF", which is not what anyone in
     * Kigali writes — invoices, banks and the revenue authority all use "RWF"
     * or "Frw", and so do HomeLink's own product documents. The other three
     * currencies keep their narrow symbols, because $, € and £ are read
     * instantly and a code would only add noise.
     */
    currencyDisplay: m.currency === "RWF" ? "code" : "narrowSymbol",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toMajor(m));
}

/**
 * FX for display only. Settlement rates are recorded per transaction against
 * the ledger in Phase 2; this exists so a diaspora user can see USD while the
 * listing is priced in RWF.
 */
export type FxTable = Readonly<Record<CurrencyCode, number>>;

export function convert(m: Money, to: CurrencyCode, fx: FxTable): Money {
  if (m.currency === to) return m;

  const inBase = toMajor(m) / fx[m.currency];
  const inTarget = inBase * fx[to];
  return fromMajor(inTarget, to);
}
