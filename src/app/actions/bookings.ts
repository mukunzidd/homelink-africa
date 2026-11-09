"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import type { Booking } from "@/lib/domain/types";
import type { PlaceBookingInput, PlaceResult } from "@/lib/repos/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { kigaliDay } from "@/lib/domain/instants";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess } from "@/lib/workspace/nav";

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
  const b = await repos().bookings.cancel(reference, who, reason.slice(0, 200), kigaliDay()).catch(() => null);
  if (!b) return null;
  // Its own kind, to the desk and to admin: a cancellation is money going
  // back, not a new booking with a word added to its name.
  for (const audience of ["ops", "admin"] as const) {
    await repos().notifications.create({
      audience,
      kind: "bookingCancelled",
      params: { guest: b.guest?.name ?? "", name: b.title, ref: b.reference },
      href: `/manage/bookings/${b.reference}`,
    });
  }
  refresh();
  return b;
}

export async function changeBookingDates(reference: string, start: string, end: string) {
  const who = await role();
  if (who !== "guest" && who !== "ops" && who !== "admin") return { ok: false as const, reason: "invalid" as const };
  const r = await repos().bookings.changeDates(reference, start, end, kigaliDay(), who);
  refresh();
  return r;
}

/* ---------------------------------------------------------- the desk's side */

/**
 * The same booking, worked on by staff. Every action checks the section on
 * the server (an action can be called without its page), and the two that
 * hand money back beyond the policy are admin's alone.
 */
async function staff(adminOnly = false) {
  const who = await currentRole();
  if (!canAccess(who, "bookings") || (adminOnly && who !== "admin")) throw new Error("Not allowed");
  return who;
}

export async function resendConfirmation(reference: string) {
  const who = await staff();
  const b = await repos().bookings.byReference(reference);
  if (!b) return { ok: false as const };
  await repos().notifications.create({
    audience: "guest",
    kind: "bookingConfirmed",
    params: { name: b.title, ref: b.reference },
    href: `/bookings/${b.reference}`,
  });
  await repos().audit.record({ actor: who, action: "booking.resendConfirmation", target: b.reference });
  return { ok: true as const };
}

export async function staffChangeDates(reference: string, start: string, end: string) {
  const who = await staff();
  const r = await repos().bookings.changeDates(reference, start, end, kigaliDay(), who);
  refresh();
  return r.ok ? { ok: true as const, difference: r.difference } : r;
}

export async function staffAddGuests(reference: string, party: number) {
  const who = await staff();
  try {
    await repos().bookings.addGuests(reference, party, who);
    await repos().audit.record({ actor: who, action: "booking.addGuests", target: reference, detail: String(party) });
    refresh();
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function staffCancel(reference: string, reason: string, goodwill: boolean) {
  const who = await staff(goodwill);
  const b = await repos().bookings.cancel(reference, who, reason.trim().slice(0, 200), kigaliDay(), { goodwill }).catch(() => null);
  if (!b) return { ok: false as const };
  refresh();
  return { ok: true as const, refund: b.refund ?? null };
}

/** Part of a payment back. The amount is in the booking's own currency, in minor units. */
export async function staffRefund(reference: string, minor: number, reason: string) {
  const who = await staff(true);
  const b = await repos().bookings.byReference(reference);
  if (!b || reason.trim().length < 3) return { ok: false as const, reason: "invalid" as const };
  const r = await repos().bookings.refund(reference, who, { minor: Math.round(minor), currency: b.total.currency }, reason.trim().slice(0, 200));
  refresh();
  return r;
}
