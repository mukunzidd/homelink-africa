"use server";

import { cookies } from "next/headers";
import type { Viewing } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { kigaliDay } from "@/lib/domain/instants";
import { viewingSlots } from "@/lib/domain/viewing-slots";
import { VALID } from "@/lib/booking/validation";

/**
 * Ask to see a home for sale. Checked on the server: the slot must still
 * be one this home offers (Monday to Saturday, not taken, within the next
 * three weeks), and the contact details must be usable.
 */
export async function requestViewing(
  input: Omit<Viewing, "id" | "status" | "createdAt">,
): Promise<{ ok: true; viewing: Viewing } | { ok: false; reason: "taken" | "invalid" }> {
  const c = input.contact;
  if (!VALID["guest-name"](c.name ?? "") || !VALID["guest-email"](c.email ?? "") || !VALID["guest-phone"](c.phone ?? "")) {
    return { ok: false, reason: "invalid" };
  }
  const home = await repos().sales.byId(input.saleId);
  if (!home || (input.mode !== "inPerson" && input.mode !== "video")) return { ok: false, reason: "invalid" };
  const free = viewingSlots(kigaliDay(), 21, await repos().viewings.taken(input.saleId));
  if (!free.some((d) => d.date === input.date && d.times.includes(input.time))) return { ok: false, reason: "taken" };

  const viewing = await repos().viewings.create({ ...input, notes: input.notes?.slice(0, 500) });
  for (const audience of ["ops", "admin"] as const) {
    await repos().notifications.create({
      audience,
      kind: "newAsk",
      params: { guest: c.name, ask: `${home.name}: ${input.mode === "video" ? "video viewing" : "viewing"} ${input.date} ${input.time}` },
      href: "/manage/sales",
    });
  }
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role === "visitor") (await cookies()).set(ROLE_COOKIE, "guest", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  return { ok: true, viewing };
}
