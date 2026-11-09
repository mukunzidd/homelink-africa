"use server";

import { repos } from "@/lib/repos";
import { currentRole } from "@/lib/workspace/guard";

const TOPICS = ["booking", "change", "payment", "stay", "renting", "other"];

/** The contact form. A guest's message about one of their bookings goes into its thread with the desk. */
export async function sendContact(input: { topic: string; reference?: string; body: string }) {
  if ((await currentRole()) !== "guest") return { ok: false as const, reason: "signIn" as const };
  const topic = TOPICS.includes(input.topic) ? input.topic : "other";
  return repos().messaging.contact({ topic, reference: typeof input.reference === "string" ? input.reference.slice(0, 20) : undefined, body: String(input.body ?? "").slice(0, 2000) });
}
