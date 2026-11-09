/**
 * Field rules for every booking form, shared by the browser and the server.
 *
 * Moved out of the checkout form so the server can run the same checks when
 * a booking is placed: a form that only validates in the browser validates
 * nothing. Light checks on shape, not on existence; whether a card is real
 * is the payment provider's question, and Phase 2 asks it.
 */

export type FieldId =
  | "guest-name"
  | "guest-email"
  | "guest-phone"
  | "card-number"
  | "card-name"
  | "card-expiry"
  | "card-cvc"
  | "momo-number";

export const digits = (v: string) => v.replace(/\D/g, "");

export const VALID: Record<FieldId, (v: string) => boolean> = {
  "guest-name": (v) => v.trim().length >= 2,
  "guest-email": (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  // Nine digits is a Rwandan number without the 0; a visitor's number with
  // its country code is longer.
  "guest-phone": (v) => digits(v).length >= 9 && digits(v).length <= 15,
  "card-number": (v) => digits(v).length >= 13 && digits(v).length <= 19,
  "card-name": (v) => v.trim().length >= 2,
  "card-expiry": (v) => {
    const m = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(v);
    if (!m) return false;
    // A card is good to the end of its expiry month.
    const now = new Date();
    const expires = new Date(2000 + Number(m[2]), Number(m[1]), 1);
    return expires > now;
  },
  "card-cvc": (v) => /^\d{3,4}$/.test(v),
  // Typed the way Rwandans write it (078 123 4567), without the leading 0, or
  // with +250 in front. All three are the same nine-digit subscriber number.
  "momo-number": (v) => /^(?:250|0)?7\d{8}$/.test(digits(v)),
};

/** Typed as the card prints it, so the reader can check it against the card. */
export const FORMAT: Partial<Record<FieldId, (v: string) => string>> = {
  "card-number": (v) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 "),
  "card-expiry": (v) => {
    const d = digits(v).slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  },
  "card-cvc": (v) => digits(v).slice(0, 4),
};

/** An airline code (two letters or a letter and a digit) and 1 to 4 digits: WB464, KQ 478. */
export const FLIGHT = /^[A-Z0-9]{2}\s?\d{1,4}$/;
