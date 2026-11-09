"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import type { IncidentCategory, Review } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { ROLE_COOKIE, parseRole } from "@/lib/preferences/role";
import { kigaliDay } from "@/lib/domain/instants";
import { quoteBooking } from "@/lib/domain/pricing";
import { isIsoDate } from "@/lib/domain/dates";

/**
 * What a guest does with a booking after it is made. Each checks the role
 * on the server and works on the booking by its reference.
 * (Ownership is the preview's role cookie until accounts exist; see the spec.)
 */
async function guestOnly() {
  const role = parseRole((await cookies()).get(ROLE_COOKIE)?.value);
  if (role !== "guest") throw new Error("Not allowed");
}

/** What moving the dates would cost, before anything changes. */
export async function previewChange(reference: string, start: string, end: string) {
  await guestOnly();
  const b = await repos().bookings.byReference(reference);
  if (!b || !isIsoDate(start) || !isIsoDate(end) || start < kigaliDay() || end <= start) return { ok: false as const, reason: "invalid" as const };
  const free = await repos().availability.isFree(b.supplyItemId, start, end, { party: b.party, exceptBookingId: b.id });
  if (!free) return { ok: false as const, reason: "unavailable" as const };
  const supply = (await repos().stays.byId(b.supplyItemId)) ?? (await repos().mobility.byId(b.supplyItemId));
  if (!supply) return { ok: false as const, reason: "invalid" as const };
  const q = quoteBooking(supply, { kind: b.service, start, end, party: b.party, driveMode: b.driveMode, extras: b.extras, promoCode: b.promoCode }, kigaliDay(), (await repos().admin.settings()).catalog);
  if (!q) return { ok: false as const, reason: "invalid" as const };
  return { ok: true as const, difference: { ...q.total, minor: q.total.minor - b.total.minor }, total: q.total };
}

export async function addGuests(reference: string, party: number) {
  await guestOnly();
  try {
    await repos().bookings.addGuests(reference, party);
    refresh();
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}

export async function submitCheckIn(reference: string, adults: { name: string; idFileName: string }[]) {
  await guestOnly();
  await repos().bookings.submitOnlineCheckIn(reference, adults);
  refresh();
}

export async function reportIssue(input: {
  reference: string;
  category: IncidentCategory;
  urgency: "now" | "today" | "whenever";
  description: string;
  photoName?: string;
}) {
  await guestOnly();
  const b = await repos().bookings.byReference(input.reference);
  if (!b || input.description.trim().length < 3) return { ok: false as const };
  await repos().incidents.create({
    bookingId: b.id,
    category: input.category,
    urgency: input.urgency,
    description: input.description.trim(),
    photoName: input.photoName,
  });
  refresh();
  return { ok: true as const };
}

export async function submitReview(reference: string, ratings: Review["ratings"], text: string) {
  await guestOnly();
  const b = await repos().bookings.byReference(reference);
  if (!b) return { ok: false as const };
  try {
    await repos().reviews.create({ bookingId: b.id, ratings, text });
    refresh();
    return { ok: true as const };
  } catch {
    return { ok: false as const };
  }
}
