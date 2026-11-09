import { digits } from "./validation";

/**
 * Payments, simulated the way providers' test modes work: particular
 * numbers produce particular outcomes, so every state the pay step can be
 * in (approved, declined, a bank's extra check, a phone prompt that times
 * out) can be shown on purpose. Phase 2 replaces this file with the real
 * card and Mobile Money providers.
 */
export type CardOutcome = "approved" | "declined" | "challenge";
export type MomoOutcome = "approved" | "declined" | "timeout";
export type MomoProvider = "mtn" | "airtel";

/** How long the guest has to approve the prompt on their phone. */
export const MOMO_WAIT_SECONDS = 90;

export const TEST_CARDS = {
  approved: "4242 4242 4242 4242",
  declined: "4000 0000 0000 0002",
  challenge: "4000 0027 6000 3184",
} as const;

export function cardOutcome(cardNumber: string): CardOutcome {
  const n = digits(cardNumber);
  if (n === digits(TEST_CARDS.declined)) return "declined";
  if (n === digits(TEST_CARDS.challenge)) return "challenge";
  return "approved";
}

/** The nine-digit subscriber number, however it was typed. */
function subscriber(msisdn: string): string {
  const d = digits(msisdn);
  if (d.startsWith("250")) return d.slice(3);
  if (d.startsWith("0")) return d.slice(1);
  return d;
}

export function momoOutcome(msisdn: string): MomoOutcome {
  const s = subscriber(msisdn);
  if (s.endsWith("0000")) return "timeout";
  if (s.endsWith("1111")) return "declined";
  return "approved";
}

/** MTN on 078 and 079, Airtel on 072 and 073. */
export function momoProvider(msisdn: string): MomoProvider | null {
  const s = subscriber(msisdn);
  if (s.length !== 9) return null;
  if (/^7[89]/.test(s)) return "mtn";
  if (/^7[23]/.test(s)) return "airtel";
  return null;
}
