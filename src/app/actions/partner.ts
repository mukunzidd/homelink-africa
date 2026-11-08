"use server";

import { refresh } from "next/cache";
import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";
import { canAccess, type WorkspaceSection } from "@/lib/workspace/nav";
import { partnerFor } from "@/lib/workspace/partner";

/** A partner acts only on their own work: who they are comes from the session, never the form. */
async function me(section: WorkspaceSection) {
  const role = await currentRole();
  const id = partnerFor(role);
  if (!id || !canAccess(role, section)) throw new Error("Not allowed");
  return id;
}

export async function respondToOffer(offerId: string, accept: boolean, reason?: string) {
  const id = await me("jobs");
  try {
    await repos().partners.respond(String(offerId), id, accept === true, typeof reason === "string" ? reason : "");
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}

export async function replaceDocument(docId: string, fileName: string, expires: string) {
  const id = await me("documents");
  try {
    await repos().partners.replaceDocument(String(docId), id, { fileName: String(fileName), expires: String(expires) });
  } catch {
    return { ok: false as const };
  }
  refresh();
  return { ok: true as const };
}
