"use server";

import { refresh } from "next/cache";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess } from "@/lib/workspace/nav";
import { exponentOf, formatMoney } from "@/lib/domain/money";

/** Finance writes: admin's, checked here, each audited by the repository. */
async function admin() {
  const role = await currentRole();
  if (!canAccess(role, "finance")) throw new Error("Not allowed");
  return role;
}

async function attempt(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

export async function approveRefund(id: string) {
  const by = await admin();
  return attempt(() => repos().finance.approveRefund(String(id), by));
}

export async function matchLine(lineId: string, paymentId: string) {
  const by = await admin();
  return attempt(() => repos().finance.reconcile(String(lineId), String(paymentId), by));
}

export async function markPayoutPaid(id: string) {
  const by = await admin();
  return attempt(() => repos().finance.markPayoutPaid(String(id), by));
}

/**
 * Gives a renting deposit back, less any deductions, and tells the tenant
 * in the same words admin saw before confirming.
 */
export async function releaseDeposit(bookingId: string, deductionsMajor: number, reason: string) {
  const by = await admin();
  const b = (await repos().bookings.listAll()).find((x) => x.id === bookingId);
  const deposit = b?.lines?.find((l) => l.key === "deposit")?.amount;
  if (!b || !deposit || typeof deductionsMajor !== "number" || !Number.isFinite(deductionsMajor)) return { ok: false as const };
  const kept = { minor: Math.round(deductionsMajor * 10 ** exponentOf(deposit.currency)), currency: deposit.currency };
  const why = typeof reason === "string" ? reason.trim().slice(0, 300) : "";
  const r = await attempt(() => repos().finance.releaseDeposit(b.id, kept, why, by));
  if (r.ok) {
    await repos().notifications.create({
      audience: "guest",
      kind: "paymentReceived",
      params: { amount: formatMoney({ minor: deposit.minor - kept.minor, currency: deposit.currency }, "en-RW"), ref: b.reference },
      href: "/account/renting",
    });
  }
  return r;
}
