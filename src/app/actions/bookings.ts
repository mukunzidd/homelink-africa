"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import type { Booking } from "@/lib/domain/types";
import type { PlaceBookingInput, PlaceResult } from "@/lib/repos/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { kigaliDay } from "@/lib/domain/instants";

/**
 * Booking writes. The repo does the real checking (price, steps, dates);
 * these add who is asking.
 */

async function role() {
  return parseRole((await cookies()).get(ROLE_COOKIE)?.value);
}

export async function placeBooking(input: PlaceBookingInput): Promise<PlaceResult> {
  const who = await role();
  if (who !== "guest" && who !== "visitor") return { ok: false, reason: "invalid" };
  const result = await repos().bookings.place(input);
  if (result.ok && who === "visitor") {
    // "Continue as a guest" at checkout: until accounts exist, placing a
    // booking signs the preview in as the guest, so the confirmation and
    // Trips (both guest-only) show what was just booked.
    (await cookies()).set(ROLE_COOKIE, "guest", { path: "/", maxAge: 31_536_000, sameSite: "lax" });
  }
  return result;
}

/** Only the guest who holds it, or the desk, can cancel a booking. */
export async function cancelBooking(reference: string, reason: string): Promise<Booking | null> {
  const who = await role();
  if (who !== "guest" && who !== "ops" && who !== "admin") return null;
  const b = await repos().bookings.cancel(reference, who, reason.slice(0, 200), kigaliDay());
  await repos().notifications.create({
    audience: "ops",
    kind: "newBooking",
    params: { guest: b.guest?.name ?? "", name: `${b.title} (cancelled)`, ref: b.reference },
    href: `/manage/bookings/${b.reference}`,
  });
  refresh();
  return b;
}

export async function changeBookingDates(reference: string, start: string, end: string) {
  const who = await role();
  if (who !== "guest" && who !== "ops" && who !== "admin") return { ok: false as const, reason: "invalid" as const };
  const r = await repos().bookings.changeDates(reference, start, end, kigaliDay());
  refresh();
  return r;
}
