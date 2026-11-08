"use server";

import { refresh } from "next/cache";
import type { HousekeepingTask, MaintenanceTicket } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess, type WorkspaceSection } from "@/lib/workspace/nav";
import { addDays, isIsoDate } from "@/lib/domain/dates";
import { nightsWithGuests } from "@/lib/workspace/guest-nights";

/**
 * Housekeeping and maintenance writes. Each checks its section on the
 * server and names the fields it may change; nothing from the form is
 * spread onto a record.
 */
const recordAuditEntry = (actor: Awaited<ReturnType<typeof currentRole>>, action: string, target: string, detail: string) =>
  repos().audit.record({ actor, action, target, detail });

async function may(section: WorkspaceSection) {
  const role = await currentRole();
  if (!canAccess(role, section)) throw new Error("Not allowed");
  return role;
}

const PRIORITIES: MaintenanceTicket["priority"][] = ["low", "normal", "urgent"];
const STATUSES: MaintenanceTicket["status"][] = ["open", "scheduled", "inProgress", "done"];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function updateHousekeeping(id: string, patch: { assignee?: string; status?: HousekeepingTask["status"]; note?: string }) {
  const by = await may("housekeeping");
  await repos().work.updateHousekeeping(id, by, {
    ...(patch.assignee !== undefined ? { assignee: text(patch.assignee, 80) } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.note !== undefined ? { note: text(patch.note, 500) } : {}),
  });
  refresh();
}

export async function createTicket(input: { listingId: string; title: string; description: string; priority: MaintenanceTicket["priority"]; photoName?: string }) {
  const by = await may("maintenance");
  const title = text(input.title, 120);
  const listing = await repos().stays.byId(String(input.listingId));
  if (!title || !listing || !PRIORITIES.includes(input.priority)) return { ok: false as const };
  const made = await repos().work.createTicket({
    listingId: listing.id,
    title,
    description: text(input.description, 2000),
    priority: input.priority,
    source: "staff",
    ...(input.photoName ? { photoName: text(input.photoName, 120) } : {}),
  });
  await recordAuditEntry(by, "ticket.create", made.id, title);
  refresh();
  return { ok: true as const, id: made.id };
}

export async function updateTicket(id: string, patch: { status?: MaintenanceTicket["status"]; assignee?: string; scheduledFor?: string; priority?: MaintenanceTicket["priority"] }) {
  const by = await may("maintenance");
  const clean: Partial<MaintenanceTicket> = {};
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) return { ok: false as const };
    clean.status = patch.status;
  }
  if (patch.priority !== undefined) {
    if (!PRIORITIES.includes(patch.priority)) return { ok: false as const };
    clean.priority = patch.priority;
  }
  if (patch.assignee !== undefined) clean.assignee = text(patch.assignee, 80) || undefined;
  if (patch.scheduledFor !== undefined) {
    if (patch.scheduledFor && !isIsoDate(patch.scheduledFor)) return { ok: false as const };
    clean.scheduledFor = patch.scheduledFor || undefined;
    if (patch.scheduledFor && patch.status === undefined) clean.status = "scheduled";
  }
  await repos().work.updateTicket(id, clean);
  await recordAuditEntry(by, "ticket.update", id, JSON.stringify(clean));
  refresh();
  return { ok: true as const };
}

export async function addTicketNote(id: string, note: string) {
  const by = await may("maintenance");
  const body = text(note, 1000);
  if (!body) return { ok: false as const };
  const t = (await repos().work.tickets()).find((x) => x.id === id);
  if (!t) return { ok: false as const };
  await repos().work.updateTicket(id, { notes: [...(t.notes ?? []), { at: new Date().toISOString(), by, text: body }] });
  refresh();
  return { ok: true as const };
}

/**
 * Takes the home off sale while the work is on. Refuses nights already
 * booked: the work moves, the guest does not.
 */
export async function blockForTicket(id: string, from: string, nights: number) {
  const by = await may("maintenance");
  const t = (await repos().work.tickets()).find((x) => x.id === id);
  if (!t || !isIsoDate(from) || !Number.isInteger(nights) || nights < 1 || nights > 30) return { ok: false as const, reason: "invalid" as const };
  const taken = nightsWithGuests(await repos().bookings.listAll(), t.listingId, from, nights);
  if (taken.length) return { ok: false as const, reason: "booked" as const, dates: taken };
  const dates = Array.from({ length: nights }, (_, i) => addDays(from, i));
  // Only the nights this ticket added are its own to give back later; a
  // night already off sale for something else stays that thing's.
  const added = await repos().availability.block(t.listingId, dates, "maintenance");
  await repos().work.updateTicket(id, { blockedDates: [...new Set([...(t.blockedDates ?? []), ...added])].sort() });
  await recordAuditEntry(by, "ticket.block", id, `${from} +${nights}`);
  refresh();
  return { ok: true as const };
}

export async function unblockForTicket(id: string) {
  const by = await may("maintenance");
  const t = (await repos().work.tickets()).find((x) => x.id === id);
  if (!t?.blockedDates?.length) return { ok: false as const };
  await repos().availability.unblock(t.listingId, t.blockedDates);
  await repos().work.updateTicket(id, { blockedDates: [] });
  await recordAuditEntry(by, "ticket.unblock", id, t.blockedDates.join(","));
  refresh();
  return { ok: true as const };
}
