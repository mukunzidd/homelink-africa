"use server";

import { refresh } from "next/cache";
import type { IdCheck, Profile } from "@/lib/domain/types";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";

/** The guest's own settings. Signed in as a guest, or nothing. */
async function guest() {
  if ((await currentRole()) !== "guest") throw new Error("Not allowed");
}

async function attempt(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

export async function saveProfile(raw: { name?: unknown; email?: unknown; phone?: unknown; photoName?: unknown; emergency?: { name?: unknown; phone?: unknown } }) {
  await guest();
  const patch: Partial<Profile> = {};
  if (raw.name !== undefined) patch.name = s(raw.name, 80) ?? "";
  if (raw.email !== undefined) patch.email = (s(raw.email, 120) ?? "").trim().toLowerCase();
  if (raw.phone !== undefined) patch.phone = (s(raw.phone, 30) ?? "").trim();
  if (raw.photoName !== undefined) patch.photoName = s(raw.photoName, 120) || undefined;
  if (raw.emergency) patch.emergency = { name: (s(raw.emergency.name, 80) ?? "").trim(), phone: (s(raw.emergency.phone, 30) ?? "").trim() };
  return attempt(() => repos().account.updateProfile(patch));
}

export async function setTwoStep(on: boolean) {
  await guest();
  return attempt(() => repos().account.updateProfile({ twoStep: on === true }));
}

export async function addCard(number: string, expiry: string, name: string) {
  await guest();
  return attempt(() => repos().account.addMethod({ kind: "card", number: String(number), expiry: String(expiry), name: String(name) }));
}
export async function addMomo(number: string) {
  await guest();
  return attempt(() => repos().account.addMethod({ kind: "mobileMoney", number: String(number) }));
}
export async function removeMethod(id: string) {
  await guest();
  return attempt(() => repos().account.removeMethod(String(id)));
}
export async function makeDefault(id: string) {
  await guest();
  return attempt(() => repos().account.setDefault(String(id)));
}
export async function signOutSession(id: string) {
  await guest();
  return attempt(() => repos().account.signOutSession(String(id)));
}
export async function signOutOthers() {
  await guest();
  return attempt(() => repos().account.signOutOthers());
}

export async function submitId(input: { docType: NonNullable<IdCheck["docType"]>; front: string; back?: string; selfie: string }) {
  await guest();
  return attempt(() => repos().account.submitIdCheck({ docType: input.docType, front: String(input.front ?? ""), back: input.back ? String(input.back) : undefined, selfie: String(input.selfie ?? "") }));
}
export async function cycleId() {
  await guest();
  return attempt(() => repos().account.cycleIdCheck());
}

/** Refused, with the booking that is in the way, while one is still to come. */
export async function deleteAccount() {
  await guest();
  const r = await repos().account.deleteAccount();
  if (r.ok) refresh();
  return r;
}
