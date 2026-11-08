import type { Money } from "./money";
import { money } from "./money";
import type { Quote } from "./pricing";
import type { IsoDate } from "./dates";

export type PromoResult =
  | { ok: true; code: string; discount: Money }
  | { ok: false; code: string; reason: "unknown" | "expired" | "notApplicable" };

/**
 * Promo codes. One for now, from the spec; admin settings will list more.
 * A code takes a share of the accommodation line only, never of fees or
 * extras, and is capped, so a long stay cannot turn it into a large refund.
 */
const CODES: Record<string, { percent: number; capRwf: number; validUntil: IsoDate }> = {
  KARIBU10: { percent: 10, capRwf: 50_000, validUntil: "2027-12-31" },
};

export function applyPromo(raw: string, quote: Quote, on: IsoDate): PromoResult {
  const code = raw.trim().toUpperCase();
  const promo = CODES[code];
  if (!promo) return { ok: false, code, reason: "unknown" };
  if (on > promo.validUntil) return { ok: false, code, reason: "expired" };
  const base = quote.lines.find((l) => l.key === "accommodation");
  // The cap is in RWF. A stay priced in anything else is refused rather than
  // compared across currencies, which would let the cap mean 50,000 dollars.
  if (!base || base.amount.currency !== "RWF") return { ok: false, code, reason: "notApplicable" };
  const off = Math.min(Math.round((base.amount.minor * promo.percent) / 100), promo.capRwf);
  return { ok: true, code, discount: money(off, base.amount.currency) };
}
