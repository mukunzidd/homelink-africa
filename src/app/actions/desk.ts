"use server";

import { refresh } from "next/cache";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess } from "@/lib/workspace/nav";

/** The desk's own writes. Every one checks the section on the server, never trusting the page. */
async function staff() {
  const role = await currentRole();
  if (!canAccess(role, "today")) throw new Error("Not allowed");
  return role;
}

export async function markCheckedIn(reference: string) {
  const role = await staff();
  await repos().bookings.checkIn(reference, role);
  refresh();
}

export async function markCheckedOut(reference: string) {
  const role = await staff();
  await repos().bookings.checkOut(reference, role);
  refresh();
}

export async function addBookingNote(reference: string, text: string) {
  const role = await staff();
  if (text.trim().length < 2) return;
  await repos().bookings.addNote(reference, role, text);
  refresh();
}
