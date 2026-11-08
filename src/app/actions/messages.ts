"use server";

import { refresh } from "next/cache";
import { repos } from "@/lib/repos";
import { MESSAGE_LIMITS } from "@/lib/repos/types";
import { currentRole } from "@/lib/workspace/guard";

/**
 * Replies in a thread. Who is writing comes from the role cookie on the
 * server, never from the form, and the repo refuses a thread the role is
 * not in, so a guessed conversation id gets nothing.
 */
export async function sendMessage(
  conversationId: string,
  body: string,
  attachments: { id: string; alt: string }[] = [],
): Promise<{ ok: true; id: string } | { ok: false; reason: "empty" | "tooLong" | "refused" }> {
  const role = await currentRole();
  if (role === "visitor") return { ok: false, reason: "refused" };
  if (typeof body !== "string" || !Array.isArray(attachments)) return { ok: false, reason: "refused" };
  if (body.length > MESSAGE_LIMITS.body) return { ok: false, reason: "tooLong" };
  if (!body.trim() && !attachments.length) return { ok: false, reason: "empty" };
  try {
    const clean = attachments.map((a) => ({ id: String(a.id), alt: String(a.alt ?? "") }));
    const m = await repos().messaging.send(conversationId, role, { body, attachments: clean });
    refresh();
    return { ok: true, id: m.id };
  } catch {
    return { ok: false, reason: "refused" };
  }
}

/** Opening a thread reads it. Quietly does nothing for a thread the role is not in. */
export async function markThreadRead(conversationId: string) {
  const role = await currentRole();
  if (role === "visitor") return;
  if ((await repos().messaging.markRead(conversationId, role)) > 0) refresh();
}
