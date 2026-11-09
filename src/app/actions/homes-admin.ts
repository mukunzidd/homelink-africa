"use server";

import { refresh } from "next/cache";
import type { HomeForSale, Viewing } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess, type WorkspaceSection } from "@/lib/workspace/nav";
import { rentSchedule } from "@/lib/workspace/schedules";
import { addDays, isIsoDate, monthsBetween } from "@/lib/domain/dates";
import { kigaliDay } from "@/lib/domain/instants";
import { exponentOf, formatMoney } from "@/lib/domain/money";
import { searchChanged } from "@/lib/search";

/**
 * Tenants, homes for sale and partners. Each write checks its section on
 * the server and builds what it stores from named, checked values.
 */
async function may(section: WorkspaceSection) {
  const role = await currentRole();
  if (!canAccess(role, section)) throw new Error("Not allowed");
  return role;
}

async function lease(reference: string) {
  const b = (await repos().bookings.listAll()).find((x) => x.reference === reference && x.stayMode === "lease");
  if (!b) throw new Error("No such renting");
  return b;
}

/** Tells the tenant the next rent due (or overdue), in their thread of notifications. */
export async function sendRentReminder(reference: string) {
  const by = await may("tenants");
  const b = await lease(reference);
  const rent = b.lines?.find((l) => l.key === "rent")?.amount;
  if (!rent) return { ok: false as const };
  const due = rentSchedule(b.startDate, monthsBetween(b.startDate, b.endDate), rent, await repos().bookings.payments(b.id), kigaliDay()).find((i) => i.status !== "paid");
  if (!due) return { ok: false as const };
  await repos().notifications.create({ audience: "guest", kind: "rentDue", params: { amount: formatMoney(rent, "en-RW"), date: due.due }, href: "/account/renting" });
  await repos().audit.record({ actor: by, action: "rent.remind", target: b.id, detail: due.due });
  refresh();
  return { ok: true as const };
}

export async function recordRent(reference: string, major: number) {
  const by = await may("tenants");
  const b = await lease(reference);
  const rent = b.lines?.find((l) => l.key === "rent")?.amount;
  if (!rent || typeof major !== "number" || !Number.isFinite(major)) return { ok: false as const };
  try {
    await repos().bookings.recordRentPayment(reference, by, { minor: Math.round(major * 10 ** exponentOf(rent.currency)), currency: rent.currency });
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

export async function startMoveOut(reference: string, date: string) {
  const by = await may("tenants");
  try {
    await repos().bookings.startMoveOut(reference, by, date);
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

export async function returnDeposit(reference: string) {
  const by = await may("tenants");
  try {
    await repos().bookings.returnDeposit(reference, by);
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

export async function updateSale(id: string, patch: { priceMajor?: number; status?: HomeForSale["saleStatus"] }) {
  const by = await may("sales");
  const h = (await repos().sales.all()).find((x) => x.id === id);
  if (!h) return { ok: false as const };
  try {
    await repos().sales.update(id, {
      ...(typeof patch.priceMajor === "number" && Number.isFinite(patch.priceMajor) ? { price: { minor: Math.round(patch.priceMajor * 10 ** exponentOf(h.price.currency)), currency: h.price.currency } } : {}),
      ...(patch.status ? { saleStatus: patch.status } : {}),
    });
  } catch {
    return { ok: false as const };
  }
  await repos().audit.record({ actor: by, action: "sale.update", target: id, detail: JSON.stringify(patch) });
  await searchChanged();
  refresh();
  return { ok: true as const };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Moves a viewing on, and tells the person who asked for it. */
export async function setViewing(id: string, status: Extract<Viewing["status"], "confirmed" | "rescheduled" | "done" | "cancelled">, move?: { date: string; time: string }) {
  const by = await may("sales");
  if (!["confirmed", "rescheduled", "done", "cancelled"].includes(status)) return { ok: false as const };
  const v = (await repos().viewings.all()).find((x) => x.id === id);
  if (!v) return { ok: false as const };
  let clean: { date: string; time: string } | undefined;
  if (status === "rescheduled") {
    if (!move || !isIsoDate(move.date) || move.date < kigaliDay() || move.date > addDays(kigaliDay(), 90) || !TIME.test(move.time)) return { ok: false as const };
    const taken = await repos().viewings.taken(v.saleId);
    if (taken.some((x) => x.date === move.date && x.time === move.time)) return { ok: false as const };
    clean = { date: move.date, time: move.time };
  }
  await repos().viewings.setStatus(id, status, clean);
  const home = (await repos().sales.all()).find((h) => h.id === v.saleId);
  const when = `${clean?.date ?? v.date} ${clean?.time ?? v.time}`;
  await repos().notifications.create(
    status === "confirmed"
      ? { audience: "guest", kind: "viewingConfirmed", params: { name: home?.name ?? "", date: when }, href: `/buy/${home?.slug ?? ""}` }
      : { audience: "guest", kind: "viewingChanged", params: { state: status === "rescheduled" ? "moved" : status, name: home?.name ?? "", when }, href: `/buy/${home?.slug ?? ""}` },
  );
  await repos().audit.record({ actor: by, action: "viewing.update", target: id, detail: status });
  refresh();
  return { ok: true as const };
}

export async function assignJob(bookingId: string, partnerId: string | null) {
  const by = await may("partners");
  try {
    await repos().partners.assign(bookingId, partnerId, by);
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}
