import { beforeEach, describe, expect, it } from "vitest";
import { fixtureRepositories as repos } from "@/lib/repos/fixtures";
import { resetStore, store } from "./store";
import { money } from "@/lib/domain/money";
import { reconcileRows } from "@/lib/workspace/reconcile";
import type { PaymentRecord } from "@/lib/domain/types";

const pay = (id: string, minor: number, at: string, rail: PaymentRecord["rail"] = "mobileMoney"): PaymentRecord => ({ id, bookingId: "b", rail, kind: "full", amount: money(minor, "RWF"), status: "succeeded", at });

describe("reconcileRows", () => {
  it("calls a linked line matched, a same-amount line within two days a suggestion, and the rest unmatched", () => {
    const payments = [pay("p1", 100_000, "2026-11-01T10:00:00Z"), pay("p2", 55_000, "2026-11-03T09:00:00Z"), pay("p3", 55_000, "2026-11-03T09:00:00Z", "card")];
    const rows = reconcileRows(
      [
        { id: "l1", at: "2026-11-01T10:05:00Z", amount: money(100_000, "RWF"), phone: "+250788", ref: "MP1", paymentId: "p1" },
        { id: "l2", at: "2026-11-04T08:00:00Z", amount: money(55_000, "RWF"), phone: "+250788", ref: "MP2" },
        { id: "l3", at: "2026-11-04T08:00:00Z", amount: money(12_345, "RWF"), phone: "+250788", ref: "MP3" },
      ],
      payments,
    );
    expect(rows.map((r) => [r.line.id, r.state, r.payment?.id])).toEqual([
      ["l1", "matched", "p1"],
      ["l2", "suggested", "p2"],
      ["l3", "unmatched", undefined],
    ]);
  });
});

describe("finance", () => {
  beforeEach(() => resetStore());

  it("lists refunds awaiting approval, and approving one pays it", async () => {
    const waiting = (await repos.finance.refunds()).filter((r) => r.status === "pending");
    expect(waiting.length).toBeGreaterThan(0);
    await repos.finance.approveRefund(waiting[0].id, "admin");
    expect((await repos.finance.refunds()).find((r) => r.id === waiting[0].id)?.status).toBe("succeeded");
    await expect(repos.finance.approveRefund(waiting[0].id, "admin")).rejects.toThrow();
  });

  it("matches a statement line to a Mobile Money payment of the same amount, once", async () => {
    const { lines } = await repos.finance.statement();
    const loose = lines.find((l) => !l.paymentId)!;
    const target = store().payments.find((p) => p.rail === "mobileMoney" && p.amount.minor === loose.amount.minor && !lines.some((l) => l.paymentId === p.id));
    if (target) {
      await repos.finance.reconcile(loose.id, target.id, "admin");
      expect((await repos.finance.statement()).lines.find((l) => l.id === loose.id)?.paymentId).toBe(target.id);
    }
    const card = store().payments.find((p) => p.rail === "card")!;
    await expect(repos.finance.reconcile(loose.id, card.id, "admin")).rejects.toThrow();
  });

  it("releases a renting deposit less deductions, with a reason, once", async () => {
    const b = store().bookings.find((x) => x.id === "bkg_phase_leaseActive")!;
    const deposit = b.lines!.find((l) => l.key === "deposit")!.amount;
    await expect(repos.finance.releaseDeposit(b.id, money(50_000, deposit.currency), "", "admin")).rejects.toThrow();
    await expect(repos.finance.releaseDeposit(b.id, money(deposit.minor + 1, deposit.currency), "Paint", "admin")).rejects.toThrow();
    await repos.finance.releaseDeposit(b.id, money(50_000, deposit.currency), "Repaint the hallway wall", "admin");
    const back = store().payments.filter((p) => p.bookingId === b.id && p.kind === "refund").at(-1)!;
    expect(back.amount.minor).toBe(deposit.minor - 50_000);
    expect(store().audit.at(-1)).toMatchObject({ action: "deposit.release", target: b.id });
    await expect(repos.finance.releaseDeposit(b.id, money(0, deposit.currency), "", "admin")).rejects.toThrow();
  });

  it("marks a due payout paid, but not one still held", async () => {
    const payouts = await repos.finance.payouts();
    const due = payouts.find((p) => p.status === "due");
    const held = payouts.find((p) => p.status === "held");
    if (due) {
      await repos.finance.markPayoutPaid(due.id, "admin");
      expect((await repos.finance.payouts()).find((p) => p.id === due.id)?.status).toBe("paid");
    }
    if (held) await expect(repos.finance.markPayoutPaid(held.id, "admin")).rejects.toThrow();
  });
});
