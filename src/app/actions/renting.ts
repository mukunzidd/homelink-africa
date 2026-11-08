"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";

/** A renting tenant's actions, and a viewer's. Guest role only (ownership: see the spec). */
async function guestOnly() {
  if (parseRole((await cookies()).get(ROLE_COOKIE)?.value) !== "guest") throw new Error("Not allowed");
}

export async function payRent(reference: string, rail: "card" | "mobileMoney") {
  await guestOnly();
  await repos().bookings.payRent(reference, rail);
  refresh();
}

export async function requestRepair(input: { reference: string; title: string; description: string; priority: "low" | "normal" | "urgent"; photoName?: string }) {
  await guestOnly();
  const b = await repos().bookings.byReference(input.reference);
  if (!b || b.stayMode !== "lease" || input.title.trim().length < 3) return { ok: false as const };
  await repos().work.createTicket({
    listingId: b.supplyItemId,
    bookingId: b.id,
    title: input.title.trim().slice(0, 120),
    description: input.description.trim().slice(0, 1000),
    priority: input.priority,
    photoName: input.photoName,
    source: "tenant",
  });
  for (const audience of ["ops", "admin"] as const) {
    await repos().notifications.create({ audience, kind: "newIncident", params: { name: b.title, category: input.title.trim() }, href: "/manage/maintenance" });
  }
  refresh();
  return { ok: true as const };
}

export async function cancelViewing(id: string) {
  await guestOnly();
  await repos().viewings.setStatus(id, "cancelled");
  refresh();
}
