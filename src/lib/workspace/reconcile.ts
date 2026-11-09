import type { PaymentRecord, StatementLine } from "@/lib/domain/types";

export type ReconcileRow = { line: StatementLine; state: "matched" | "suggested" | "unmatched"; payment?: PaymentRecord };

const TWO_DAYS = 2 * 86_400_000;

/**
 * Lines of the Mobile Money statement beside the payments they pay for.
 * A line already linked is matched. Otherwise the suggestion is a Mobile
 * Money payment of exactly the same amount, in the same currency, within
 * two days, that no other line has claimed; the closest in time wins.
 * Anything else is unmatched and needs a person.
 */
export function reconcileRows(lines: StatementLine[], payments: PaymentRecord[]): ReconcileRow[] {
  const byId = new Map(payments.map((p) => [p.id, p]));
  const claimed = new Set(lines.flatMap((l) => (l.paymentId ? [l.paymentId] : [])));
  return lines.map((line) => {
    if (line.paymentId) return { line, state: "matched" as const, payment: byId.get(line.paymentId) };
    const t = Date.parse(line.at);
    const candidate = payments
      .filter((p) => p.rail === "mobileMoney" && !claimed.has(p.id) && p.amount.currency === line.amount.currency && p.amount.minor === line.amount.minor && Math.abs(Date.parse(p.at) - t) <= TWO_DAYS)
      .sort((a, b) => Math.abs(Date.parse(a.at) - t) - Math.abs(Date.parse(b.at) - t))[0];
    if (candidate) {
      claimed.add(candidate.id);
      return { line, state: "suggested" as const, payment: candidate };
    }
    return { line, state: "unmatched" as const };
  });
}
