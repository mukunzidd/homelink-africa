"use server";

import { refresh } from "next/cache";
import type { Incident } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess, type WorkspaceSection as Section } from "@/lib/workspace/nav";
import { kigaliDay } from "@/lib/domain/instants";

/**
 * The queue pages' writes: asks, inspections and incidents. Each checks its
 * own section on the server; the page hiding a button is not a permission.
 */
async function may(section: Section) {
  const role = await currentRole();
  if (!canAccess(role, section)) throw new Error("Not allowed");
  return role;
}

export async function assignAsk(id: string, owner: string) {
  const by = await may("asks");
  await repos().ops.updateAsk(id, by, { owner });
  refresh();
}

export async function setAskStatus(id: string, status: "arranged" | "declined" | "open") {
  const by = await may("asks");
  await repos().ops.updateAsk(id, by, { status });
  refresh();
}

/** Asks are quoted in francs: the desk pays the driver or the shop in francs. */
export async function quoteAsk(id: string, francs: number, note: string) {
  const by = await may("asks");
  if (!Number.isInteger(francs) || francs <= 0 || francs > 50_000_000) return { ok: false as const };
  await repos().ops.quoteAsk(id, by, { minor: francs, currency: "RWF" }, note);
  refresh();
  return { ok: true as const };
}

export async function scheduleInspection(id: string, date: string, inspector: string) {
  const by = await may("inspections");
  const r = await repos().ops.scheduleInspection(id, by, date, inspector, kigaliDay());
  refresh();
  return r;
}

export async function recordInspection(id: string, checklist: Record<string, boolean>, notes: string) {
  const by = await may("inspections");
  await repos().ops.recordInspection(id, by, checklist, notes);
  refresh();
}

/** Going live is admin's: it puts a home in front of guests. */
export async function publishInspection(id: string) {
  const by = await may("inspections");
  if (by !== "admin") throw new Error("Not allowed");
  const r = await repos().ops.publishInspection(id, by);
  refresh();
  return r;
}

export async function updateIncident(id: string, patch: { status?: Incident["status"]; assignee?: string }) {
  const by = await may("incidents");
  await repos().incidents.update(id, patch);
  await repos().audit.record({ actor: by, action: "incident.update", target: id, detail: JSON.stringify(patch) });
  refresh();
}

export async function incidentToTicket(id: string) {
  const by = await may("incidents");
  const t = await repos().incidents.toTicket(id, by);
  refresh();
  return t ? { ok: true as const, ticketId: t.id } : { ok: false as const };
}
